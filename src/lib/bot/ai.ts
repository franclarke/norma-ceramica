import "server-only";
import { gateway, generateText, Output, transcribe, type LanguageModel } from "ai";
import { z } from "zod";
import { sharedRedis } from "../storage";
import type { Piece } from "../types";

/*
 * La IA es una ayuda para Norma, nunca la que decide:
 * - convierte sus audios en texto,
 * - traduce lo que dice con sus palabras a uno de los comandos que el bot ya entiende,
 * - propone un nombre cuando manda una foto sola.
 * Todo lo que propone pasa igual por la confirmación con foto. Si falla o tarda, el bot sigue sin ella.
 */

const MODELS = {
  // Habilitado en el crédito gratuito del AI Gateway: rápido, con visión y salida estructurada.
  text: process.env.AI_TEXT_MODEL ?? "google/gemini-2.5-flash",
  transcription: process.env.AI_TRANSCRIPTION_MODEL ?? "openai/gpt-transcribe",
};
const TIMEOUT_MS = 9000;

// Gemini 2.5 Flash "piensa" por defecto: para elegir un comando no hace falta y tarda 4 veces más.
const FAST = (tag: string) => ({
  google: { thinkingConfig: { thinkingBudget: 0 } },
  vertex: { thinkingConfig: { thinkingBudget: 0 } },
  gateway: { tags: ["norma", tag] },
});

const configured = () =>
  process.env.AI !== "off" && Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);

// Tope de gasto: la cuenta tiene USD 5 de crédito gratis y no se gasta más que eso. El saldo del
// AI Gateway se consulta cada 2 minutos por instancia y la IA se apaga sola cuando queda menos de
// USD 1; mientras tanto el bot sigue andando sin ella.
const MIN_BALANCE = Number(process.env.AI_MIN_BALANCE ?? 1);
let health: { ok: boolean; at: number } | null = null;
export async function aiAvailable(): Promise<boolean> {
  if (!configured()) return false;
  if (health && Date.now() - health.at < 2 * 60_000) return health.ok;
  try {
    const { balance } = await gateway.getCredits();
    health = { ok: Number(balance) > MIN_BALANCE, at: Date.now() };
  } catch {
    health = { ok: false, at: Date.now() };
  }
  return health.ok;
}

/*
 * Cupo de usos de IA, porque el simulador es público: por tienda (cada visitante del simulador
 * o Norma) y global por día. Con Redis el conteo es compartido entre instancias; sin Redis es por
 * instancia, y el saldo mínimo de arriba sigue siendo el freno final.
 */
const LIMITS = { perStore: Number(process.env.AI_DAILY_PER_STORE ?? 40), global: Number(process.env.AI_DAILY_GLOBAL ?? 300) };
const memory = new Map<string, number>();

export async function takeAiQuota(storeId: string): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const keys = [`ai:${day}:all`, `ai:${day}:${storeId}`];
  const limits = [LIMITS.global, storeId === "norma" ? LIMITS.global : LIMITS.perStore];
  const redis = sharedRedis();
  let counts: number[];
  try {
    if (!redis) throw new Error("sin redis");
    const p = redis.pipeline();
    for (const k of keys) {
      p.incr(k);
      p.expire(k, 60 * 60 * 48);
    }
    const res = (await p.exec()) as number[];
    counts = [res[0], res[2]];
  } catch {
    counts = keys.map((k) => {
      const n = (memory.get(k) ?? 0) + 1;
      memory.set(k, n);
      return n;
    });
  }
  return counts.every((n, i) => n <= limits[i]);
}

export async function transcribeVoice(audio: Uint8Array): Promise<string | null> {
  if (!(await aiAvailable())) return null;
  try {
    const { text } = await transcribe({
      model: gateway.transcription(MODELS.transcription),
      audio,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS * 2),
    });
    return text.trim() || null;
  } catch (e) {
    console.error("ai transcribe", e);
    return null;
  }
}

const ACTIONS = ["sold", "restore", "price", "rename", "edit", "add", "list", "link", "undo", "help", "greeting", "thanks", "cancel", "yes", "no", "unknown"] as const;

const IntentSchema = z.object({
  action: z.enum(ACTIONS),
  number: z.number().int().nullable().describe("Número de pieza. Solo si sale del mensaje o de la lista; nunca inventado."),
  price: z.number().int().nullable().describe("Precio final en pesos, entero."),
  title: z.string().nullable().describe("Nombre nuevo, solo para rename."),
});
export type AiIntent = z.infer<typeof IntentSchema>;

