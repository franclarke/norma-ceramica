// El motor de la conversación con Norma. Es una función pura:
// recibe la tienda y un mensaje, devuelve la tienda nueva y las respuestas.
// Lo usan igual el webhook de WhatsApp y el simulador.
import type { Change, ConversationStep, Draft, IncomingMessage, OutgoingMessage, Piece, ReplyButton, Store } from "../types";
import { cleanTitle, detectIntent, extractPrice, formatPrice, isNo, isUnsure, isYes, matchPieces, normalize, parsePieceNumber, parsePrice, splitTitleAndPrice, type Intent } from "./parse";

export type Context = { now: string; siteUrl: string };
export type Result = {
  store: Store;
  replies: OutgoingMessage[];
  /** Pieza publicada o cambiada en este turno. */
  touched?: number;
  /**
   * El bot no entendió el mensaje ("all") o entendió qué quiere pero no sobre cuál pieza ("which").
   * Quien lo llama puede pedirle a la IA que lo traduzca y probar de nuevo.
   */
  missed?: "all" | "which";
};

type Turn = { s: Store; out: OutgoingMessage[]; ctx: Context; touched?: number; missed?: "all" | "which" };
type Why = "sold" | "broken" | undefined;
type Step<K extends ConversationStep["step"]> = Extract<ConversationStep, { step: K }>;
type NumberStep = Step<"sold:number"> | Step<"edit:number"> | Step<"restore:number">;

const B = {
  add: { id: "menu:add", title: "Agregar una pieza" },
  sold: { id: "menu:sold", title: "Vendí una" },
  edit: { id: "menu:edit", title: "Cambiar algo" },
  no: { id: "confirm:no", title: "No" },
  cancel: { id: "confirm:no", title: "Cancelar" },
  fix: { id: "confirm:fix", title: "Cambiar algo" },
  fixPhoto: { id: "fix:photo", title: "La foto" },
  fixTitle: { id: "fix:title", title: "El nombre" },
  fixPrice: { id: "fix:price", title: "El precio" },
  retry: { id: "photo:retry", title: "Mando otra" },
  keep: { id: "photo:keep", title: "Usar esta" },
  acceptTitle: { id: "title:accept", title: "Sí, ponele ese" },
} satisfies Record<string, ReplyButton>;

const MENU = [B.add, B.sold, B.edit];
const FIXES = [B.fixPhoto, B.fixTitle, B.fixPrice];

/**
 * El "sí" de cada confirmación lleva escrito qué confirma. Si Norma toca un botón de un mensaje
 * viejo, no coincide con lo que está pendiente y no pasa nada.
 */
function yesId(c: ConversationStep): string | null {
  switch (c.step) {
    case "add:confirm":
      return "ok:add";
    case "sold:confirm":
      return `ok:sold:${c.numbers.join("-")}`;
    case "restore:confirm":
      return `ok:restore:${c.number}`;
    case "edit:confirm":
      return `ok:edit:${c.number}`;
    default:
      return null;
  }
}

const text = (t: string, buttons?: ReplyButton[]): OutgoingMessage => ({ kind: "text", text: t, buttons });
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const describe = (p: Pick<Piece, "number" | "title">) => `la ${p.number} (${lower(p.title)})`;
const card = (p: Pick<Piece, "number" | "title" | "price">) => `Pieza Nº ${p.number} · ${p.title}\n${formatPrice(p.price)}`;
const row = (p: Piece) => `${p.number} · ${p.title} · ${formatPrice(p.price)}`;
const count = (n: number) => (n === 1 ? "1 pieza" : `${n} piezas`);
const words = (raw: string) => normalize(raw).split(" ").filter(Boolean).length;
const hasName = (title: string) => /\p{L}{2}/u.test(title);
const sortPieces = (pieces: Piece[]) => [...pieces].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number);
const WHERE = "El número está en tu página, debajo de cada foto. O escribime «lista» y te las mando todas.";

export function respond(store: Store, msg: IncomingMessage, ctx: Context): Result {
  const t: Turn = { s: structuredClone(store), out: [], ctx };
  // Un paso guardado con un formato viejo no puede dejar a Norma trabada.
  if (t.s.conversation.step === "sold:confirm" && !Array.isArray(t.s.conversation.numbers)) rest(t);

  if (msg.kind === "image") onImage(t, msg);
  else if (msg.kind === "button") onButton(t, msg.id);
  else onText(t, msg.text);
  return { store: t.s, replies: t.out, touched: t.touched, missed: t.missed };
}

const say = (t: Turn, message: string, buttons?: ReplyButton[]) => void t.out.push(text(message, buttons));
const rest = (t: Turn) => void (t.s.conversation = { step: "idle" });
const find = (t: Turn, n: number) => t.s.pieces.find((p) => p.number === n);

// ---------- Fotos ----------

