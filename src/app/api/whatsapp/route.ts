import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { runTurn, siteUrl, type ChannelMessage } from "@/lib/bot/run";
import { processPhoto } from "@/lib/images";
import { createHash } from "node:crypto";
import { loadStore, NORMA, storeExists, storeTag } from "@/lib/store";
import type { OutgoingMessage } from "@/lib/types";
import { downloadMedia, extractFailures, extractMessages, isOwner, markRead, sendMessages, verifySignature, type WebhookMessage } from "@/lib/whatsapp";

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

  for (const failure of extractFailures(payload)) console.error("whatsapp no entregó:", failure);
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
  const owner = isOwner(m.from);
  // Sin datos personales: tipo de mensaje, si es de Norma y los últimos 4 dígitos.
  console.log(`whatsapp in: ${m.type} · dueño=${owner} · …${m.from.slice(-4)} · largo=${m.from.length}`);

  if (!owner && process.env.WHATSAPP_DEMO === "off") {
    const store = await loadStore(NORMA);
    await sendMessages(
      m.from,
      [
        {
          kind: "text",
          text: `Hola. Este número es el ayudante con el que Norma arma su página, así que acá no te va a leer nadie.\n\nSi te gustó alguna pieza, escribile a ella al ${store.contactPhone} y contale cuál. ¡Gracias!`,
        },
      ],
      base,
      m.to,
    );
    return;
  }

  // Modo demo: quien no es Norma (por ejemplo, alguien que evalúa el proyecto) recibe su propia
  // tienda de prueba, como en el simulador. La página real de Norma no se toca.
  const storeId = owner ? NORMA : demoStoreId(m.from);
  const welcome = owner || (await storeExists(storeId)) ? [] : [demoWelcome(storeId, base)];

  await markRead(m.id, m.to);
  const incoming = await toIncoming(m, storeId);
  if (!incoming) {
    await sendMessages(m.from, [...welcome, { kind: "text", text: "Eso no lo sé abrir todavía. Escribime, mandame un audio o una foto, porfa." }], base, m.to);
    return;
  }
  const { replies, duplicate, changed } = await runTurn(storeId, incoming, { messageId: m.id });
  if (duplicate) return;
  if (changed && owner) revalidateTag(storeTag(NORMA), { expire: 0 });
  await sendMessages(m.from, [...welcome, ...replies], base, m.to);
}

/** El número nunca se guarda: la tienda de prueba se identifica con un hash. */
const demoStoreId = (waId: string) => `demo-${createHash("sha256").update(waId).digest("hex").slice(0, 12)}`;

const demoWelcome = (storeId: string, base: string): OutgoingMessage => ({
  kind: "text",
  text: [
    "¡Hola! Soy el ayudante con el que Norma arma su página por WhatsApp.",
    "",
    "Para que lo pruebes, te armé una tienda de prueba solo para vos (la de Norma no se toca):",
    `${base}/tienda/${storeId}`,
    "",
    "Hacé de cuenta que sos Norma: mandame una foto de algo, escribime «vendí la 14» o decime en un audio «la tetera ahora sale veinte mil».",
  ].join("\n"),
});

async function toIncoming(m: WebhookMessage, storeId: string): Promise<ChannelMessage | null> {
  if (m.type === "text" && m.text) return { kind: "text", text: m.text.body };
  if (m.type === "interactive" && m.interactive?.button_reply) {
    return { kind: "button", id: m.interactive.button_reply.id, title: m.interactive.button_reply.title };
  }
  if (m.type === "button" && m.button) return { kind: "text", text: m.button.text };
  if (m.type === "image" && m.image) {
    const { photo, dark } = await processPhoto(storeId, await downloadMedia(m.image.id));
    return { kind: "image", photo, caption: m.image.caption, dark };
  }
  if ((m.type === "audio" || m.type === "voice") && m.audio) return { kind: "audio", audio: new Uint8Array(await downloadMedia(m.audio.id)) };
  return null;
}
