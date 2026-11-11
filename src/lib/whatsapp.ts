import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OutgoingMessage } from "./types";

// Cliente mínimo de la WhatsApp Cloud API (Meta). Sin SDK: son tres llamadas HTTP.
const GRAPH = "https://graph.facebook.com/v23.0";

export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const auth = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` });

/** Números (formato wa_id, ej. 5491123456789) que pueden modificar la tienda de Norma. */
export function isOwner(waId: string) {
  const allowed = (process.env.NORMA_WHATSAPP ?? "").split(",").map((n) => n.replace(/\D/g, "")).filter(Boolean);
  return allowed.includes(waId.replace(/\D/g, ""));
}

export function verifySignature(rawBody: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  // Sin secreto solo se acepta si WhatsApp no está conectado (desarrollo); en ese caso nadie es dueño.
  if (!secret) return !whatsappConfigured();
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export async function downloadMedia(mediaId: string): Promise<Buffer> {
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth() });
  if (!meta.ok) throw new Error(`media meta ${meta.status}`);
  const { url } = (await meta.json()) as { url: string };
  const file = await fetch(url, { headers: auth() });
  if (!file.ok) throw new Error(`media download ${file.status}`);
  return Buffer.from(await file.arrayBuffer());
}

const absolute = (url: string, base: string) => (url.startsWith("http") ? url : new URL(url, base).toString());
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Traduce una respuesta del bot al formato de la Cloud API. */
export function toWhatsApp(to: string, m: OutgoingMessage, base: string) {
  const buttons = m.buttons?.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: clip(b.title, 20) } }));
  if (m.kind === "text") {
    if (!buttons?.length) return { messaging_product: "whatsapp", to, type: "text", text: { body: m.text, preview_url: true } };
    return { messaging_product: "whatsapp", to, type: "interactive", interactive: { type: "button", body: { text: clip(m.text, 1024) }, action: { buttons } } };
  }
  const link = absolute(m.photo.url, base);
  if (!buttons?.length) return { messaging_product: "whatsapp", to, type: "image", image: { link, caption: clip(m.caption, 1024) } };
  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: { type: "button", header: { type: "image", image: { link } }, body: { text: clip(m.caption, 1024) }, action: { buttons } },
  };
}

export async function sendMessages(to: string, messages: OutgoingMessage[], base: string) {
  for (const m of messages) {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify(toWhatsApp(to, m, base)),
    });
    if (!res.ok) console.error("whatsapp send", res.status, await res.text());
  }
}

/** Marca el mensaje como leído (los dos tildes azules) y muestra "escribiendo…". */
export async function markRead(messageId: string) {
  await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } }),
  }).catch(() => {});
}

export type WebhookMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
  button?: { text: string; payload: string };
};

export function extractMessages(payload: unknown): WebhookMessage[] {
  const out: WebhookMessage[] = [];
  const entries = (payload as { entry?: { changes?: { value?: { messages?: WebhookMessage[] } }[] }[] })?.entry ?? [];
  for (const e of entries) for (const c of e.changes ?? []) for (const m of c.value?.messages ?? []) out.push(m);
  return out;
}