function onImage(t: Turn, msg: Extract<IncomingMessage, { kind: "image" }>) {
  const { s } = t;
  const step = s.conversation;
  const cap = msg.caption?.trim() ?? "";

  // Foto nueva para una pieza que ya está: porque se la pedimos, o porque abajo escribió el número.
  const target =
    step.step === "edit:photo" || step.step === "edit:what" ? step.number : /^\s*(la|pieza|n[º°o]?\.?)?\s*\d{1,4}\s*$/i.test(cap) ? parsePieceNumber(cap) : null;
  const piece = target !== null ? find(t, target) : undefined;
  if (piece) return propose(t, piece, { photo: msg.photo });

  const fromCaption = splitTitleAndPrice(cap);
  const incoming: Draft = {
    photo: msg.photo,
    title: fromCaption.title ?? undefined,
    price: fromCaption.price ?? undefined,
    suggestedTitle: msg.suggestedTitle,
    dark: msg.dark || undefined,
  };

  // Mandó varias fotos juntas: se cargan de a una, las demás esperan su turno.
  if ((step.step === "add:title" || step.step === "add:price" || step.step === "add:confirm") && step.draft.photo) {
    const queue = s.queue ?? [];
    if (queue.length >= 10) return say(t, "Uy, son muchas juntas y me pierdo. Vamos con las que ya tengo y después me mandás el resto.");
    s.queue = [...queue, incoming];
    return say(t, queue.length === 0 ? "Esa foto te la guardo para después. Primero terminemos con esta." : `Guardada también: ya tengo ${s.queue.length} fotos esperando.`);
  }

  // Si le habíamos pedido otra foto, lo que ya dijo (nombre, precio) se conserva.
  const prev = step.step === "add:photo" || step.step === "add:dark-photo" ? step.draft ?? {} : {};
  startDraft(t, { ...prev, ...clean(incoming), dark: incoming.dark }, { fresh: true });
}

function startDraft(t: Turn, draft: Draft, o: { fresh?: boolean; show?: boolean } = {}) {
  if (!draft.dark || !draft.photo) return askNext(t, draft, o);
  t.s.conversation = { step: "add:dark-photo", draft: { ...draft, dark: undefined } };
  const warning = "La foto salió un poco oscura y la pieza no se va a lucir. Cerca de una ventana sale mucho mejor. ¿Querés mandar otra?";
  t.out.push(o.show ? { kind: "image", photo: draft.photo, caption: warning, buttons: [B.retry, B.keep] } : text(warning, [B.retry, B.keep]));
}

/** Pide lo que falte de la pieza nueva: foto, nombre, precio y, al final, la confirmación. */
function askNext(t: Turn, draft: Draft, o: { fresh?: boolean; show?: boolean } = {}) {
  const { s } = t;
  const photo = draft.photo;
  const ask = (m: string, buttons?: ReplyButton[]) => void t.out.push(o.show && photo ? { kind: "image", photo, caption: m, buttons } : text(m, buttons));
  const hi = o.fresh ? "¡Qué linda! " : "";
  if (!photo) {
    s.conversation = { step: "add:photo", draft };
    say(t, "Mandame la foto de la pieza.");
  } else if (!draft.title && draft.suggestedTitle) {
    s.conversation = { step: "add:title", draft };
    ask(`${hi}¿Le pongo «${draft.suggestedTitle}»? Si no, decime cómo se llama.`, [B.acceptTitle]);
  } else if (!draft.title) {
    s.conversation = { step: "add:title", draft };
    ask(`${hi}¿Cómo se llama esta pieza?`);
  } else if (!draft.price) {
    s.conversation = { step: "add:price", draft };
    ask(`${hi || "Bien. "}¿Cuánto sale «${draft.title}»?`);
  } else {
    s.conversation = { step: "add:confirm", draft };
    t.out.push({
      kind: "image",
      photo,
      caption: `Así va a quedar en tu página:\n\n${card({ number: s.nextNumber, title: draft.title, price: draft.price })}\n\n¿La publico?`,
      buttons: [{ id: "ok:add", title: "Sí, publicar" }, B.fix, B.cancel],
    });
  }
}

function retryPhoto(t: Turn, draft: Draft, message: string) {
  t.s.conversation = { step: "add:photo", draft: { ...draft, photo: undefined, dark: undefined } };
  say(t, message);
}

/** Cuando termina con una pieza nueva, sigue con la próxima foto que haya mandado. */
function nextInQueue(t: Turn) {
  const [next, ...others] = t.s.queue ?? [];
  if (!next) return;
  t.s.queue = others.length ? others : undefined;
  say(t, others.length ? `Sigo con otra de las fotos que me mandaste (quedan ${others.length + 1}).` : "Sigo con la otra foto que me mandaste.");
  startDraft(t, next, { show: true });
}

// ---------- Botones ----------

function onButton(t: Turn, id: string) {
  const step = t.s.conversation;
  if (id.startsWith("menu:")) return startMenu(t, id);
  if (id === yesId(step)) return confirm(t);
  if (id === "confirm:no" && yesId(step)) return decline(t);

  const pick = id.match(/^pick:(\d+)$/);
  if (pick) {
    const n = parseInt(pick[1], 10);
    if (step.step === "sold:number") return askSold(t, [n], step.why);
    if (step.step === "restore:number") return askRestore(t, n);
    if (step.step === "edit:number") return applyChange(t, n, step.change ?? { kind: "edit" });
    if (step.step === "idle" || step.step === "piece") return showPiece(t, n);
  }
  // Los botones de la ficha de una pieza sirven aunque hayan pasado otros mensajes.
  const onPiece = id.match(/^(sold|edit):(\d+)$/);
  if (onPiece && (step.step === "idle" || step.step === "piece")) {
    const n = parseInt(onPiece[2], 10);
    return onPiece[1] === "sold" ? askSold(t, [n], "sold") : askEdit(t, n);
  }

  switch (step.step) {
    case "add:dark-photo":
      if (id === "photo:retry") return retryPhoto(t, step.draft, "Dale, mandame la otra foto cuando la tengas.");
      if (id === "photo:keep") return askNext(t, step.draft);
      break;
    case "add:title":
      if (id === "title:accept" && step.draft.suggestedTitle) return askNext(t, { ...step.draft, title: step.draft.suggestedTitle });
      break;
    case "add:confirm":
      if (id === "confirm:fix") return say(t, "¿Qué querés cambiar?", FIXES);
      if (id === "fix:photo") return retryPhoto(t, step.draft, "Dale, mandame la foto nueva.");
      if (id === "fix:title") return fixTitle(t, step.draft);
      if (id === "fix:price") return fixPrice(t, step.draft);
      break;
    case "edit:what":
      if (id === "fix:photo") return applyChange(t, step.number, { kind: "edit", photo: true });
      if (id === "fix:title") return applyChange(t, step.number, { kind: "rename" });
      if (id === "fix:price") return applyChange(t, step.number, { kind: "price" });
      break;
  }
  // Un botón de un mensaje anterior: seguimos con lo que estaba pendiente.
  reprompt(t);
}

