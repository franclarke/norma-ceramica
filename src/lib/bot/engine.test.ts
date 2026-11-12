import { describe, expect, it } from "vitest";
import { respond, type Result } from "./engine";
import { cleanTitle, detectIntent, isNo, isYes, matchPieces, parsePieceNumber, parsePrice, pieceNumbers, splitTitleAndPrice } from "./parse";
import { seedPieces } from "../seed";
import type { IncomingMessage, Store } from "../types";

const photo = { url: "/x.webp", width: 800, height: 1000 };
const other = { url: "/y.webp", width: 800, height: 800 };
const ctx = { now: "2026-11-12T10:00:00.000Z", siteUrl: "https://norma.test" };

function emptyStore(): Store {
  return {
    id: "t", ownerName: "Norma", contactPhone: "11 2345-6789", pieces: [], sold: [], nextNumber: 1,
    updatedAt: ctx.now, conversation: { step: "idle" }, undo: [],
  };
}

/** La tienda de la demo: 12 piezas, entre ellas tres tazas, la 14 (jarrita blanca) y la 23 (tetera). */
const shop = (): Store => ({ ...emptyStore(), pieces: seedPieces(), nextNumber: 25 });

/** Tocar el "sí" del último mensaje del bot. */
const YES = Symbol("sí");
type Said = string | IncomingMessage | typeof YES;

function talk(from: Store | Result, ...msgs: Said[]): Result {
  let last: Result = "replies" in from ? from : { store: from, replies: [] };
  for (const m of msgs) {
    let msg: IncomingMessage;
    if (m === YES) {
      const button = last.replies.flatMap((r) => r.buttons ?? []).find((b) => b.id.startsWith("ok:"));
      if (!button) throw new Error("el bot no ofreció ninguna confirmación");
      msg = { kind: "button", ...button };
    } else msg = typeof m === "string" ? { kind: "text", text: m } : m;
    last = respond(last.store, msg, ctx);
  }
  return last;
}

const said = (r: Result) => r.replies.map((m) => (m.kind === "text" ? m.text : m.caption)).join("\n");
const numbers = (r: Result) => r.store.pieces.map((p) => p.number);
const price = (r: Result, n: number) => r.store.pieces.find((p) => p.number === n)?.price;

describe("parsePrice", () => {
  it.each([
    ["12000", 12000], ["12.000", 12000], ["$ 12.000", 12000], ["$12000", 12000], ["12 mil", 12000],
    ["12mil", 12000], ["12,5 mil", 12500], ["doce mil", 12000], ["ocho mil quinientos", 8500],
    ["8 mil 500", 8500], ["15 lucas", 15000], ["1.200.000", 1200000], ["12.000,50", 12000],
    // Como llega de un audio transcripto
    ["12.000 pesos.", 12000], ["Sale doce mil pesos.", 12000], ["unos 12 mil", 12000], ["8 500", 8500],
    ["ciento veinte mil", 120000], ["treinta y cinco mil", 35000], ["mil quinientos", 1500],
  ])("%s → %d", (input, expected) => expect(parsePrice(input)).toBe(expected));

  it.each(["", "hola", "0", "mucho", "la 14", "una"])("%s → null", (input) => expect(parsePrice(input)).toBeNull());
});

describe("números de pieza", () => {
  it.each([["la 14", 14], ["14", 14], ["nº 7", 7], ["pieza catorce", 14], ["vendí la veintitrés", 23], ["es la catorce, creo", 14]])("%s → %d", (i, e) =>
    expect(parsePieceNumber(i)).toBe(e),
  );
  it("no confunde el precio con la pieza", () => {
    expect(pieceNumbers("La catorce ahora sale nueve mil.")).toEqual([14]);
    expect(pieceNumbers("bajale 2000 a la 14")).toEqual([14]);
    expect(pieceNumbers("la 14 9000")).toEqual([14]);
  });
  it("varias a la vez", () => {
    expect(pieceNumbers("vendí la 14 y la 16")).toEqual([14, 16]);
    expect(pieceNumbers("la 14, la 16 y 21")).toEqual([14, 16, 21]);
    expect(pieceNumbers("14 y 16")).toEqual([14, 16]);
  });
});

