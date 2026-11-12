// Interpretación de lo que escribe (o dice en un audio) Norma. Todo determinístico:
// cada respuesta es predecible y siempre pasa por una confirmación.
import type { Piece } from "../types";

/** Minúsculas, sin tildes ni puntuación, espacios simples. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¡!¿?.,;:()"'*_~«»“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Números ----------

const UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
  noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600,
  seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};
const ARTICLES = new Set(["un", "uno", "una"]);
const BIG: Record<string, number> = { mil: 1000, millon: 1_000_000, millones: 1_000_000 };
const own = (o: object, k?: string): k is string => !!k && Object.hasOwn(o, k);
const isDigits = (w?: string) => !!w && /^\d+$/.test(w);

/**
 * Deja el texto listo para leer números: toda cantidad queda en dígitos.
 * "La catorce ahora sale nueve mil." → "la 14 ahora sale 9000"
 * "$ 12.000" → "12000" · "12,5 mil" → "12500" · "8 mil 500" → "8500" · "15 lucas" → "15000"
 */
export function canon(raw: string): string {
  const pre = raw
    .toLowerCase()
    .replace(/[$º°]/g, " ")
    .replace(/(\d)\s*(mil|lucas?|k)\b/g, "$1 mil")
    .replace(/(\d{1,3})((?:\.\d{3})+)(?!\d)/g, (_m, a: string, b: string) => a + b.replace(/\./g, ""))
    .replace(/(\d+)[.,](\d{1,2})\s*(mil|lucas?)\b/g, (_m, a: string, b: string) => String(Math.round(parseFloat(`${a}.${b}`) * 1000)))
    .replace(/(\d),\d{1,2}\b/g, "$1");
  const words = normalize(pre).replace(/\blucas?\b/g, "mil").split(" ").filter(Boolean);

  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    const run = readNumber(words, i);
    if (run) {
      out.push(String(run.value));
      i = run.next;
    } else {
      out.push(words[i]);
      i++;
    }
  }
  return out.join(" ");
}

/** Lee una cantidad que empieza en words[start]: dígitos o palabras, con "mil" y "millones". */
function readNumber(words: string[], start: number): { value: number; next: number } | null {
  let i = start;
  let total = 0;
  let current = 0;
  let seen = false;
  let afterY = false;
  let afterBig = false;
  while (i < words.length) {
    const w = words[i];
    if (isDigits(w)) {
      // Dígitos: solo al empezar, o un resto de hasta tres cifras después de "mil" ("8 mil 500").
      if (!seen) current = parseInt(w, 10);
      else if (afterBig && current === 0 && w.length <= 3) current = parseInt(w, 10);
      else break;
      seen = true;
      afterBig = false;
      i++;
      if (!own(BIG, words[i])) break;
      continue;
    }
    if (own(BIG, w)) {
      if (!seen && w !== "mil") break;
      total += (current || 1) * BIG[w];
      current = 0;
      seen = true;
      afterBig = true;
      i++;
      continue;
    }
    // "treinta y cinco"
    if (w === "y" && seen && current % 10 === 0 && current % 100 >= 30 && own(UNITS, words[i + 1]) && UNITS[words[i + 1]] < 10) {
      afterY = true;
      i++;
      continue;
    }
    if (own(UNITS, w)) {
      // "un", "una" son artículos, salvo en "un millón" o "treinta y una".
      if (ARTICLES.has(w) && !afterY && !own(BIG, words[i + 1])) break;
      const v = UNITS[w];
      const fits = current === 0 || (current % 100 === 0 && v < 100) || (afterY && v < 10);
      if (!fits) break;
      current += v;
      seen = true;
      afterY = false;
      afterBig = false;
      i++;
      continue;
    }
    break;
  }
  return seen ? { value: total + current, next: i } : null;
}

const sane = (n: number) => (Number.isFinite(n) && n >= 1 && n <= 100_000_000 ? n : null);
// "la 14", "la 14 y la 16", "pieza 7", "nº 3"
const PIECE_REF = /\b(?:la|las|el|pieza|piezas|numero|nro|n)\s+(\d{1,4})\b((?:\s+(?:(?:y|e)\s+(?:(?:la|el)\s+)?|(?:la|el)\s+)\d{1,4}\b)*)/g;
const FILLER = /\b(pesos?|ars|sale|salen|son|cuesta|vale|a|unos|unas|como|ponele|es|seria|serian|en|por|precio|el|de|mas o menos|maso|ahora|y)\b/g;
const joinThousands = (s: string) => s.replace(/\b(\d{1,3}) (\d{3})\b/g, "$1$2"); // "8 500" → "8500"