function fixTitle(t: Turn, draft: Draft) {
  t.s.conversation = { step: "add:title", draft: { ...draft, title: undefined, suggestedTitle: undefined } };
  say(t, "¿Cómo se llama la pieza?");
}

function fixPrice(t: Turn, draft: Draft) {
  t.s.conversation = { step: "add:price", draft: { ...draft, price: undefined } };
  say(t, "¿Cuánto sale?");
}

// ---------- Texto (o audio ya transcripto) ----------

function onText(t: Turn, raw: string) {
  const { s } = t;
  const step = s.conversation;
  const intent = detectIntent(raw);
  const pending = step.step !== "idle" && step.step !== "piece";
  // Cuando le preguntamos un nombre, lo que escriba es el nombre.
  const naming = step.step === "add:title" || step.step === "edit:title";

  if (intent.type === "help") return void t.out.push(help());
  // Con algo a medias, "me equivoqué" es dejar eso: todavía no cambió nada en la página.
  if (intent.type === "undo") return pending ? cancel(t) : undo(t);
  if (intent.type === "cancel" && pending) return cancel(t);
  if (!naming && intent.type === "list") return void t.out.push(list(s));
  if (!naming && intent.type === "link") return say(t, `Tu página es esta:\n${t.ctx.siteUrl}\n\nAhora tiene ${count(s.pieces.length)}.`);

  // En medio de una cosa pide otra, sobre otra pieza ("vendí la 14"): atendemos el pedido nuevo.
  if (interrupts(step, intent)) {
    if ("draft" in step && step.step !== "edit:confirm" && step.draft?.photo) say(t, "La pieza nueva la dejamos para después: cuando quieras, mandame la foto otra vez.");
    rest(t);
    return free(t, intent, raw);
  }

  switch (step.step) {
    case "idle":
    case "piece":
    case "edit:what":
      return free(t, intent, raw);

    case "add:photo": {
      const later = /\b(ahora no|despues|luego|mas tarde|no puedo|busco|buscando|ya te la)\b/.test(normalize(raw));
      if (intent.photo || later || isNo(raw) || isUnsure(raw)) return say(t, "Dale, no hay apuro. Cuando la tengas, mandámela.");
      const cap = splitTitleAndPrice(raw);
      if (cap.price !== null && ["unknown", "price", "piece"].includes(intent.type)) return noteDraft(t, { ...step.draft, title: cap.title ?? step.draft?.title, price: cap.price });
      if (["sold", "restore", "price", "rename", "edit", "info", "greeting", "thanks"].includes(intent.type)) {
        rest(t);
        return free(t, intent, raw);
      }
      return reprompt(t);
    }

    case "add:dark-photo": {
      const n = normalize(raw);
      // La pregunta es "¿querés mandar otra?": sí es otra, no es quedarse con esta.
      if (/\b(otra|mando|nueva|de nuevo)\b/.test(n) || isYes(raw)) return retryPhoto(t, step.draft, "Dale, mandame la otra foto cuando la tengas.");
      if (/\b(usa|usala|esta|esa|asi|igual|dejala)\b/.test(n) || isNo(raw)) return askNext(t, step.draft);
      t.missed = "all";
      return reprompt(t);
    }

    case "add:title": {
      const d = step.draft;
      if (d.suggestedTitle && isYes(raw)) return askNext(t, { ...d, title: d.suggestedTitle });
      if (isNo(raw) || isUnsure(raw)) {
        if (!d.suggestedTitle) return say(t, "Con un nombre cortito alcanza, como le dirías vos. Por ejemplo: Jarra blanca.");
        s.conversation = { step: "add:title", draft: { ...d, suggestedTitle: undefined } };
        return say(t, "Bueno. ¿Cómo la llamamos, entonces?");
      }
      if (["greeting", "thanks", "yes"].includes(intent.type)) return reprompt(t);
      const both = splitTitleAndPrice(intent.type === "rename" && intent.title ? intent.title : raw);
      if (!both.title || !hasName(both.title)) {
        if (both.price !== null) s.conversation = { step: "add:title", draft: { ...d, price: both.price } };
        return say(t, "¿Y cómo se llama? Por ejemplo: Jarra blanca.");
      }
      return askNext(t, { ...d, title: both.title, price: both.price ?? d.price });
    }

    case "add:price": {
      const price = extractPrice(raw);
      if (price !== null) return askNext(t, { ...step.draft, price });
      return say(t, isNo(raw) || isUnsure(raw) ? "Pensalo tranquila. Cuando sepas el precio, escribímelo." : "No me quedó claro el precio. ¿Me lo escribís con números? Por ejemplo: 12000");
    }

    case "add:confirm": {
      // Antes de publicar puede corregir sin tocar botones: "no, sale 9000", "se llama jarra grande".
      const d = step.draft;
      if (intent.type === "price" && intent.delta && d.price && d.price + intent.delta > 0) return askNext(t, { ...d, price: d.price + intent.delta });
      const amount = extractPrice(raw);
      if (amount !== null && amount >= 100) return askNext(t, { ...d, price: amount });
      if (intent.type === "rename" && intent.title) return askNext(t, { ...d, title: intent.title });
      if (intent.photo) return retryPhoto(t, d, "Dale, mandame la foto nueva.");
      if (intent.type === "rename") return fixTitle(t, d);
      if (intent.type === "price") return fixPrice(t, d);
      if (intent.type === "edit") return say(t, "¿Qué querés cambiar?", FIXES);
      break;
    }

    case "sold:number":
    case "edit:number":
    case "restore:number": {
      // Cambió de idea ("gracias", "mejor agrego otra"): no la dejamos atrapada en la pregunta.
      const mine = step.step === "sold:number" ? ["sold"] : step.step === "restore:number" ? ["restore"] : ["edit", "price", "rename"];
      if (["greeting", "thanks", "add", "info", "sold", "restore", "price", "rename", "edit"].includes(intent.type) && !mine.includes(intent.type)) {
        rest(t);
        return free(t, intent, raw);
      }
      // "No me acuerdo el número": le mandamos todas.
      if (isUnsure(raw)) {
        const pool = step.step === "restore:number" ? s.sold : s.pieces;
        return say(t, `No pasa nada, son estas:\n\n${pool.map(row).join("\n")}\n\n¿Cuál es?`);
      }
      const nums = whichPieces(t, step, intent, raw);
      if (nums === "asked") return;
      if (!nums.length) {
        if (isNo(raw)) return cancel(t);
        t.missed = "all";
        if (step.missed) {
          rest(t);
          return say(t, "Perdón, no te entendí. ¿Qué querés hacer?", MENU);
        }
        s.conversation = { ...step, missed: true };
        return say(t, `No me doy cuenta de cuál es. ${WHERE}`);
      }
      if (step.step === "sold:number") return askSold(t, nums, intent.why ?? step.why);
      if (step.step === "restore:number") return askRestore(t, nums[0]);
      return applyChange(t, nums[0], intent.type === "price" || intent.type === "rename" || intent.photo ? changeOf(intent) : step.change ?? { kind: "edit" });
    }

    case "sold:confirm": {
      // "no, la 16" cambia de pieza; "sí, y la 16 también" suma otra.
      const others = named(intent, raw, s.pieces).filter((n) => !step.numbers.includes(n));
      if (others.length) return askSold(t, isYes(raw) ? [...step.numbers, ...others] : others, intent.why ?? step.why);
      break;
    }

    case "restore:confirm": {
      const other = named(intent, raw, s.sold).find((n) => n !== step.number);
      if (other !== undefined) return askRestore(t, other);
      break;
    }

    case "edit:photo":
      return isNo(raw) ? cancel(t) : reprompt(t);

    case "edit:title": {
      if (isNo(raw)) return cancel(t);
      if (["greeting", "thanks", "yes"].includes(intent.type)) return reprompt(t);
      const title = intent.type === "rename" && intent.title ? intent.title : cleanTitle(raw);
      if (!title || !hasName(title)) return reprompt(t);
      return applyChange(t, step.number, { kind: "rename", title });
    }

    case "edit:price": {
      const change: Change = intent.type === "price" && (intent.delta || intent.percent) ? changeOf(intent) : { kind: "price", price: extractPrice(raw) };
      if (change.price || change.delta || change.percent) return applyChange(t, step.number, change);
      if (isNo(raw)) return cancel(t);
      return say(t, "No me quedó claro el precio. ¿Me lo escribís con números? Por ejemplo: 9500");
    }

    case "edit:confirm": {
      const p = find(t, step.number);
      if (!p) break;
      // Lo mismo que al publicar: puede corregir sobre la marcha.
      if (intent.type === "price" && (intent.delta || intent.percent)) return applyChange(t, p.number, changeOf(intent));
      const amount = extractPrice(raw);
      if (amount !== null && amount >= 100) return propose(t, p, { ...step.draft, price: amount });
      if (intent.type === "rename" && intent.title) return propose(t, p, { ...step.draft, title: intent.title });
      // "no, la 16": el mismo cambio, en otra pieza.
      const other = intent.numbers.find((n) => n !== p.number);
      if (other !== undefined) {
        const q = find(t, other);
        return q ? propose(t, q, step.draft) : void t.out.push(notFound(s, other));
      }
      break;
    }
  }

  // Quedan las confirmaciones: sí, no, una duda, o no se entendió.
  if (isUnsure(raw)) return say(t, "No hay apuro. Cuando te decidas, decime que sí o que no.");
  if (isYes(raw)) return confirm(t);
  if (isNo(raw)) return decline(t);
  t.missed = "all";
  reprompt(t);
}