describe("detectIntent", () => {
  it.each([
    ["Vendí la 14!", { type: "sold", numbers: [14], why: "sold" }],
    ["se me rompió la tetera", { type: "sold", numbers: [], why: "broken" }],
    ["sacá la 14", { type: "sold", numbers: [14] }],
    ["la 14 ahora sale 9 mil", { type: "price", numbers: [14], price: 9000 }],
    ["La catorce ahora sale nueve mil.", { type: "price", numbers: [14], price: 9000 }],
    ["la 14 a 9000", { type: "price", numbers: [14], price: 9000 }],
    ["bajá la 14 a 9000", { type: "price", numbers: [14], price: 9000 }],
    ["bajale 2000 a la 14", { type: "price", numbers: [14], delta: -2000 }],
    ["subile 500", { type: "price", numbers: [], delta: 500 }],
    ["bajale un 10% a la tetera", { type: "price", percent: -10 }],
    ["quiero cambiar el precio", { type: "price", price: null }],
    ["cambiale el nombre a la 14", { type: "rename", numbers: [14], title: null }],
    ["cambiale el nombre a la tetera", { type: "rename", title: null }],
    ["la 14 se llama jarra grande", { type: "rename", numbers: [14], title: "Jarra grande" }],
    ["la 14 ahora se llama jarra grande", { type: "rename", numbers: [14], title: "Jarra grande" }],
    ["ponele jarra azul a la 14", { type: "rename", numbers: [14], title: "Jarra azul" }],
    ["quiero cambiar la foto de la 14", { type: "edit", numbers: [14], photo: true }],
    ["volví a tener la 3", { type: "restore", numbers: [3] }],
    ["tengo otra pieza para agregar", { type: "add" }],
    ["me equivoqué", { type: "undo" }],
    ["gracias", { type: "thanks" }],
    ["muchas gracias!", { type: "thanks" }],
    ["¿cuánto sale la 14?", { type: "info", numbers: [14] }],
    ["la 14", { type: "piece", numbers: [14] }],
    ["14", { type: "piece", numbers: [14] }],
    ["qué lindo día", { type: "unknown" }],
  ] as const)("%s", (input, expected) => expect(detectIntent(input)).toMatchObject(expected));
});

describe("sí y no", () => {
  it.each(["sí", "si", "Sí, sacala", "si dale", "sacala", "👍", "sí por favor", "sí guardalo", "dale", "ok", "publicala", "sí, no la tengo más"])("%s es sí", (s) => {
    expect(isYes(s)).toBe(true);
    expect(isNo(s)).toBe(false);
  });
  it.each(["no", "No, esa no", "mejor no", "bueno, mejor no", "nop", "todavía no", "no se vendió"])("%s es no", (s) => {
    expect(isNo(s)).toBe(true);
    expect(isYes(s)).toBe(false);
  });
  it.each(["jarra blanca", "la 16", "9000", "sifón", "no sé", "mmm no sé", "no me acuerdo"])("%s no es ni sí ni no", (s) => {
    expect(isYes(s)).toBe(false);
    expect(isNo(s)).toBe(false);
  });
});

describe("nombres", () => {
  it("título y precio", () => expect(splitTitleAndPrice("Jarra blanca 12000")).toEqual({ title: "Jarra blanca", price: 12000 }));
  it("con $ y mil", () => expect(splitTitleAndPrice("taza celeste $8.500")).toEqual({ title: "Taza celeste", price: 8500 }));
  it("precio en palabras", () => expect(splitTitleAndPrice("Jarra blanca doce mil")).toEqual({ title: "Jarra blanca", price: 12000 }));
  it("un número en el nombre no es el precio", () => expect(splitTitleAndPrice("Juego de 6 tazas 30000")).toEqual({ title: "Juego de 6 tazas", price: 30000 }));
  it("solo título", () => expect(splitTitleAndPrice("florero alto")).toEqual({ title: "Florero alto", price: null }));
  it("dicho en un audio", () => expect(cleanTitle("Se llama jarra blanca.")).toBe("Jarra blanca"));

  const titles = (text: string) => matchPieces(text, seedPieces()).map((p) => p.number);
  it("encuentra una pieza por cómo le dice", () => {
    expect(titles("vendí la jarrita blanca")).toEqual([14]);
    expect(titles("se me rompió la tetera")).toEqual([23]);
    expect(titles("la del pajarito")).toEqual([24]);
    expect(titles("el florero azul")).toEqual([3]);
  });
  it("si hay varias parecidas, las devuelve todas", () => expect(titles("vendí la taza")).toEqual([21, 16, 11]));
  it("si no nombra ninguna, nada", () => expect(titles("vendí una")).toEqual([]));
});

