import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { runTurn, siteUrl, type ChannelMessage } from "@/lib/bot/run";
import { processPhoto } from "@/lib/images";
import { loadStore, NORMA, storeTag } from "@/lib/store";
import { downloadMedia, extractMessages, isOwner, markRead, sendMessages, verifySignature, type WebhookMessage } from "@/lib/whatsapp";

// Verificación del webhook que hace Meta al configurarlo.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Mensajes entrantes. Respondemos 200 enseguida y procesamos después.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("Bad signature", { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const messages = extractMessages(payload);
  after(async () => {
    for (const m of messages) {
      try {
        await handle(m);
      } catch (e) {
        console.error("whatsapp handle", e);
      }
    }
  });
  return new Response("OK", { status: 200 });
}

async function handle(m: WebhookMessage) {
  const base = siteUrl();
  if (!isOwner(m.from)) {
    const store = await loadStore(NORMA);
    await sendMessages(
      m.from,
      [{ kind: "text", text: `Hola. Este número es el ayudante con el que Norma arma su página, así que acá no te va a leer nadie.\n\nSi te gustó alguna pieza, escribile a ella al ${store.contactPhone} y contale cuál. ¡Gracias!` }],
      base,
    );
    return;
  }

  await markRead(m.id);
  const incoming = await toIncoming(m);
  if (!incoming) {
    await sendMessages(m.from, [{ kind: "text", text: "Eso no lo sé abrir todavía. Escribime, mandame un audio o una foto, porfa." }], base);
    return;
  }
  const { replies, duplicate, changed } = await runTurn(NORMA, incoming, { messageId: m.id });
  if (duplicate) return;
  if (changed) revalidateTag(storeTag(NORMA), { expire: 0 });
  await sendMessages(m.from, replies, base);
}

async function toIncoming(m: WebhookMessage): Promise<ChannelMessage | null> {
  if (m.type === "text" && m.text) return { kind: "text", text: m.text.body };
  if (m.type === "interactive" && m.interactive?.button_reply) {
    return { kind: "button", id: m.interactive.button_reply.id, title: m.interactive.button_reply.title };
  }
  if (m.type === "button" && m.button) return { kind: "text", text: m.button.text };
  if (m.type === "image" && m.image) {
    const { photo, dark } = await processPhoto(NORMA, await downloadMedia(m.image.id));
    return { kind: "image", photo, caption: m.image.caption, dark };
  }
  if ((m.type === "audio" || m.type === "voice") && m.audio) return { kind: "audio", audio: new Uint8Array(await downloadMedia(m.audio.id)) };
  return null;
}