/** ¿Pide algo sobre otra pieza mientras hay una cosa pendiente? */
function interrupts(step: ConversationStep, intent: Intent): boolean {
  if (step.step === "idle" || step.step === "piece" || step.step === "edit:what") return false;
  if (!["sold", "restore", "price", "rename", "edit", "info"].includes(intent.type) || !intent.numbers.length) return false;
  const mine = "numbers" in step ? step.numbers : "number" in step ? [step.number] : [];
  if (intent.numbers.every((n) => mine.includes(n))) return false;
  if (step.step.startsWith("sold:") && intent.type === "sold") return false;
  if (step.step.startsWith("restore:") && intent.type === "restore") return false;
  if (step.step === "edit:number" && ["edit", "price", "rename"].includes(intent.type)) return false;
  return true;
}

/** Las piezas que nombró: por número o, si no, por nombre cuando coincide con una sola. */
function named(intent: Intent, raw: string, pool: Piece[]): number[] {
  if (intent.numbers.length) return intent.numbers;
  const match = matchPieces(subject(raw, intent), pool);
  return match.length === 1 ? [match[0].number] : [];
}

/** En "la tetera ahora se llama tetera grande", la pieza es lo que va antes del nombre nuevo. */
const subject = (raw: string, intent: Intent) =>
  intent.type === "rename" && intent.title ? raw.replace(/(se llama|ll[aá]mal[ao]|nombre|t[ií]tulo|ponele)\b[\s\S]*$/i, "") : raw;