describe("agregar una pieza", () => {
  it("paso a paso", () => {
    const r = talk(emptyStore(), "hola", { kind: "button", id: "menu:add", title: "Agregar" }, { kind: "image", photo }, "jarra blanca", "12 mil", YES);
    expect(r.store.pieces[0]).toMatchObject({ number: 1, title: "Jarra blanca", price: 12000 });
    expect(r.store.nextNumber).toBe(2);
    expect(r.store.conversation.step).toBe("idle");
    expect(r.touched).toBe(1);
  });

  it("le manda cómo quedó", () => {
    const r = talk(emptyStore(), { kind: "image", photo, caption: "Taza celeste 8500" }, YES);
    const last = r.replies.at(-1)!;
    expect(last.kind === "image" && last.photo.url).toMatch(/^\/api\/tablilla\/t\/1\?v=/);
  });

  it("con epígrafe en un solo mensaje, y un sí escrito", () => {
    const r = talk(emptyStore(), { kind: "image", photo, caption: "Taza celeste 8500" });
    expect(r.store.conversation.step).toBe("add:confirm");
    expect(r.replies[0].kind).toBe("image");
    expect(talk(r.store, "si").store.pieces[0]).toMatchObject({ title: "Taza celeste", price: 8500 });
  });

  it("dictado en audios", () => {
    const r = talk(emptyStore(), { kind: "image", photo }, "Se llama jarra blanca.", "Sale doce mil pesos.");
    expect(r.store.conversation).toMatchObject({ step: "add:confirm", draft: { title: "Jarra blanca", price: 12000 } });
  });

  it("el nombre y el precio antes que la foto", () => {
    let r = talk(shop(), "jarra blanca 12000");
    expect(r.store.conversation).toMatchObject({ step: "add:photo", draft: { title: "Jarra blanca", price: 12000 } });
    r = talk(r.store, { kind: "image", photo });
    expect(r.store.conversation.step).toBe("add:confirm");
  });

  it("corrige el precio o el nombre antes de publicar, sin botones", () => {
    let r = talk(emptyStore(), { kind: "image", photo, caption: "Jarra 12000" }, "no, sale 9000");
    expect(r.store.conversation).toMatchObject({ step: "add:confirm", draft: { price: 9000 } });
    r = talk(r.store, "se llama jarra grande", YES);
    expect(r.store.pieces[0]).toMatchObject({ title: "Jarra grande", price: 9000 });
  });

  it("no toma un saludo, un sí o un no como nombre", () => {
    for (const word of ["hola", "dale", "no", "no sé", "gracias", "12000"]) {
      const r = talk(emptyStore(), { kind: "image", photo }, word);
      expect(r.store.conversation.step, word).toBe("add:title");
    }
  });

  it("avisa si la foto está oscura; sí es mandar otra, no es usar esa", () => {
    const dark = talk(emptyStore(), { kind: "image", photo, caption: "Cuenco 6000", dark: true });
    expect(dark.store.conversation.step).toBe("add:dark-photo");
    expect(talk(dark.store, { kind: "button", id: "photo:keep", title: "Usar esta" }).store.conversation.step).toBe("add:confirm");
    expect(talk(dark.store, "no, usá esa").store.conversation.step).toBe("add:confirm");
    const retry = talk(dark.store, "sí");
    expect(retry.store.conversation).toMatchObject({ step: "add:photo", draft: { title: "Cuenco", price: 6000 } });
    expect(talk(retry.store, { kind: "image", photo: other }).store.conversation).toMatchObject({ step: "add:confirm", draft: { photo: other } });
  });

  it("varias fotos juntas: las carga de a una", () => {
    let r = talk(emptyStore(), { kind: "image", photo }, { kind: "image", photo: other, caption: "Taza 5000" });
    expect(r.store.conversation.step).toBe("add:title");
    expect(r.store.queue).toHaveLength(1);
    r = talk(r.store, "Jarra", "8000", YES);
    expect(r.store.pieces.map((p) => p.title)).toEqual(["Jarra"]);
    // Sigue sola con la segunda foto, mostrándosela.
    expect(r.store.conversation).toMatchObject({ step: "add:confirm", draft: { photo: other, title: "Taza", price: 5000 } });
    expect(r.store.queue).toBeUndefined();
    r = talk(r, YES);
    expect(r.store.pieces.map((p) => p.number)).toEqual([2, 1]);
  });

  it("no reutiliza números", () => {
    const r = talk(emptyStore(), { kind: "image", photo, caption: "Jarra 1000" }, YES, "vendí la 1", YES, { kind: "image", photo, caption: "Bol 2000" }, YES);
    expect(numbers(r)).toEqual([2]);
  });

  it("cancelar en medio de un alta", () => {
    const r = talk(emptyStore(), { kind: "image", photo }, "cancelar");
    expect(r.store.conversation.step).toBe("idle");
    expect(r.store.pieces).toHaveLength(0);
  });

  it("un botón de un mensaje viejo no hace perder lo que estaba cargando", () => {
    const r = talk(emptyStore(), { kind: "image", photo }, { kind: "button", id: "ok:sold:14", title: "Sí, sacarla" });
    expect(r.store.conversation).toMatchObject({ step: "add:title", draft: { photo } });
  });
});

