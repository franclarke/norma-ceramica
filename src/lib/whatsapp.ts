import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OutgoingMessage } from "./types";

// Cliente mínimo de la WhatsApp Cloud API (Meta). Sin SDK: son tres llamadas HTTP.
const GRAPH = "https://graph.facebook.com/v23.0";

// El ID del número que recibe el mensaje viene en cada webhook (metadata.phone_number_id);
// WHATSAPP_PHONE_NUMBER_ID es opcional y solo hace falta para mandar sin haber recibido nada.
export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN);
const senderId = (fromWebhook?: string) => fromWebhook ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

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

/**
 * WhatsApp solo muestra fotos JPEG o PNG, y las de la página son WebP (pesan la mitad):
 * las que van al chat salen convertidas por /api/jpg. La tablilla ya es PNG.
 */
export const photoLink = (url: string, base: string) =>
  url.startsWith("/api/tablilla/") ? absolute(url, base) : new URL(`/api/jpg/${Buffer.from(url).toString("base64url")}.jpg`, base).toString();

/**
 * Los celulares argentinos llegan en el webhook como 549 + área + número, pero la Cloud API
 * los reconoce (y los autoriza en la lista de prueba) sin el 9: 54 + área + número.
 */
export const toRecipient = (waId: string) => (/^549\d{10}$/.test(waId) ? `54${waId.slice(3)}` : waId);

/** Traduce una respuesta del bot al formato de la Cloud API. */
export function toWhatsApp(rawTo: string, m: OutgoingMessage, base: string) {
  const to = toRecipient(rawTo);
  const buttons = m.buttons?.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: clip(b.title, 20) } }));
  if (m.kind === "text") {
    if (!buttons?.length) return { messaging_product: "whatsapp", to, type: "text", text: { body: m.text, preview_url: true } };
    return { messaging_product: "whatsapp", to, type: "interactive", interactive: { type: "button", body: { text: clip(m.text, 1024) }, action: { buttons } } };
  }
  const link = photoLink(m.photo.url, base);
  if (!buttons?.length) return { messaging_product: "whatsapp", to, type: "image", image: { link, caption: clip(m.caption, 1024) } };
  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: { type: "button", header: { type: "image", image: { link } }, body: { text: clip(m.caption, 1024) }, action: { buttons } },
  };
}

export async function sendMessages(to: string, messages: OutgoingMessage[], base: string, phoneNumberId?: string) {
  for (const m of messages) {
    const res = await fetch(`${GRAPH}/${senderId(phoneNumberId)}/messages`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify(toWhatsApp(to, m, base)),
    });
    if (!res.ok) console.error("whatsapp send", res.status, await res.text());
    else console.log("whatsapp out:", m.kind, m.buttons?.length ? `${m.buttons.length} botones` : "");
  }
}

/** Marca el mensaje como leído (los dos tildes azules) y muestra "escribiendo…". */
export async function markRead(messageId: string, phoneNumberId?: string) {
  await fetch(`${GRAPH}/${senderId(phoneNumberId)}/messages`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } }),
  }).catch(() => {});
}

export type WebhookMessage = {
  /** El número del negocio que recibió el mensaje (viene en metadata del webhook). */
  to?: string;
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
  button?: { text: string; payload: string };
};

/** Mensajes nuestros que WhatsApp no pudo entregar (por ejemplo, una foto que no le gustó). */
export function extractFailures(payload: unknown): string[] {
  type Status = { status?: string; errors?: { code?: number; title?: string; error_data?: { details?: string } }[] };
  const out: string[] = [];
  const entries = (payload as { entry?: { changes?: { value?: { statuses?: Status[] } }[] }[] })?.entry ?? [];
  for (const e of entries)
    for (const c of e.changes ?? [])
      for (const st of c.value?.statuses ?? [])
        if (st.status === "failed") for (const err of st.errors ?? []) out.push(`${err.code ?? "?"} ${err.title ?? ""} ${err.error_data?.details ?? ""}`.trim());
  return out;
}

export function extractMessages(payload: unknown): WebhookMessage[] {
  type Value = { metadata?: { phone_number_id?: string }; messages?: WebhookMessage[] };
  const out: WebhookMessage[] = [];
  const entries = (payload as { entry?: { changes?: { value?: Value }[] }[] })?.entry ?? [];
  for (const e of entries)
    for (const c of e.changes ?? []) for (const m of c.value?.messages ?? []) out.push({ ...m, to: c.value?.metadata?.phone_number_id });
  return out;
}