/** Cuando le preguntamos "¿cuál?": acepta el número, el nombre, o algo más de detalle entre las candidatas. */
function whichPieces(t: Turn, step: NumberStep, intent: Intent, raw: string): number[] | "asked" {
  if (intent.numbers.length) return intent.numbers;
  const pool = step.step === "restore:number" ? t.s.sold : t.s.pieces;
  const candidates = pool.filter((p) => step.options?.includes(p.number));
  const among = matchPieces(raw, candidates);
  if (among.length === 1) return [among[0].number];
  const match = among.length ? among : matchPieces(raw, pool);
  if (match.length === 1) return [match[0].number];
  if (match.length > 1) {
    askWhich(t, step, match);
    return "asked";
  }
  const n = parsePieceNumber(raw);
  return n === null ? [] : [n];
}

function askWhich(t: Turn, step: NumberStep, candidates: Piece[]) {
  const shown = candidates.slice(0, 8);
  t.s.conversation = { ...step, options: shown.map((p) => p.number) };
  say(t, `Hay ${shown.length} que pueden ser:\n\n${shown.map(row).join("\n")}\n\n¿Cuál es?`, shown.length <= 3 ? shown.map(pickButton) : undefined);
}

/** Los botones de WhatsApp llevan 20 letras como mucho: "21 · Taza verde sal…" */
const pickButton = (p: Piece): ReplyButton => {
  const title = `${p.number} · ${p.title}`;
  return { id: `pick:${p.number}`, title: title.length > 20 ? `${title.slice(0, 19).trimEnd()}…` : title };
};

/**
 * "Vendí la más cara", "la que le gusta a mi nieta": dice algo de la pieza que el bot no sabe leer.
 * Ahí la IA puede ayudar. "Quiero cambiar la foto" no dice nada más: se le pregunta cuál y listo.
 */
const PLAIN = new Set(
  "a al algo ahora ayer baja bajale borra borrar cambia cambiale cambiar cambio che con cuesta de del el en es esa ese esta foto fotos gracias hay hola hoy la las le lo los mas me mi mis no nombre norma nueva nuevo o otra otro pagina para pieza piezas poner por porfa precio precios que queria quiero quisiera recien rompi rompio saca sacala sacame sacar sale se si subi subile te tener tengo tiene titulo un una unas unos vale vendi vendida vendimos vendio volvi y ya".split(
    " ",
  ),
);
const hasDetail = (raw: string) => normalize(raw).split(" ").some((w) => w.length > 2 && !PLAIN.has(w) && !/^\d+$/.test(w));

/** Sin nada pendiente (o recién vista una pieza): ¿qué quiere hacer? */
function free(t: Turn, intent: Intent, raw: string) {
  const { s } = t;
  const step = s.conversation;
  // Le acabamos de mostrar una pieza: "9000", "la foto" o "la vendí" hablan de esa.
  const about = step.step === "piece" || step.step === "edit:what" ? step.number : undefined;
  if (about !== undefined) {
    const price = parsePrice(raw);
    if (price !== null && price >= 100 && !find(t, price)) return applyChange(t, about, { kind: "price", price });
    if (intent.photo && !intent.numbers.length) return applyChange(t, about, { kind: "edit", photo: true });
    if (step.step === "edit:what" && isNo(raw)) return cancel(t);
  }
  if (act(t, intent, raw, about)) return;
  t.missed = "all";
  if (step.step === "edit:what") return reprompt(t);
  rest(t);
  say(t, "Perdón, no te entendí. ¿Qué querés hacer?", MENU);
}