describe("nombre sugerido por la foto", () => {
  const suggested: IncomingMessage = { kind: "image", photo, suggestedTitle: "Taza celeste" };
  it("lo acepta con un toque", () => {
    let r = talk(emptyStore(), suggested);
    expect(said(r)).toMatch(/Taza celeste/);
    r = talk(r.store, { kind: "button", id: "title:accept", title: "Sí, ponele ese" });
    expect(r.store.conversation.step).toBe("add:price");
    expect(talk(r.store, "8500", YES).store.pieces[0]).toMatchObject({ title: "Taza celeste", price: 8500 });
  });
  it("o diciendo que sí", () => expect(talk(emptyStore(), suggested, "sí, ponele ese").store.conversation).toMatchObject({ step: "add:price", draft: { title: "Taza celeste" } }));
  it("o escribe otro nombre", () => expect(talk(emptyStore(), suggested, "taza de mi abuela", "9000", YES).store.pieces[0].title).toBe("Taza de mi abuela"));
  it("si dice que no, le pregunta cómo se llama", () => {
    const r = talk(emptyStore(), suggested, "no");
    expect(r.store.conversation).toMatchObject({ step: "add:title" });
    expect(said(r)).not.toMatch(/Taza celeste/);
  });
});

describe("vender", () => {
  it.each(["sí", "sí, sacala", "si dale", "sacala", "👍", "sí por favor", "dale"])("confirma con «%s»", (yes) => {
    const r = talk(shop(), "vendí la 14", yes);
    expect(numbers(r)).not.toContain(14);
    expect(r.store.sold.map((p) => p.number)).toEqual([14]);
  });

  it.each(["no", "no, esa no", "mejor no", "bueno, mejor no"])("se arrepiente con «%s»", (no) => {
    const r = talk(shop(), "vendí la 14", no);
    expect(numbers(r)).toContain(14);
    expect(r.store.conversation.step).toBe("idle");
  });

  it("si no entiende la respuesta, vuelve a preguntar sin tocar nada", () => {
    const r = talk(shop(), "vendí la 14", "mañana viene mi hija");
    expect(r.store.conversation).toMatchObject({ step: "sold:confirm", numbers: [14] });
    expect(r.missed).toBe("all");
  });

  it("por nombre", () => expect(talk(shop(), "vendí la jarrita blanca").store.conversation).toMatchObject({ step: "sold:confirm", numbers: [14] }));

  it("si el nombre coincide con varias, pregunta cuál y entiende el detalle", () => {
    let r = talk(shop(), "vendí la taza");
    expect(r.store.conversation).toMatchObject({ step: "sold:number", options: [21, 16, 11] });
    expect(r.replies[0].buttons?.map((b) => b.title)).toEqual(["21 · Taza verde sal…", "16 · Taza moteada", "11 · Par de tazas b…"]);
    expect(r.replies[0].buttons?.every((b) => b.title.length <= 20)).toBe(true);
    r = talk(r.store, "la verde");
    expect(r.store.conversation).toMatchObject({ step: "sold:confirm", numbers: [21] });
    expect(talk(talk(shop(), "vendí la taza").store, { kind: "button", id: "pick:16", title: "La 16" }).store.conversation).toMatchObject({ numbers: [16] });
  });

  it("dos a la vez", () => {
    const r = talk(shop(), "vendí la 14 y la 16", YES);
    expect(numbers(r)).not.toContain(14);
    expect(numbers(r)).not.toContain(16);
    expect(said(r)).toMatch(/la 14 y la 16/);
    expect(numbers(talk(r.store, "deshacer"))).toHaveLength(12);
  });

  it("se corrige en la confirmación", () => {
    expect(talk(shop(), "vendí la 14", "no, la que vendí es la 16").store.conversation).toMatchObject({ step: "sold:confirm", numbers: [16] });
    expect(talk(shop(), "vendí la 14", "sí, y la 16 también").store.conversation).toMatchObject({ step: "sold:confirm", numbers: [14, 16] });
  });

  it("no festeja una pieza rota", () => {
    const r = talk(shop(), "se me rompió la tetera", YES);
    expect(numbers(r)).not.toContain(23);
    expect(said(r)).toMatch(/lástima/);
    expect(said(r)).not.toMatch(/bueno que se vendió/);
  });

  it("número inexistente: avisa y espera otro", () => {
    const r = talk(shop(), "vendí la 99");
    expect(said(r)).toMatch(/99/);
    expect(talk(r.store, "la 14").store.conversation).toMatchObject({ step: "sold:confirm", numbers: [14] });
  });

  it("un sí de otra confirmación no saca nada", () => {
    const r = talk(shop(), "vendí la 14", { kind: "button", id: "ok:edit:14", title: "Sí, guardar" });
    expect(numbers(r)).toContain(14);
    expect(r.store.conversation.step).toBe("sold:confirm");
  });

  it("vende, deshace y vuelve a poner", () => {
    let r = talk(shop(), "vendí la 14", YES, "deshacer");
    expect(numbers(r)).toContain(14);
    r = talk(r.store, "vendí la 14", YES, "volví a tener la 14", YES);
    expect(numbers(r)).toContain(14);
    expect(r.store.sold).toHaveLength(0);
  });

  it("volver a poner sin decir cuál: le muestra las que sacó", () => {
    let r = talk(shop(), "vendí la 14", YES, "al final no la vendí");
    expect(r.store.conversation.step).toBe("restore:number");
    expect(said(r)).toMatch(/Jarrita blanca/);
    r = talk(r.store, "la jarrita", YES);
    expect(numbers(r)).toContain(14);
  });
});