/** Un precio dicho solo: "12000", "$ 12.000", "12 mil", "doce mil pesos", "8 500", "15 lucas". */
export function parsePrice(text: string): number | null {
  const c = joinThousands(canon(text).replace(FILLER, " ").replace(/\s+/g, " ").trim());
  return /^\d+$/.test(c) ? sane(parseInt(c, 10)) : null;
}

/** El primer monto que aparezca en una frase, sin contar las piezas nombradas ("la 14"). */
export function extractPrice(text: string): number | null {
  const strict = parsePrice(text);
  if (strict !== null) return strict;
  const m = joinThousands(canon(text).replace(PIECE_REF, " ")).match(/\b\d+\b/);
  return m ? sane(parseInt(m[0], 10)) : null;
}

/** Las piezas nombradas por número: "la 14", "la 14 y la 16", "pieza catorce", "14 y 16". */
export function pieceNumbers(text: string): number[] {
  const c = canon(text);
  const found: number[] = [];
  for (const m of c.matchAll(PIECE_REF)) for (const d of `${m[1]} ${m[2] ?? ""}`.match(/\d{1,4}/g) ?? []) found.push(parseInt(d, 10));
  if (!found.length && /^\d{1,4}(?:\s*(?:y|e)\s*\d{1,4})*$/.test(c)) for (const d of c.match(/\d{1,4}/g) ?? []) found.push(parseInt(d, 10));
  return [...new Set(found)];
}

/** Un número de pieza cuando lo estamos esperando: "la 14", "14", "es la catorce, creo". */
export function parsePieceNumber(text: string): number | null {
  const named = pieceNumbers(text);
  if (named.length) return named[0];
  const m = canon(text).match(/\b(\d{1,4})\b/);
  return m ? parseInt(m[1], 10) : null;
}

// ---------- Sí y no ----------

const YES = /^(si+|sip|claro|obvio|dale|ok|oka|okey|listo|bueno|perfecto|joya|barbaro|genial|de una|esta bien|por supuesto|correcto|exacto|eso|asi esta bien)\b/;
const YES_VERBS = /^(publicala|publica|publicar|subila|guardalo|guardala|guarda|guardar|sacala|sacarla|sacalas|sacarlas|ponela|cambiala|cambialo|confirmo|confirmar|mandale|hacelo)\b/;
const NO = /^(no+|nop|nah|nada|mejor no|todavia no|espera|ni ahi|deja)\b/;
// "bueno, mejor no", "ay, no"
const HEDGED_NO = /^(bueno|ok|okey|listo|esta bien|eh|mm+|y|ay|uy)\s+(mejor |pero |creo que )?no\b(?! mas)/;

// "no sé", "no me acuerdo": no es un no, es una duda. ("no se vendió" es otra cosa.)
const UNSURE = /\bno (lo )?se( (que|cual|como|si|bien|todavia|la verdad|decirte)\b|$)|\bno estoy segur|\bni idea\b|\bno (me )?(acuerdo|recuerdo)\b/;
export const isUnsure = (text: string) => UNSURE.test(normalize(text));

export function isNo(text: string): boolean {
  if (/^\s*(👎|❌)/u.test(text)) return true;
  const t = normalize(text);
  return !UNSURE.test(t) && (NO.test(t) || HEDGED_NO.test(t));
}

export function isYes(text: string): boolean {
  if (/^\s*(👍|👌|✅|🙌|👏)/u.test(text)) return true;
  const t = normalize(text);
  return !isNo(text) && (YES.test(t) || YES_VERBS.test(t));
}

// ---------- Qué quiere hacer ----------

export type IntentType =
  | "greeting" | "thanks" | "help" | "add" | "sold" | "restore" | "price" | "rename" | "edit" | "info"
  | "undo" | "list" | "link" | "yes" | "no" | "cancel" | "piece" | "unknown";

export type Intent = {
  type: IntentType;
  /** Piezas nombradas por número. */
  numbers: number[];
  /** Precio nuevo. null: quiere cambiarlo pero no dijo a cuánto. */
  price?: number | null;
  /** Cambio relativo: "bajale 2000" es -2000. */
  delta?: number;
  /** Cambio en porcentaje: "bajale un 10%" es -10. */
  percent?: number;
  title?: string | null;
  /** Habla de la foto. */
  photo?: boolean;
  /** Por qué la saca: cambia lo que le contestamos. */
  why?: "sold" | "broken";
};

