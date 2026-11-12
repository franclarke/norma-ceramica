import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { interpret, suggestTitle, toCommand } from "./ai";
import type { Piece } from "../types";

const at = "2026-11-10T12:00:00.000Z";
const piece = (number: number, title: string, price: number): Piece => ({
  number, title, price, photo: { url: "/x.webp", width: 1, height: 1 }, createdAt: at, updatedAt: at,
});
const pieces = [piece(14, "Jarrita blanca", 9500), piece(23, "Tetera con su cuenquito", 21000)];

/** Un modelo falso que contesta siempre el mismo JSON. */
const replying = (json: object) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify(json) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 10, text: 10, reasoning: undefined },
      },
      warnings: [],
    }),
  });

describe("interpret", () => {
  it("lleva el nombre de una pieza a su número", async () => {
    const r = await interpret("la jarrita blanca ya no la tengo", pieces, [], replying({ action: "sold", number: 14, price: null, title: null }));
    expect(r && toCommand(r)).toBe("sacá la 14");
    expect(r && toCommand(r, "sold")).toBe("vendí la 14");
    expect(r && toCommand(r, "broken")).toBe("se rompió la 14");
  });

  it("descarta números que no existen", async () => {
    const r = await interpret("vendí la azul", pieces, [], replying({ action: "sold", number: 99, price: null, title: null }));
    expect(r?.number).toBeNull();
    expect(r && toCommand(r)).toBe("vendí una");
  });

  it("calcula un precio relativo como precio final", async () => {
    const r = await interpret("bajale dos mil a la tetera", pieces, [], replying({ action: "price", number: 23, price: 19000, title: null }));
    expect(r && toCommand(r)).toBe("la 23 ahora sale 19000");
  });

  it("si el modelo falla, sigue sin IA", async () => {
    const broken = new MockLanguageModelV4({ doGenerate: async () => { throw new Error("sin crédito"); } });
    expect(await interpret("hola", pieces, [], broken)).toBeNull();
  });

  it("si no está seguro, no inventa", async () => {
    const r = await interpret("qué lindo día", pieces, [], replying({ action: "unknown", number: null, price: null, title: null }));
    expect(r && toCommand(r)).toBeNull();
  });
});

describe("suggestTitle", () => {
  it("propone un nombre corto", async () => {
    expect(await suggestTitle(new Uint8Array([1, 2, 3]), replying({ title: "taza celeste.", isCeramic: true }))).toBe("Taza celeste");
  });
  it("no propone nada si la foto no es de cerámica", async () => {
    expect(await suggestTitle(new Uint8Array([1, 2, 3]), replying({ title: "Perro", isCeramic: false }))).toBeNull();
  });
});
