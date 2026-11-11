// Interpretación de lo que escribe Norma. Todo determinístico: nada de IA,
// así cada respuesta es predecible y siempre pasa por una confirmación.

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¡!¿?.,;:()"'*_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

/** "ocho mil quinientos" → 8500. Devuelve null si no son todas palabras numéricas. */
export function parseNumberWords(text: string): number | null {
  const words = normalize(text).split(" ").filter((w) => w && w !== "y");
  if (!words.length) return null;
  let total = 0;
  let current = 0;
  let seen = false;
  for (const w of words) {
    if (w in UNITS) {
      current += UNITS[w];
      seen = true;
    } else if (w === "mil") {
      total += (current || 1) * 1000;
      current = 0;
      seen = true;
    } else if (w === "millon" || w === "millones") {
      total += (current || 1) * 1_000_000;
      current = 0;
      seen = true;
    } else {
      return null;
    }
  }
  return seen ? total + current : null;
}

/**
 * Precio en pesos. Acepta: "12000", "12.000", "$ 12.000", "12 mil", "12mil", "12,5 mil",
 * "doce mil", "8 mil 500", "12 lucas". Devuelve null si no hay un precio claro.
 */
export function parsePrice(text: string): number | null {
  let t = text.toLowerCase().replace(/\$|pesos?|ars/g, " ").replace(/lucas?/g, "mil").trim();
  t = t.replace(/\s+/g, " ");
  if (!t) return null;

  // "12,5 mil" / "12.5 mil" / "12 mil" / "12 mil 500"
  const mil = t.match(/^(\d+(?:[.,]\d+)?)\s*mil(?:\s+(\d{1,3}))?$/);
  if (mil) {
    const base = Math.round(parseFloat(mil[1].replace(",", ".")) * 1000);
    return sane(base + (mil[2] ? parseInt(mil[2], 10) : 0));
  }
  // "12.000" / "12000" / "1.200.000"
  const digits = t.match(/^\d{1,3}(?:\.\d{3})+$|^\d+$/);
  if (digits) return sane(parseInt(t.replace(/\./g, ""), 10));
  // "12.000,50" → redondea
  const decimal = t.match(/^(\d{1,3}(?:\.\d{3})*|\d+),(\d{1,2})$/);
  if (decimal) return sane(Math.round(parseFloat(`${decimal[1].replace(/\./g, "")}.${decimal[2]}`)));
  // Palabras: "doce mil", "ocho mil quinientos"
  const words = parseNumberWords(t);
  if (words !== null) return sane(words);
  return null;
}

const sane = (n: number) => (Number.isFinite(n) && n >= 1 && n <= 100_000_000 ? n : null);

/** Busca un número de pieza: "la 14", "14", "nº 14", "pieza catorce". */
export function parsePieceNumber(text: string): number | null {
  const n = normalize(text).replace(/\bn(?:ro|um|umero|o|º)?\b/g, " ");
  const digits = n.match(/\b(\d{1,4})\b/);
  if (digits) return parseInt(digits[1], 10);
  const words = n.split(" ").filter((w) => w in UNITS || w === "y");
  if (words.length) {
    const v = parseNumberWords(words.join(" "));
    if (v !== null && v > 0) return v;
  }
  return null;
}

export type Intent =
  | { type: "greeting" }
  | { type: "help" }
  | { type: "menu:add" }
  | { type: "sold"; number: number | null }
  | { type: "restore"; number: number | null }
  | { type: "price"; number: number | null; price: number | null }
  | { type: "rename"; number: number | null; title: string | null }
  | { type: "edit"; number: number | null }
  | { type: "undo" }
  | { type: "list" }
  | { type: "link" }
  | { type: "yes" }
  | { type: "no" }
  | { type: "cancel" }
  | { type: "unknown" };

const has = (t: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(t));