export function detectIntent(raw: string): Intent {
  const t = normalize(raw);
  const c = canon(raw);
  const numbers = pieceNumbers(raw);
  const is = (type: IntentType, extra: Partial<Intent> = {}): Intent => ({ type, numbers, ...extra });
  const has = (re: RegExp) => re.test(t);

  if (/^(si+|sip|dale|ok|oka|okey|listo|bueno|perfecto|joya|esta bien|de una|confirmo)$/.test(t) || /^\s*(👍|👌|✅)\s*$/u.test(raw)) return is("yes");
  if (/^(no+|nop|nah|nada|no gracias|nada gracias|nada mas)$/.test(t)) return is("no");
  if (has(/\b(cancelar|cancela|cancelalo|cancelala|olvidate|salir)\b|deja nomas|no importa/) || /^(deja|dejalo|dejala)( nomas| ahi| como esta| como estaba)?$/.test(t)) return is("cancel");
  if (has(/\b(deshacer|deshace|deshacelo|deshacela)\b/) || (has(/me equivoque|volve atras|para atras/) && !/\d/.test(c))) return is("undo");
  if (has(/\b(ayuda|ayudame)\b|como funciona|como hago|como se hace|que hago|que puedo hacer|no entiendo/) || /^\?+$/.test(raw.trim())) return is("help");

  if (has(/volvi a tener|volvio|hay de nuevo|tengo de nuevo|tengo otra vez|reponer|repone|reponela|volve a poner|volver a poner|ponela de nuevo|ponela otra vez|no se vendio|al final no (la |lo )?vendi|me la devolvieron|hice otra igual/))
    return is("restore");

  if (has(/\bfotos?\b/) && !has(/\b(vendi|vendio)\b/)) {
    const change = numbers.length > 0 || has(/\b(cambiar|cambia|cambiale|cambio|otra foto|mejor foto|foto nueva|nueva foto|esta mal|quedo mal|fea|oscura)\b/);
    return is(change ? "edit" : "add", { photo: true });
  }

  if (has(/\b(vendi|vendio|vendieron|vendimos|vendida|vendidas|vendido|sacala|sacalo|sacalas|saca|sacar|sacame|borra|borrala|borrar|borrame|quita|quitala|quitar|elimina|eliminala|eliminar|rompio|rompi|rompieron|rota|rajo|regale|entregue|compraron|llevaron)\b|no hay mas|no tengo mas|no tengo la|ya no (la |lo )?tengo|no la tengo|ya no esta|se (la |lo )?llevo|me (la |lo )?compro/)) {
    const why = has(/\b(rompio|rompi|rompieron|rota|rajo)\b/) ? "broken" : has(/\b(vendi|vendio|vendieron|vendimos|vendida|vendidas|vendido|compraron|llevaron)\b|se (la |lo )?llevo|me (la |lo )?compro/) ? "sold" : undefined;
    return is("sold", { why });
  }

  if (has(/\b(cuanto|cuanta|que precio)\b|a cuanto/)) return is("info");

  // Plata: el primer número que no sea una pieza nombrada.
  // (Un "14" o "14 y 16" a secas son piezas, no plata.)
  const rest = /^\d{1,4}(?:\s*(?:y|e)\s*\d{1,4})*$/.test(c) ? "" : joinThousands(c.replace(PIECE_REF, " "));
  const first = rest.match(/\b\d+\b/);
  const amount = first ? parseInt(first[0], 10) : null;
  const pct = rest.match(/\b(\d{1,2}) ?(?:%|por ciento)/);
  const named = has(/\b(se llama|llamala|llamalo|nombre|titulo)\b/);
  const down = has(/\b(baja|bajale|bajala|bajalo|bajar|rebaja|rebajale|rebajala|descontale|descuenta|sacale)\b/);
  const up = has(/\b(subi|subile|subila|subilo|aumenta|aumentale|aumentala|sumale)\b/);
  if (!named && (down || up) && (amount !== null || numbers.length)) {
    const sign = down ? -1 : 1;
    if (pct) return is("price", { percent: sign * parseInt(pct[1], 10) });
    if (amount === null) return is("price", { price: null });
    return new RegExp(`\\ba ${amount}\\b`).test(rest) ? is("price", { price: sane(amount) }) : is("price", { delta: sign * amount });
  }
  if (!named && amount !== null && (numbers.length || has(/\b(sale|salen|cuesta|cuestan|precio|vale|valen|pasa a|queda en|dejala en|dejalo en|cobrale|ponele)\b/)))
    return is("price", { price: sane(amount) });
  if (!named && ((numbers.length && has(/\b(sale|salen|cuesta|vale)\b/)) || has(/\bprecios?\b/))) return is("price", { price: null });

  if (named || has(/\bponele\b/)) return is("rename", { title: titleFrom(raw) });
  if (has(/\b(cambiar|cambia|cambiale|cambiala|cambio|modificar|modifica|corregir|corregi|arreglar|arregla|editar)\b|esta mal|quedo mal/)) return is("edit");
  if (has(/\b(agregar|agrega|agregame|agregale|subir|sumar|nueva|nuevo|cargar|publicar)\b|tengo otra|hice otra|hice una|hice un|otra pieza|una pieza/)) return is("add");
  if (has(/\b(lista|listado|todas)\b|que tengo|que hay|mis piezas|cuales tengo|cuantas tengo|que queda|que quedo/)) return is("list");
  if (has(/\b(pagina|link|enlace|direccion)\b|como quedo/)) return is("link");
  if (has(/\bgracias\b|^(genial|barbaro|joya|buenisimo|que bueno|un amor|sos un amor)\b/)) return is("thanks");
  if (has(/^(hola+|holis|buen dia|buenos dias|buenas|buenas tardes|buenas noches|hey|que tal|como andas|como estas)\b/)) return is("greeting");
  if (numbers.length === 1 && /^(?:(?:la|el|pieza|numero|nro|n)\s+)?\d{1,4}$/.test(c)) return is("piece");
  return is("unknown");
}