describe("cambiar", () => {
  it.each([
    ["la 14 ahora sale 9000", 9000],
    ["La catorce ahora sale nueve mil.", 9000],
    ["la 14 a 9000", 9000],
    ["bajale 2000 a la 14", 7500],
    ["subile mil a la jarrita blanca", 10500],
    ["la jarrita blanca ahora sale 9 mil", 9000],
    ["bajale un 10% a la 14", 8550],
  ])("%s", (message, expected) => {
    const r = talk(shop(), message);
    expect(r.store.conversation).toMatchObject({ step: "edit:confirm", number: 14, draft: { price: expected } });
    expect(said(r)).toMatch(/antes \$ 9\.500/);
    expect(price(talk(r, YES), 14)).toBe(expected);
  });

  it("guarda con un sí escrito y no cancela si no entiende", () => {
    expect(price(talk(shop(), "la 14 ahora sale 9000", "sí guardalo"), 14)).toBe(9000);
    const r = talk(shop(), "la 14 ahora sale 9000", "ay, no");
    expect(r.store.conversation.step).toBe("idle");
    expect(price(r, 14)).toBe(9500);
    // Una duda o algo que no entiende no es un no: lo pendiente sigue ahí.
    expect(talk(shop(), "la 14 ahora sale 9000", "mmm no sé").store.conversation.step).toBe("edit:confirm");
    expect(talk(shop(), "la 14 ahora sale 9000", "mañana te digo, que me llaman").store.conversation.step).toBe("edit:confirm");
  });

  it("corrige el monto o la pieza en la confirmación", () => {
    expect(talk(shop(), "la 14 ahora sale 9000", "no, 8500").store.conversation).toMatchObject({ step: "edit:confirm", number: 14, draft: { price: 8500 } });
    expect(talk(shop(), "la 14 ahora sale 9000", "no, la 16").store.conversation).toMatchObject({ step: "edit:confirm", number: 16, draft: { price: 9000 } });
  });

  it("le cambia el nombre", () => {
    expect(talk(shop(), "cambiale el nombre a la 14").store.conversation).toMatchObject({ step: "edit:title", number: 14 });
    const r = talk(shop(), "cambiale el nombre a la 14", "Jarra chica", YES);
    expect(r.store.pieces.find((p) => p.number === 14)?.title).toBe("Jarra chica");
    expect(talk(shop(), "la tetera ahora se llama tetera grande").store.conversation).toMatchObject({ step: "edit:confirm", number: 23, draft: { title: "Tetera grande" } });
  });

  it("cambia la foto mandando foto con el número", () => {
    const r = talk(shop(), { kind: "image", photo: other, caption: "la 14" }, YES);
    expect(r.store.pieces.find((p) => p.number === 14)?.photo.url).toBe("/y.webp");
  });

  it("si no dice cuál, pregunta y recuerda el cambio", () => {
    let r = talk(shop(), "quiero cambiar el precio");
    expect(r.store.conversation).toMatchObject({ step: "edit:number", change: { kind: "price" } });
    r = talk(r.store, "la tetera");
    expect(r.store.conversation).toMatchObject({ step: "edit:price", number: 23 });
    expect(talk(r.store, "veinte mil").store.conversation).toMatchObject({ step: "edit:confirm", number: 23, draft: { price: 20000 } });
  });

  it("si el precio ya es ese, no molesta", () => {
    const r = talk(shop(), "la 14 sale 9500");
    expect(r.store.conversation.step).toBe("idle");
    expect(said(r)).toMatch(/ya está así/);
  });
});