function act(t: Turn, intent: Intent, raw: string, about?: number): boolean {
  const { s } = t;
  const type = intent.type;
  const onPieces = type === "sold" || type === "price" || type === "rename" || type === "edit" || type === "info";
  if (onPieces && !s.pieces.length) {
    rest(t);
    say(t, "Todavía no tenés piezas en la página. Mandame una foto y la agregamos.", [B.add]);
    return true;
  }
  const match = intent.numbers.length ? [] : matchPieces(subject(raw, intent), type === "restore" ? s.sold : s.pieces);
  const said = intent.numbers[0] ?? (match.length === 1 ? match[0].number : undefined);
  const one = said ?? about;

  switch (type) {
    case "greeting":
      rest(t);
      say(t, `¡Hola, ${s.ownerName}! ¿Qué querés hacer?`, MENU);
      return true;
    case "thanks":
      rest(t);
      say(t, "¡De nada! Cualquier cosa, escribime.");
      return true;
    case "yes":
      rest(t);
      say(t, "Listo. Cualquier cosa, acá estoy.");
      return true;
    case "no":
    case "cancel":
      rest(t);
      say(t, "Bueno. Cuando me necesites, escribime.");
      return true;
    case "add":
      startMenu(t, "menu:add");
      return true;
    case "sold": {
      if (intent.numbers.length) askSold(t, intent.numbers, intent.why);
      else if (one !== undefined) askSold(t, [one], intent.why);
      else if (match.length > 1) askWhich(t, { step: "sold:number", why: intent.why }, match);
      else {
        s.conversation = { step: "sold:number", why: intent.why };
        say(t, "¿Cuál es? Decime el número, o cómo se llama.");
        if (hasDetail(raw)) t.missed = "which";
      }
      return true;
    }
    case "restore": {
      if (said !== undefined) askRestore(t, said);
      else if (!s.sold.length) {
        rest(t);
        say(t, "No tengo guardada ninguna pieza que hayas sacado de la página.");
      } else {
        askWhich(t, { step: "restore:number" }, match.length ? match : s.sold);
        if (!match.length && hasDetail(raw)) t.missed = "which";
      }
      return true;
    }
    case "price":
    case "rename":
    case "edit": {
      const change = changeOf(intent);
      if (one !== undefined) {
        if (intent.numbers.length > 1) say(t, `Vamos de a una, así no me confundo. Empiezo por la ${one}.`);
        applyChange(t, one, change);
      } else if (match.length > 1) askWhich(t, { step: "edit:number", change }, match);
      else {
        s.conversation = { step: "edit:number", change };
        const what = change.kind === "price" ? "¿A cuál le cambio el precio?" : change.kind === "rename" ? "¿A cuál le cambio el nombre?" : change.photo ? "¿De cuál es la foto nueva?" : "¿Cuál querés cambiar?";
        say(t, `${what} Decime el número, o cómo se llama.`);
        if (hasDetail(raw)) t.missed = "which";
      }
      return true;
    }
    case "info":
      if (one !== undefined) showPiece(t, one);
      else {
        rest(t);
        if (match.length > 1) say(t, match.map(row).join("\n"));
        else t.out.push(list(s));
      }
      return true;
    case "piece": {
      const n = intent.numbers[0];
      // Un "9000" suelto que no es ninguna pieza es un precio: falta saber de cuál.
      if (n >= 100 && !find(t, n) && !s.sold.some((x) => x.number === n) && /^\D*\d[\d.\s]*\D*$/.test(raw) && !/\b(la|el|pieza|numero|nro)\b/.test(normalize(raw))) {
        s.conversation = { step: "edit:number", change: { kind: "price", price: n } };
        say(t, `¿${formatPrice(n)} para cuál? Decime el número, o cómo se llama.`);
      } else showPiece(t, n);
      return true;
    }
    default: {
      // "Jarra blanca 12000" sin foto: quiere agregarla, falta la foto.
      const cap = splitTitleAndPrice(raw);
      if (cap.title && cap.price !== null && hasName(cap.title) && !intent.numbers.length) {
        noteDraft(t, { title: cap.title, price: cap.price });
        return true;
      }
      // Nombró una pieza y nada más: se la mostramos.
      if (said !== undefined && words(raw) <= 5) {
        showPiece(t, said);
        return true;
      }
      // "La blanca", y hay varias blancas: que elija.
      if (match.length > 1 && words(raw) <= 4) {
        rest(t);
        const shown = match.slice(0, 8);
        say(t, `Hay ${shown.length} que pueden ser:\n\n${shown.map(row).join("\n")}\n\n¿Cuál?`, shown.length <= 3 ? shown.map(pickButton) : undefined);
        return true;
      }
      return false;
    }
  }
}

const changeOf = (i: Intent): Change =>
  i.type === "price" ? { kind: "price", price: i.price ?? null, delta: i.delta, percent: i.percent } : i.type === "rename" ? { kind: "rename", title: i.title ?? null } : { kind: "edit", photo: i.photo };

function noteDraft(t: Turn, draft: Draft) {
  t.s.conversation = { step: "add:photo", draft };
  const noted = [draft.title && `«${draft.title}»`, draft.price && formatPrice(draft.price)].filter(Boolean).join(", ");
  say(t, `Anotado: ${noted}. Ahora mandame la foto.`);
}

// ---------- Pasos compartidos ----------

function startMenu(t: Turn, id: string) {
  const { s } = t;
  if (id === "menu:add") {
    s.conversation = { step: "add:photo" };
    return say(t, "Mandame una foto de la pieza.\n\nSi querés, en el mismo mensaje escribí el nombre y el precio. Por ejemplo: Jarra blanca 12000");
  }
  if (!s.pieces.length) {
    rest(t);
    return say(t, "Todavía no tenés piezas en la página. Mandame una foto y la agregamos.", [B.add]);
  }
  if (id === "menu:sold") {
    s.conversation = { step: "sold:number", why: "sold" };
    say(t, "¿Cuál vendiste? Decime el número, o cómo se llama.");
  } else {
    s.conversation = { step: "edit:number" };
    say(t, "¿Cuál querés cambiar? Decime el número, o cómo se llama.");
  }
}

function showPiece(t: Turn, n: number) {
  const p = find(t, n);
  if (!p) {
    rest(t);
    return void t.out.push(notFound(t.s, n));
  }
  t.s.conversation = { step: "piece", number: n };
  t.out.push({
    kind: "image",
    photo: p.photo,
    caption: card(p),
    buttons: [
      { id: `sold:${n}`, title: "La vendí" },
      { id: `edit:${n}`, title: "Cambiar algo" },
    ],
  });
}

function askSold(t: Turn, numbers: number[], why: Why) {
  const { s } = t;
  const found = [...new Set(numbers)].map((n) => find(t, n)).filter((p): p is Piece => Boolean(p));
  for (const n of numbers.filter((n) => !find(t, n)).slice(0, 2)) t.out.push(notFound(s, n));
  if (!found.length) {
    // Si el número no existe se queda esperando otro; si ya la había sacado, no hay nada que preguntar.
    s.conversation = numbers.some((n) => !s.sold.some((x) => x.number === n)) ? { step: "sold:number", why } : { step: "idle" };
    return;
  }
  s.conversation = { step: "sold:confirm", numbers: found.map((p) => p.number), why };
  const yes = { id: yesId(s.conversation)!, title: found.length === 1 ? "Sí, sacarla" : "Sí, sacarlas" };
  if (found.length === 1) {
    t.out.push({ kind: "image", photo: found[0].photo, caption: `¿Saco de la página la pieza Nº ${found[0].number} · ${found[0].title}?`, buttons: [yes, B.no] });
  } else {
    say(t, `¿Saco estas ${found.length} de la página?\n\n${found.map(row).join("\n")}`, [yes, B.no]);
  }
}

