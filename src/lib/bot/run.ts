import "server-only";
import { respond } from "./engine";
import { loadStore, saveStore } from "../store";
import type { ChatEntry, IncomingMessage, OutgoingMessage, Store } from "../types";

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Un turno de conversación: carga la tienda, responde, guarda. Igual para WhatsApp y el simulador. */
export async function runTurn(storeId: string, incoming: IncomingMessage, opts: { messageId?: string } = {}) {
  const store = await loadStore(storeId);
  if (opts.messageId && store.processed?.includes(opts.messageId)) return { store, replies: [] as OutgoingMessage[], duplicate: true };

  const now = new Date().toISOString();
  const pageUrl = store.demo ? `${siteUrl()}/tienda/${store.id}` : siteUrl();
  const { store: next, replies } = respond(store, incoming, { now, siteUrl: pageUrl });

  if (opts.messageId) next.processed = [...(store.processed ?? []), opts.messageId].slice(-50);
  if (next.demo) next.chat = appendChat(next, incoming, replies, now);
  await saveStore(next);
  const changed = next.updatedAt !== store.updatedAt || JSON.stringify(next.pieces) !== JSON.stringify(store.pieces);
  return { store: next, replies, duplicate: false, changed };
}

function appendChat(store: Store, incoming: IncomingMessage, replies: OutgoingMessage[], now: string): ChatEntry[] {
  const id = () => Math.random().toString(36).slice(2, 10);
  const entries: ChatEntry[] = [
    { id: id(), from: "norma", at: now, message: incoming },
    ...replies.map((m) => ({ id: id(), from: "bot" as const, at: now, message: m })),
  ];
  return [...(store.chat ?? []), ...entries].slice(-80);
}