describe("una pieza sola", () => {
  it("«la 14» la muestra, y lo que diga después es sobre esa", () => {
    const r = talk(shop(), "la 14");
    expect(r.store.conversation).toMatchObject({ step: "piece", number: 14 });
    expect(r.replies[0].buttons?.map((b) => b.id)).toEqual(["sold:14", "edit:14"]);
    expect(talk(r.store, "ahora sale 9000").store.conversation).toMatchObject({ step: "edit:confirm", number: 14, draft: { price: 9000 } });
    expect(talk(r.store, "9000").store.conversation).toMatchObject({ step: "edit:confirm", number: 14, draft: { price: 9000 } });
    expect(talk(r.store, "la vendí").store.conversation).toMatchObject({ step: "sold:confirm", numbers: [14] });
    expect(talk(r.store, "la foto").store.conversation).toMatchObject({ step: "edit:photo", number: 14 });
    expect(talk(r.store, { kind: "button", id: "sold:14", title: "La vendí" }).store.conversation).toMatchObject({ step: "sold:confirm", numbers: [14] });
    expect(talk(r.store, { kind: "button", id: "edit:14", title: "Cambiar algo" }).store.conversation).toMatchObject({ step: "edit:what", number: 14 });
  });

  it("por nombre o preguntando el precio", () => {
    expect(talk(shop(), "la tetera").store.conversation).toMatchObject({ step: "piece", number: 23 });
    expect(talk(shop(), "¿cuánto sale la tetera?").store.conversation).toMatchObject({ step: "piece", number: 23 });
  });

  it("en «¿qué le cambio?» entiende sin botones", () => {
    const r = talk(shop(), "quiero cambiar la 14");
    expect(r.store.conversation).toMatchObject({ step: "edit:what", number: 14 });
    expect(talk(r.store, "el precio").store.conversation).toMatchObject({ step: "edit:price", number: 14 });
    expect(talk(r.store, "el nombre").store.conversation).toMatchObject({ step: "edit:title", number: 14 });
    expect(talk(r.store, "ponele 9000").store.conversation).toMatchObject({ step: "edit:confirm", draft: { price: 9000 } });
    expect(talk(r.store, { kind: "image", photo: other }).store.conversation).toMatchObject({ step: "edit:confirm", number: 14, draft: { photo: other } });
  });
});