function askRestore(t: Turn, n: number) {
  const { s } = t;
  const p = s.sold.find((x) => x.number === n);
  if (!p) {
    rest(t);
    return say(t, find(t, n) ? `La ${n} ya está en tu página.` : `No tengo guardada ninguna pieza con el número ${n}.`);
  }
  s.conversation = { step: "restore:confirm", number: n };
  t.out.push({
    kind: "image",
    photo: p.photo,
    caption: `¿Vuelvo a poner en la página la pieza Nº ${p.number} · ${p.title}?`,
    buttons: [{ id: yesId(s.conversation)!, title: "Sí, volver a ponerla" }, B.no],
  });
}

function askEdit(t: Turn, n: number) {
  const p = find(t, n);
  if (!p) {
    t.s.conversation = { step: "edit:number" };
    return void t.out.push(notFound(t.s, n));
  }
  t.s.conversation = { step: "edit:what", number: n };
  t.out.push({ kind: "image", photo: p.photo, caption: `${card(p)}\n\n¿Qué le cambio?`, buttons: FIXES });
}

/** Lleva un cambio pedido ("bajale 2000", "ponele jarra grande", "la foto") hasta su confirmación. */
function applyChange(t: Turn, n: number, change: Change) {
  const { s } = t;
  const p = find(t, n);
  if (!p) {
    s.conversation = { step: "edit:number", change };
    return void t.out.push(notFound(s, n));
  }
  if (change.kind === "edit") {
    if (!change.photo) return askEdit(t, n);
    s.conversation = { step: "edit:photo", number: n };
    return say(t, `Dale, mandame la foto nueva de ${describe(p)}.`);
  }
  if (change.kind === "rename") {
    if (change.title) return propose(t, p, { title: change.title });
    s.conversation = { step: "edit:title", number: n };
    return say(t, `¿Cómo se llama ahora ${describe(p)}?`);
  }
  let price = change.price ?? null;
  if (price === null && change.percent) price = Math.max(Math.round((p.price * (1 + change.percent / 100)) / 50) * 50, 0);
  if (price === null && change.delta) price = p.price + change.delta;
  if (price === null || price <= 0) {
    s.conversation = { step: "edit:price", number: n };
    const lead = price === null ? "" : "No le puedo bajar tanto. ";
    return say(t, `${lead}¿Cuánto sale ahora ${describe(p)}? Hoy está a ${formatPrice(p.price)}.`);
  }
  propose(t, p, { price });
}

/** Muestra cómo quedaría la pieza con el cambio y pregunta si lo guarda. */
function propose(t: Turn, p: Piece, draft: Draft) {
  const change = clean({ photo: draft.photo, title: draft.title, price: draft.price });
  const next = { ...p, ...change };
  if (!change.photo && next.title === p.title && next.price === p.price) {
    rest(t);
    return say(t, `${upper(describe(p))} ya está así, a ${formatPrice(p.price)}. No cambié nada.`);
  }
  t.s.conversation = { step: "edit:confirm", number: p.number, draft: change };
  const before = next.price !== p.price ? ` (antes ${formatPrice(p.price)})` : "";
  t.out.push({
    kind: "image",
    photo: next.photo,
    caption: `Así va a quedar:\n\nPieza Nº ${next.number} · ${next.title}\n${formatPrice(next.price)}${before}\n\n¿Lo guardo?`,
    buttons: [{ id: yesId(t.s.conversation)!, title: "Sí, guardar" }, B.cancel],
  });
}

// ---------- Lo que cambia la página ----------

function confirm(t: Turn) {
  const { s, ctx } = t;
  const step = s.conversation;
  switch (step.step) {
    case "add:confirm": {
      const d = step.draft;
      if (!d.photo || !d.title || !d.price) return askNext(t, d);
      const number = s.nextNumber;
      const piece: Piece = { number, title: d.title, price: d.price, photo: d.photo, createdAt: ctx.now, updatedAt: ctx.now };
      pushUndo(s, `agregar la ${number} (${lower(d.title)})`);
      s.pieces = sortPieces([...s.pieces, piece]);
      s.nextNumber = number + 1;
      s.updatedAt = ctx.now;
      rest(t);
      say(t, `¡Listo! «${d.title}» ya está en tu página con el número ${number}.\n\nCuando la vendas, escribime: vendí la ${number}`);
      asItIs(t, piece);
      return nextInQueue(t);
    }
    case "sold:confirm": {
      const gone = step.numbers.map((n) => find(t, n)).filter((p): p is Piece => Boolean(p));
      rest(t);
      if (!gone.length) return say(t, "Esa pieza ya no estaba en la página.");
      const names = gone.length === 1 ? describe(gone[0]) : gone.map((p) => `la ${p.number}`).join(", ").replace(/, ([^,]*)$/, " y $1");
      pushUndo(s, `sacar ${names}`);
      s.pieces = s.pieces.filter((p) => !step.numbers.includes(p.number));
      s.sold = [...gone.map((p) => ({ ...p, updatedAt: ctx.now })), ...s.sold.filter((x) => !step.numbers.includes(x.number))];
      s.updatedAt = ctx.now;
      const cheer = step.why === "sold" ? (gone.length === 1 ? " ¡Qué bueno que se vendió!" : " ¡Qué bueno que se vendieron!") : step.why === "broken" ? " Qué lástima." : "";
      const empty = s.pieces.length ? "" : "\n\nTu página quedó sin piezas. Cuando tengas una nueva, mandame la foto.";
      return say(t, `Listo, saqué ${names} de la página.${cheer}${empty}\n\nSi fue un error, escribime: deshacer`);
    }
    case "restore:confirm": {
      const p = s.sold.find((x) => x.number === step.number);
      rest(t);
      if (!p) return say(t, "Esa pieza ya no la tengo guardada.");
      const back = { ...p, updatedAt: ctx.now };
      pushUndo(s, `volver a poner ${describe(p)}`);
      s.sold = s.sold.filter((x) => x.number !== p.number);
      s.pieces = sortPieces([...s.pieces, back]);
      s.updatedAt = ctx.now;
      say(t, `Listo, ${describe(p)} volvió a la página.`);
      return asItIs(t, back);
    }
    case "edit:confirm": {
      const p = find(t, step.number);
      rest(t);
      if (!p) return say(t, "Esa pieza ya no está en la página.");
      const next: Piece = { ...p, ...clean({ photo: step.draft.photo, title: step.draft.title, price: step.draft.price }), updatedAt: ctx.now };
      pushUndo(s, `cambiar ${describe(p)}`);
      s.pieces = s.pieces.map((x) => (x.number === p.number ? next : x));
      s.updatedAt = ctx.now;
      say(t, `Listo, ya cambié la ${p.number}.\n\nSi fue un error, escribime: deshacer`);
      return asItIs(t, next);
    }
    default:
      reprompt(t);
  }
}

