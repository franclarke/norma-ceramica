import "server-only";
import { randomUUID } from "node:crypto";
import { respond } from "./engine";
import { aiAvailable, interpret, suggestTitle, takeAiQuota, toCommand, transcribeVoice } from "./ai";
import { loadStore, saveStore } from "../store";
import { sharedRedis } from "../storage";
import type { ChatEntry, ConversationStep, IncomingMessage, OutgoingMessage, Store } from "../types";

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Lo que llega de un canal antes de pasar por el bot: puede ser un audio. */
export type ChannelMessage = IncomingMessage | { kind: "audio"; audio: Uint8Array };

type TurnResult = { store: Store; replies: OutgoingMessage[]; duplicate: boolean; changed: boolean };

/**
 * Un turno de conversación: carga la tienda, entiende el mensaje, responde y guarda.
 * Igual para WhatsApp y el simulador. Los turnos de una misma tienda van de a uno: si Norma
 * manda tres fotos juntas, ninguna pisa a la otra.
 */
export function runTurn(storeId: string, raw: ChannelMessage, opts: { messageId?: string } = {}): Promise<TurnResult> {
  return oneAtATime(storeId, () => turn(storeId, raw, opts));
}

async function turn(storeId: string, raw: ChannelMessage, opts: { messageId?: string }): Promise<TurnResult> {
  const store = await loadStore(storeId);
  if (opts.messageId && store.processed?.includes(opts.messageId)) return { store, replies: [], duplicate: true, changed: false };

  const incoming = await understand(store, raw);
  const now = new Date().toISOString();
  const ctx = { now, siteUrl: store.demo ? `${siteUrl()}/tienda/${store.id}` : siteUrl() };

  let replies: OutgoingMessage[];
  let next: Store;
  if (!incoming) {
    next = structuredClone(store);
    const sorry = (await aiAvailable()) ? "No te pude escuchar bien. ¿Me lo mandás de nuevo, o me lo escribís?" : "Hoy no estoy pudiendo escuchar audios. ¿Me lo escribís, porfa?";
    replies = [{ kind: "text", text: sorry }];
  } else {
    let result = respond(store, incoming, ctx);
    // El bot entiende solo casi todo. Cuando no, la IA traduce lo que dijo Norma a una frase que
    // el bot sí entiende ("la del pajarito ya no la tengo" → "vendí la 24") y se prueba de nuevo.
    // Nada cambia en la página sin la confirmación de siempre.
    if (result.missed && incoming.kind === "text" && (await takeAiQuota(store.id))) {
      const ai = await interpret(incoming.text, store.pieces, store.sold, undefined, asking(store.conversation));
      const command = ai ? toCommand(ai) : null;
      const again = command ? respond(store, { kind: "text", text: command }, ctx) : null;
      // Si el bot ya sabía qué quería y solo faltaba cuál, la IA sirve si encontró la pieza.
      if (again && !again.missed && (result.missed === "all" || ai?.number != null)) result = again;
    }
    next = result.store;
    replies = result.replies;
  }

  if (opts.messageId) next.processed = [...(store.processed ?? []), opts.messageId].slice(-50);
  // Lo que dijo Norma queda tal cual en el chat del simulador.
  if (next.demo && incoming) next.chat = appendChat(next, incoming, replies, now);
  await saveStore(next);
  const changed = next.updatedAt !== store.updatedAt || JSON.stringify(next.pieces) !== JSON.stringify(store.pieces);
  return { store: next, replies, duplicate: false, changed };
}

/** Audio → texto, y foto sin nombre → nombre sugerido. */
async function understand(store: Store, raw: ChannelMessage): Promise<IncomingMessage | null> {
  if (raw.kind === "audio") {
    const text = (await takeAiQuota(store.id)) ? await transcribeVoice(raw.audio) : null;
    return text ? { kind: "text", text, voice: true } : null;
  }
  if (raw.kind === "image" && !raw.suggestedTitle) {
    const step = store.conversation.step;
    const isNewPiece = step === "idle" || step === "piece" || step.startsWith("add:");
    const caption = raw.caption?.trim() ?? "";
    const captionHasTitle = caption && !/^\s*(la|pieza|n[º°o]?\.?)?\s*\d[\d.,\s]*(mil|lucas?)?\s*$/i.test(caption);
    if (isNewPiece && !captionHasTitle && (await takeAiQuota(store.id))) {
      const url = raw.photo.url.startsWith("http") ? raw.photo.url : `${siteUrl()}${raw.photo.url}`;
      const suggested = await suggestTitle(new URL(url));
      if (suggested) return { ...raw, suggestedTitle: suggested };
    }
  }
  return raw;
}

/** La pregunta que el bot le había hecho, para que la IA entienda a qué contesta Norma. */
function asking(c: ConversationStep): string | undefined {
  switch (c.step) {
    case "add:confirm":
      return "¿Publico la pieza nueva así como está?";
    case "add:dark-photo":
      return "La foto salió oscura. ¿Querés mandar otra? (yes: manda otra; no: usa esta)";
    case "sold:confirm":
      return `¿Saco de la página la pieza ${c.numbers.join(" y la ")}?`;
    case "restore:confirm":
      return `¿Vuelvo a poner en la página la pieza ${c.number}?`;
    case "edit:confirm":
      return `¿Guardo el cambio en la pieza ${c.number}?`;
    case "edit:what":
      return `¿Qué le cambio a la pieza ${c.number}?`;
    case "sold:number":
      return "¿Cuál es la pieza que vendiste?";
    case "edit:number":
      return "¿Cuál es la pieza que querés cambiar?";
    case "restore:number":
      return "¿Cuál es la pieza que volviste a tener?";
    default:
      return undefined;
  }
}

function appendChat(store: Store, incoming: IncomingMessage, replies: OutgoingMessage[], now: string): ChatEntry[] {
  const id = () => Math.random().toString(36).slice(2, 10);
  const entries: ChatEntry[] = [
    { id: id(), from: "norma", at: now, message: incoming },
    ...replies.map((m) => ({ id: id(), from: "bot" as const, at: now, message: m })),
  ];
  return [...(store.chat ?? []), ...entries].slice(-80);
}

// ---------- De a un turno por tienda ----------

const chains = new Map<string, Promise<unknown>>();

async function oneAtATime<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
  // En la misma instancia: una cola por tienda. Entre instancias: un candado en Redis.
  const run = (chains.get(storeId) ?? Promise.resolve()).catch(() => {}).then(() => withLock(storeId, fn));
  chains.set(storeId, run);
  try {
    return await run;
  } finally {
    if (chains.get(storeId) === run) chains.delete(storeId);
  }
}

const RELEASE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

async function withLock<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
  const redis = sharedRedis();
  if (!redis) return fn();
  const key = `lock:${storeId}`;
  const token = randomUUID();
  let held = false;
  try {
    // Espera hasta 20 segundos su turno; si el candado no se libera, sigue igual antes que dejar a Norma sin respuesta.
    for (let i = 0; i < 100 && !held; i++) {
      held = (await redis.set(key, token, { nx: true, px: 30_000 })) === "OK";
      if (!held) await new Promise((r) => setTimeout(r, 200));
    }
  } catch (e) {
    console.error("lock", e);
  }
  try {
    return await fn();
  } finally {
    if (held) await redis.eval(RELEASE, [key], [token]).catch(() => {});
  }
}