describe("en medio de una cosa pide otra", () => {
  it("esperando una foto, avisa que vendió", () => {
    const r = talk(shop(), "tengo otra pieza para agregar");
    expect(r.store.conversation.step).toBe("add:photo");
    expect(talk(r.store, "vendí la 14").store.conversation).toMatchObject({ step: "sold:confirm", numbers: [14] });
    expect(talk(r.store, "vendí la tetera").store.conversation).toMatchObject({ step: "sold:confirm", numbers: [23] });
  });
  it("«me equivoqué» con algo a medias lo deja, sin deshacer lo anterior", () => {
    const base = talk(shop(), "vendí la 14", YES).store;
    const r = talk(base, "la 16 ahora sale 100", "me equivoqué");
    expect(r.store.conversation.step).toBe("idle");
    expect(r.store.undo).toHaveLength(1);
    expect(numbers(r)).not.toContain(14);
  });
  it("no queda atrapada en «¿cuál es?»", () => {
    const asked = talk(shop(), { kind: "button", id: "menu:sold", title: "Vendí una" });
    expect(said(talk(asked, "gracias"))).toMatch(/De nada/);
    expect(talk(asked, "mejor agrego otra pieza").store.conversation.step).toBe("add:photo");
    // Si no se acuerda el número, le manda todas y sigue esperando.
    const all = talk(asked, "no me acuerdo el número");
    expect(said(all)).toMatch(/Tetera con su cuenquito/);
    expect(all.store.conversation.step).toBe("sold:number");
    // A la segunda vez que no entiende, suelta.
    expect(talk(asked, "xyz", "xyz").store.conversation.step).toBe("idle");
  });
  it("un precio suelto: pregunta de cuál", () => {
    const r = talk(shop(), "9000");
    expect(r.store.conversation).toMatchObject({ step: "edit:number", change: { kind: "price", price: 9000 } });
    expect(talk(r, "la jarrita").store.conversation).toMatchObject({ step: "edit:confirm", number: 14, draft: { price: 9000 } });
  });
  it("«la blanca», y hay varias: las muestra para elegir", () => {
    const r = talk(shop(), "la blanca");
    expect(said(r)).toMatch(/Jarrita blanca/);
    expect(r.missed).toBeFalsy();
  });
  it("vender una que ya sacó no la deja esperando", () => {
    const r = talk(shop(), "vendí la 14", YES, "vendí la 14");
    expect(said(r)).toMatch(/ya la habías sacado/);
    expect(r.store.conversation.step).toBe("idle");
  });
  it("pide la lista sin perder lo pendiente", () => {
    const r = talk(shop(), { kind: "button", id: "menu:sold", title: "Vendí una" }, "lista");
    expect(said(r)).toMatch(/Jarrita blanca/);
    expect(r.store.conversation.step).toBe("sold:number");
  });
});

describe("charla", () => {
  it("agradece sin mandarle el menú", () => {
    const r = talk(shop(), "muchas gracias");
    expect(said(r)).toMatch(/De nada/);
    expect(r.replies[0].buttons).toBeUndefined();
    expect(r.missed).toBeFalsy();
  });
  it.each(["ok", "listo", "dale", "no", "nada"])("«%s» sin nada pendiente no es un error", (word) => expect(said(talk(shop(), word))).not.toMatch(/no te entendí/));
  it("cuando no entiende, lo dice, ofrece el menú y pide ayuda a la IA", () => {
    const r = talk(shop(), "qué lindo día");
    expect(r.replies[0].buttons).toHaveLength(3);
    expect(r.missed).toBe("all");
  });
  it("sin piezas no pregunta cuál vendió", () => expect(said(talk(emptyStore(), "vendí una"))).toMatch(/no tenés piezas/));
  it("un paso guardado con el formato viejo no la deja trabada", () => {
    const old = { ...shop(), conversation: { step: "sold:confirm", number: 14 } as unknown as Store["conversation"] };
    expect(talk(old, "hola").replies[0].buttons).toHaveLength(3);
  });
});