function decline(t: Turn) {
  const step = t.s.conversation;
  rest(t);
  switch (step.step) {
    case "add:confirm":
      say(t, "Listo, esa no la publico.");
      return nextInQueue(t);
    case "sold:confirm":
      return say(t, step.numbers.length === 1 ? "Bueno, la dejo como está." : "Bueno, las dejo como están.");
    case "restore:confirm":
      return say(t, "Bueno, no la vuelvo a poner.");
    default:
      return say(t, "Bueno, no cambio nada.");
  }
}

function cancel(t: Turn) {
  const adding = t.s.conversation.step.startsWith("add:");
  rest(t);
  say(t, "Listo, lo dejamos ahí. No cambié nada.");
  if (adding) nextInQueue(t);
}

function undo(t: Turn) {
  const { s } = t;
  const last = s.undo.pop();
  rest(t);
  if (!last) return say(t, "No hay nada para deshacer. Tu página está como la dejaste.");
  s.pieces = last.pieces;
  s.sold = last.sold;
  s.updatedAt = t.ctx.now;
  say(t, `Listo, deshice lo último: ${last.label}. La página quedó como antes.`);
}

/** La tablilla tal cual la ve un comprador, para que Norma no tenga que abrir la página. */
function asItIs(t: Turn, p: Piece) {
  t.touched = p.number;
  t.out.push({
    kind: "image",
    photo: { url: `/api/tablilla/${t.s.id}/${p.number}?v=${Date.parse(p.updatedAt)}`, width: 1200, height: 630 },
    caption: t.s.demo ? "Así quedó en tu página." : `Así quedó en tu página: ${t.ctx.siteUrl}/${p.number}`,
  });
}

/** Repite la pregunta que está pendiente. */
function reprompt(t: Turn) {
  const { s } = t;
  const c = s.conversation;
  switch (c.step) {
    case "idle":
    case "piece":
      rest(t);
      return say(t, "¿Qué querés hacer?", MENU);
    case "add:photo":
      return say(t, "Estoy esperando la foto de la pieza. Tocá el clip o la camarita, acá abajo, y mandámela.");
    case "add:dark-photo":
      return say(t, "¿Mandás otra foto o uso esta?", [B.retry, B.keep]);
    case "add:title":
    case "add:price":
    case "add:confirm":
      return askNext(t, c.draft);
    case "sold:number":
    case "edit:number":
    case "restore:number":
      return say(t, `¿Cuál es? ${WHERE}`);
    case "sold:confirm":
      return askSold(t, c.numbers, c.why);
    case "restore:confirm":
      return askRestore(t, c.number);
    case "edit:what":
      return askEdit(t, c.number);
    case "edit:photo":
      return say(t, `Estoy esperando la foto nueva de la ${c.number}. Mandámela como cualquier foto.`);
    case "edit:title":
      return say(t, `¿Cómo se llama ahora la ${c.number}?`);
    case "edit:price":
      return say(t, `¿Cuánto sale ahora la ${c.number}?`);
    case "edit:confirm": {
      const p = find(t, c.number);
      return p ? propose(t, p, c.draft) : rest(t);
    }
  }
}

function notFound(s: Store, n: number): OutgoingMessage {
  const sold = s.sold.find((x) => x.number === n);
  if (sold) return text(`La ${n} (${lower(sold.title)}) ya la habías sacado de la página. Si la volviste a tener, escribime: volví a tener la ${n}`);
  return text(`No encuentro ninguna pieza con el número ${n}. ${WHERE}`);
}

function list(s: Store): OutgoingMessage {
  if (!s.pieces.length) return text("Todavía no tenés piezas en la página. Mandame una foto y la agregamos.", [B.add]);
  return text(`En tu página hay ${count(s.pieces.length)}:\n\n${s.pieces.map(row).join("\n")}`);
}

function help(): OutgoingMessage {
  return text(
    [
      "Así podés manejar tu página, escribiéndome como a cualquier persona:",
      "",
      "• Para agregar una pieza: mandame la foto. Si querés, con el nombre y el precio abajo.",
      "• Si vendiste una: «vendí la 14».",
      "• Para cambiar un precio: «la 14 ahora sale 9000».",
      "• Para cambiar la foto: mandá la foto nueva y escribí abajo el número.",
      "• Si te equivocaste: «deshacer».",
      "• Para ver todo lo que hay: «lista».",
    ].join("\n"),
    MENU,
  );
}

function pushUndo(s: Store, label: string) {
  s.undo = [...s.undo, { label, pieces: s.pieces, sold: s.sold }].slice(-10);
}

const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