/** El nombre nuevo en "la 14 se llama jarra grande" o "ponele jarra azul a la 14". */
function titleFrom(raw: string): string | null {
  const m = raw.match(/^.*(?:se llama(?: ahora)?|ll[aá]mal[ao]|nombre|t[ií]tulo|ponele)\b\s*:?\s*(.*)$/i);
  const rest = (m?.[1] ?? "")
    .trim()
    .replace(/^(?:(?:de|a|para)\s+)?(?:la|el)\s+(?:pieza\s+)?\d{1,4}\b\s*(?:es|sea|:|,)?\s*/i, "") // "de la 14 es …"
    .replace(/\s+(?:a|de|para)\s+(?:la|el)\s+(?:pieza\s+)?\d{1,4}\s*[.!]*$/i, "") // "… a la 14"
    .replace(/^(?:es|sea|que sea|va a ser)\s+/i, "");
  // "cambiale el nombre a la tetera": dice cuál, no cómo se llama.
  if (!rest || /^(?:a|de|para)\s+(?:la|el|las|los)\b|^(?:al|del)\b/i.test(rest)) return null;
  return cleanTitle(rest) || null;
}

// ---------- Nombres y epígrafes ----------

/** "Se llama jarra blanca." → "Jarra blanca" */
export function cleanTitle(raw: string): string {
  const t = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'«“]+|["'»”]+$/g, "")
    .replace(/^(ahora\s+)?(se llama|es una?|ponele|ll[aá]mal[ao]|le pongo|el nombre es|nombre)\s*:?\s+/i, "")
    .replace(/[\s.,;:!\-–]+$/g, "")
    .trim();
  if (!t) return "";
  const clipped = t.length > 48 ? `${t.slice(0, 47).trimEnd()}…` : t;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

/** Separa "Jarra blanca 12000", "Jarra blanca doce mil" o "Taza $8.500" en nombre y precio. */
export function splitTitleAndPrice(caption: string): { title: string | null; price: number | null } {
  const words = caption.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return { title: null, price: null };
  const whole = parsePrice(words.join(" "));
  if (whole !== null) return { title: null, price: whole };
  for (let k = 1; k < words.length; k++) {
    const price = parsePrice(words.slice(k).join(" "));
    const title = cleanTitle(words.slice(0, k).join(" "));
    if (price !== null && price >= 100 && title) return { title, price };
  }
  return { title: cleanTitle(words.join(" ")) || null, price: null };
}

export const formatPrice = (n: number) => `$ ${n.toLocaleString("es-AR")}`;

// ---------- Piezas por nombre ----------

const TITLE_STOP = new Set(["de", "del", "con", "su", "sus", "para", "y", "la", "las", "el", "los", "en", "a", "un", "una", "que"]);

/** jarrita → jarr, tacitas → taza, cuenquito → cuenc, blancas → blanc, blanco → blanc */
function root(word: string): string {
  const w = word
    .replace(/s$/, "")
    .replace(/(c|qu)it([ao])$/, (_m, c: string, v: string) => (c === "c" ? "z" : "c") + v)
    .replace(/it([ao])$/, "$1");
  return w.length > 4 ? w.replace(/[aeo]$/, "") : w;
}

/**
 * Las piezas que mejor coinciden con lo que dijo: "vendí la jarrita blanca" → [Jarrita blanca].
 * Si hay empate ("la taza", y tiene tres tazas) devuelve todas las empatadas, para preguntar cuál.
 */
export function matchPieces(text: string, pieces: Piece[]): Piece[] {
  const said = new Set(normalize(text).split(" ").map(root));
  const scored = pieces
    .map((p) => ({ p, score: normalize(p.title).split(" ").filter((w) => !TITLE_STOP.has(w) && said.has(root(w))).length }))
    .filter((x) => x.score > 0);
  if (!scored.length) return [];
  const best = Math.max(...scored.map((x) => x.score));
  return scored.filter((x) => x.score === best).map((x) => x.p);
}