const SYSTEM = `Sos el ayudante que entiende lo que le escribe (o le dice en un audio) Norma, una ceramista argentina de 70 años, a su página.
Tu único trabajo es elegir UNA acción y sus datos. No respondés a Norma.

Acciones:
- sold: vendió una pieza o ya no la tiene, o se le rompió.
- restore: volvió a tener una pieza que había sacado.
- price: cambia el precio de una pieza. Si dice "bajale dos mil" o "subile mil", calculá el precio final con el precio actual de la lista.
- rename: le cambia el nombre a una pieza.
- edit: quiere cambiar algo de una pieza pero no dice qué.
- add: quiere agregar una pieza nueva.
- list: quiere saber qué piezas tiene.
- link: quiere ver su página o el link.
- undo: se equivocó y quiere volver atrás.
- help: no sabe qué hacer.
- greeting: solo saluda.
- thanks: solo agradece o se despide.
- cancel: quiere dejar lo que estaba haciendo.
- yes / no: contesta que sí o que no a una pregunta.
- unknown: cualquier otra cosa, o si no estás seguro.

Si el bot le acaba de preguntar algo, leé el mensaje como la respuesta a esa pregunta.
Para identificar la pieza usá el número si lo dice, o si no el nombre comparándolo con la lista ("la jarrita blanca" es la de nombre parecido).
Si dos piezas encajan igual de bien, o ninguna, number = null. Nunca inventes números que no estén en la lista.`;

export async function interpret(text: string, pieces: Piece[], sold: Piece[], model?: LanguageModel, asking?: string): Promise<AiIntent | null> {
  if (!model && !(await aiAvailable())) return null;
  const list = (ps: Piece[]) => ps.map((p) => `${p.number} · ${p.title} · $${p.price}`).join("\n") || "(ninguna)";
  const question = asking ? `El bot le acaba de preguntar: «${asking}»\n\n` : "";
  try {
    const { output } = await generateText({
      model: model ?? gateway(MODELS.text),
      system: SYSTEM,
      prompt: `Piezas en la página:\n${list(pieces)}\n\nPiezas que sacó (vendidas):\n${list(sold)}\n\n${question}Mensaje de Norma: «${text}»`,
      output: Output.object({ schema: IntentSchema }),
      providerOptions: FAST("interpret"),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const all = [...pieces, ...sold];
    if (output.number !== null && !all.some((p) => p.number === output.number)) output.number = null;
    if (output.price !== null && (output.price < 1 || output.price > 100_000_000)) output.price = null;
    return output;
  } catch (e) {
    console.error("ai interpret", e);
    return null;
  }
}

/** Traduce la intención a la frase que el bot determinístico ya entiende. */
export function toCommand(i: AiIntent): string | null {
  const n = i.number;
  switch (i.action) {
    case "sold":
      return n !== null ? `vendí la ${n}` : "vendí una";
    case "restore":
      return n !== null ? `volví a tener la ${n}` : null;
    case "price":
      return n !== null ? (i.price !== null ? `la ${n} ahora sale ${i.price}` : `la ${n} ahora sale`) : null;
    case "rename":
      return n !== null && i.title ? `la ${n} se llama ${i.title}` : null;
    case "edit":
      return n !== null ? `cambiar la ${n}` : "cambiar algo";
    case "add":
      return "agregar";
    case "list":
      return "lista";
    case "link":
      return "ver mi página";
    case "undo":
      return "deshacer";
    case "help":
      return "ayuda";
    case "greeting":
      return "hola";
    case "thanks":
      return "gracias";
    case "cancel":
      return "cancelar";
    case "yes":
      return "sí";
    case "no":
      return "no";
    default:
      return null;
  }
}

/** Un nombre corto para la pieza de la foto, como lo diría ella: "Taza celeste". */
export async function suggestTitle(image: URL | Uint8Array, model?: LanguageModel): Promise<string | null> {
  if (!model && !(await aiAvailable())) return null;
  try {
    const { output } = await generateText({
      model: model ?? gateway(MODELS.text),
      output: Output.object({
        schema: z.object({
          title: z.string().describe("Nombre de 2 a 4 palabras, en castellano rioplatense, como una ceramista nombra su pieza. Ej: Taza celeste, Jarra blanca, Florero alto."),
          isCeramic: z.boolean(),
        }),
      }),
      providerOptions: FAST("suggest-title"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "¿Qué pieza de cerámica es esta? Dale un nombre corto y simple, sin marcas ni adjetivos de venta." },
            { type: "file", mediaType: "image", data: image },
          ],
        },
      ],
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const t = output.title.trim().replace(/[.«»"]/g, "");
    return output.isCeramic && t && t.length <= 40 ? t.charAt(0).toUpperCase() + t.slice(1) : null;
  } catch (e) {
    console.error("ai suggestTitle", e);
    return null;
  }
}
