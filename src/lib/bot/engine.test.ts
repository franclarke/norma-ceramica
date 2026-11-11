import { describe, expect, it } from "vitest";
import { respond } from "./engine";
import { detectIntent, parsePieceNumber, parsePrice, splitTitleAndPrice } from "./parse";
import type { IncomingMessage, Store } from "../types";

const photo = { url: "/x.webp", width: 800, height: 1000 };
const ctx = { now: "2026-11-12T10:00:00.000Z", siteUrl: "https://norma.test" };

function emptyStore(): Store {
  return {
    id: "t", ownerName: "Norma", contactPhone: "11 2345-6789", pieces: [], sold: [], nextNumber: 1,
    updatedAt: ctx.now, conversation: { step: "idle" }, undo: [],
  };
}

function talk(store: Store, ...msgs: (string | IncomingMessage)[]) {
  let s = store;
  let last: ReturnType<typeof respond> | null = null;
  for (const m of msgs) {
    last = respond(s, typeof m === "string" ? { kind: "text", text: m } : m, ctx);
    s = last.store;
  }
  return last!;
}

const yes: IncomingMessage = { kind: "button", id: "confirm:yes", title: "Sí" };

describe("parsePrice", () => {
  it.each([
    ["12000", 12000], ["12.000", 12000], ["$ 12.000", 12000], ["$12000", 12000], ["12 mil", 12000],
    ["12mil", 12000], ["12,5 mil", 12500], ["doce mil", 12000], ["ocho mil quinientos", 8500],
    ["8 mil 500", 8500], ["15 lucas", 15000], ["1.200.000", 1200000], ["12.000,50", 12001],
  ])("%s → %d", (input, expected) => expect(parsePrice(input)).toBe(expected));

  it.each(["", "hola", "0", "mucho"])("%s → null", (input) => expect(parsePrice(input)).toBeNull());
});

describe("parsePieceNumber", () => {
  it.each([["la 14", 14], ["14", 14], ["nº 7", 7], ["pieza catorce", 14], ["vendí la veintitrés", 23]])("%s → %d", (i, e) =>
    expect(parsePieceNumber(i)).toBe(e),
  );
});

describe("detectIntent", () => {
  it("vendí", () => expect(detectIntent("Vendí la 14!")).toEqual({ type: "sold", number: 14 }));
  it("precio", () => expect(detectIntent("la 14 ahora sale 9 mil")).toEqual({ type: "price", number: 14, price: 9000 }));
  it("volvió", () => expect(detectIntent("volví a tener la 3")).toEqual({ type: "restore", number: 3 }));
  it("deshacer", () => expect(detectIntent("me equivoqué")).toEqual({ type: "undo" }));
});

describe("splitTitleAndPrice", () => {
  it("título y precio", () => expect(splitTitleAndPrice("Jarra blanca 12000")).toEqual({ title: "Jarra blanca", price: 12000 }));
  it("con $ y mil", () => expect(splitTitleAndPrice("taza celeste $8.500")).toEqual({ title: "Taza celeste", price: 8500 }));
  it("solo título", () => expect(splitTitleAndPrice("florero alto")).toEqual({ title: "Florero alto", price: null }));
});

describe("conversación", () => {
  it("agrega una pieza paso a paso", () => {
    const r = talk(emptyStore(), "hola", { kind: "button", id: "menu:add", title: "Agregar" }, { kind: "image", photo }, "jarra blanca", "12 mil", yes);
    expect(r.store.pieces).toHaveLength(1);
    expect(r.store.pieces[0]).toMatchObject({ number: 1, title: "Jarra blanca", price: 12000 });
    expect(r.store.nextNumber).toBe(2);
    expect(r.store.conversation.step).toBe("idle");
  });

  it("agrega con epígrafe en un solo mensaje", () => {
    const r = talk(emptyStore(), { kind: "image", photo, caption: "Taza celeste 8500" });
    expect(r.store.conversation.step).toBe("add:confirm");
    expect(r.replies[0].kind).toBe("image");
    const done = respond(r.store, { kind: "text", text: "si" }, ctx);
    expect(done.store.pieces[0]).toMatchObject({ title: "Taza celeste", price: 8500 });
  });

  it("avisa si la foto está oscura y deja usarla igual", () => {
    let r = talk(emptyStore(), { kind: "image", photo, caption: "Cuenco 6000", dark: true });
    expect(r.store.conversation.step).toBe("add:dark-photo");
    r = respond(r.store, { kind: "button", id: "photo:keep", title: "Usar esta" }, ctx);
    expect(r.store.conversation.step).toBe("add:confirm");
  });

  it("vende, deshace y vuelve a poner", () => {
    const base = talk(emptyStore(), { kind: "image", photo, caption: "Jarra 12000" }, yes).store;
    let r = talk(base, "vendí la 1", yes);
    expect(r.store.pieces).toHaveLength(0);
    expect(r.store.sold).toHaveLength(1);
    r = respond(r.store, { kind: "text", text: "deshacer" }, ctx);
    expect(r.store.pieces).toHaveLength(1);
    r = talk(r.store, "vendí la 1", yes, "volví a tener la 1", yes);
    expect(r.store.pieces.map((p) => p.number)).toEqual([1]);
  });

  it("cambia el precio en un mensaje", () => {
    const base = talk(emptyStore(), { kind: "image", photo, caption: "Jarra 12000" }, yes).store;
    const r = talk(base, "la 1 ahora sale 9500", yes);
    expect(r.store.pieces[0].price).toBe(9500);
  });

  it("cambia la foto mandando foto con el número", () => {
    const base = talk(emptyStore(), { kind: "image", photo, caption: "Jarra 12000" }, yes).store;
    const other = { url: "/y.webp", width: 800, height: 800 };
    const r = talk(base, { kind: "image", photo: other, caption: "la 1" }, yes);
    expect(r.store.pieces[0].photo.url).toBe("/y.webp");
  });

  it("no reutiliza números", () => {
    const a = talk(emptyStore(), { kind: "image", photo, caption: "A 1000" }, yes, "vendí la 1", yes);
    const b = talk(a.store, { kind: "image", photo, caption: "B 2000" }, yes);
    expect(b.store.pieces[0].number).toBe(2);
  });

  it("responde algo útil cuando no entiende", () => {
    const r = talk(emptyStore(), "qwerty");
    expect(r.replies[0].kind).toBe("text");
    expect((r.replies[0] as { buttons?: unknown[] }).buttons).toHaveLength(3);
  });

  it("cancelar en medio de un alta", () => {
    const r = talk(emptyStore(), { kind: "image", photo }, "cancelar");
    expect(r.store.conversation.step).toBe("idle");
    expect(r.store.pieces).toHaveLength(0);
  });

  it("número inexistente", () => {
    const r = talk(emptyStore(), "vendí la 99");
    expect(r.store.conversation.step).toBe("idle");
    expect((r.replies[0] as { text: string }).text).toMatch(/99/);
  });
});