/** Qué quiere hacer Norma cuando no estamos esperando nada en particular. */
export function detectIntent(raw: string): Intent {
  const t = normalize(raw);
  if (!t) return { type: "unknown" };

  if (/^(si|sii+|dale|ok|okey|listo|bueno|perfecto|esta bien|de una|publicar|publicala|si publicala|confirmo)$/.test(t)) return { type: "yes" };
  if (/^(no|nop|noo+|no gracias)$/.test(t)) return { type: "no" };
  if (has(t, "cancelar", "cancela", "deja", "dejalo", "olvidate", "salir", "nada")) return { type: "cancel" };
  if (has(t, "deshacer", "deshace", "deshacelo") || /me equivoque|volve atras|para atras/.test(t)) return { type: "undo" };
  if (has(t, "ayuda", "ayudame", "como funciona", "que hago") || /^(\?+)$/.test(raw.trim())) return { type: "help" };

  const number = parsePieceNumber(t);

  if (/volvi a tener|volvio|hay de nuevo|tengo de nuevo|tengo otra|reponer|repone|volve a poner|volver a poner|ponela de nuevo/.test(t))
    return { type: "restore", number };
  if (/\b(vendi|vendida|vendido|se vendio|ya vendi|sacala|saca|sacar|borra|borrala|borrar|quita|quitala|quitar|elimina|eliminar|no hay mas|ya no tengo|se rompio)\b/.test(t))
    return { type: "sold", number };

  if (number !== null && /\b(sale|cuesta|precio|vale|ahora)\b/.test(t)) {
    const priceMatch = raw.toLowerCase().match(/.*\b(?:sale|cuesta|precio|vale|ahora)\b\s*(?:a\s+|en\s+|es\s+)?(.+)$/);
    const after = priceMatch ? priceMatch[1] : "";
    const price = parsePrice(after.replace(/[!¡.]+$/, "").trim());
    return { type: "price", number, price };
  }
  if (/\b(se llama|nombre|titulo|ponele|cambiale el nombre)\b/.test(t)) {
    const m = raw.match(/(?:se llama|nombre|t[ií]tulo|ponele)\s*:?\s*(.+)$/i);
    return { type: "rename", number, title: m ? cleanTitle(m[1]) : null };
  }
  if (/\b(cambiar|cambia|cambiale|modificar|corregir|arreglar|editar)\b/.test(t)) return { type: "edit", number };
  if (/\b(agregar|agrega|subir|sumar|nueva|nuevo|cargar|publicar)\b/.test(t)) return { type: "menu:add" };
  if (/\b(lista|que tengo|que hay|mis piezas|cuales tengo)\b/.test(t)) return { type: "list" };
  if (/\b(pagina|link|enlace|direccion|como quedo|ver)\b/.test(t)) return { type: "link" };
  if (/^(hola|buen dia|buenos dias|buenas|buenas tardes|buenas noches|hey|holis|que tal)/.test(t)) return { type: "greeting" };
  return { type: "unknown" };
}

/** "jarra blanca" → "Jarra blanca". Quita precio si vino pegado. */
export function cleanTitle(raw: string): string {
  const t = raw.replace(/\s+/g, " ").replace(/^["'«“]+|["'»”]+$/g, "").trim();
  if (!t) return "";
  const clipped = t.length > 48 ? `${t.slice(0, 47).trimEnd()}…` : t;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

/** Separa un epígrafe tipo "Jarra blanca 12000" o "Jarra blanca $12.000" en título y precio. */
export function splitTitleAndPrice(caption: string): { title: string | null; price: number | null } {
  const c = caption.replace(/\s+/g, " ").trim();
  if (!c) return { title: null, price: null };
  const m = c.match(/^(.*?)[\s,:-]*(\$?\s*\d[\d.,]*(?:\s*(?:mil|lucas?))?(?:\s+\d{1,3})?\s*(?:pesos)?)$/i);
  if (m && m[1].trim()) {
    const price = parsePrice(m[2]);
    if (price !== null) return { title: cleanTitle(m[1]), price };
  }
  const onlyPrice = parsePrice(c);
  if (onlyPrice !== null) return { title: null, price: onlyPrice };
  return { title: cleanTitle(c), price: null };
}

export const formatPrice = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
