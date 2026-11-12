import "server-only";
import { respond } from "./engine";
import { detectIntent } from "./parse";
import { interpret, suggestTitle, takeAiQuota, toCommand, transcribeVoice } from "./ai";
import { loadStore, saveStore } from "../store";
import type { ChatEntry, IncomingMessage, OutgoingMessage, Store } from "../types";

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Lo que llega de un canal antes de pasar por el bot: puede ser un audio. */
export type ChannelMessage = IncomingMessage | { kind: "audio"; audio: Uint8Array };

const CONFIRM_STEPS = new Set(["add:confirm", "sold:confirm", "edit:confirm", "restore:confirm", "add:dark-photo"]);

/** Un turno de conversación: carga la tienda, entiende el mensaje, responde y guarda. Igual para WhatsApp y el simulador. */
export async function runTurn(storeId: string, raw: ChannelMessage, opts: { messageId?: string } = {}) {
  const store = await loadStore(storeId);
  if (opts.messageId && store.processed?.includes(opts.messageId)) return { store, replies: [] as OutgoingMessage[], duplicate: true, changed: false };

  const incoming = await understand(store, raw);
  const now = new Date().toISOString();
  const pageUrl = store.demo ? `${siteUrl()}/tienda/${store.id}` : siteUrl();

  let replies: OutgoingMessage[];
  let next: Store;
  if (!incoming) {
    next = structuredClone(store);
    replies = [{ kind: "text", text: "No te pude escuchar bien. ¿Me lo escribís, o me mandás el audio de nuevo?" }];
  } else {
    // Lo que dijo Norma queda tal cual en el chat; al bot le llega la versión que entiende.
    const result = respond(store, await withAi(store, incoming), { now, siteUrl: pageUrl });
    next = result.store;
    replies = result.replies;
    // Así quedó: la tablilla tal cual la ve un comprador, para que Norma no tenga que abrir la página.
    const piece = result.touched !== undefined ? next.pieces.find((p) => p.number === result.touched) : undefined;
    if (piece) {
      replies.push({
        kind: "image",
        photo: { url: `/api/tablilla/${next.id}/${piece.number}?v=${Date.parse(piece.updatedAt)}`, width: 1200, height: 630 },
        caption: next.demo ? "Así quedó en tu página." : `Así quedó en tu página: ${siteUrl()}/${piece.number}`,
      });
    }
  }

  if (opts.messageId) next.processed = [...(store.processed ?? []), opts.messageId].slice(-50);
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
    const isNewPiece = step === "idle" || step.startsWith("add:");
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

/**
 * Si el bot determinístico no entiende lo que dijo Norma con sus palabras, la IA lo traduce a un
 * comando que sí entiende ("la jarrita blanca ya no la tengo" → "vendí la 14"). Nada se aplica sin
 * pasar por la confirmación de siempre.
 */
export async function withAi(store: Store, msg: IncomingMessage): Promise<IncomingMessage> {
  if (msg.kind !== "text") return msg;
  const step = store.conversation.step;
  const intent = detectIntent(msg.text).type;
  const vague = intent === "unknown" || (["sold", "restore", "price", "rename", "edit"].includes(intent) && !/\d/.test(msg.text));
  const needsAi = (step === "idle" && vague) || (CONFIRM_STEPS.has(step) && !["yes", "no", "cancel", "undo"].includes(intent));
  if (!needsAi || !(await takeAiQuota(store.id))) return msg;
  const ai = await interpret(msg.text, store.pieces, store.sold);
  const command = ai ? toCommand(ai) : null;
  return command ? { kind: "text", text: command } : msg;
}

function appendChat(store: Store, incoming: IncomingMessage, replies: OutgoingMessage[], now: string): ChatEntry[] {
  const id = () => Math.random().toString(36).slice(2, 10);
  const entries: ChatEntry[] = [
    { id: id(), from: "norma", at: now, message: incoming },
    ...replies.map((m) => ({ id: id(), from: "bot" as const, at: now, message: m })),
  ];
  return [...(store.chat ?? []), ...entries].slice(-80);
}
