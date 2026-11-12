import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { aiAvailable, interpret, suggestTitle, toCommand, transcribeVoice } from "./ai";
import { seedPieces } from "../seed";

// Prueba contra los modelos reales del AI Gateway. Gasta centavos: corre solo con AI_LIVE=1.
// AI_LIVE=1 AUDIO=<ruta a un .wav> npx vitest run src/lib/bot/ai.live.test.ts
const live = process.env.AI_LIVE === "1";
const pieces = seedPieces();

describe.runIf(live)("IA real", () => {
  it("hay crédito", async () => {
    expect(await aiAvailable()).toBe(true);
  });

  it("entiende a Norma con sus palabras", async () => {
    const cases: [string, string][] = [
      ["la jarrita blanca ya no la tengo", "vendí la 14"],
      ["bajale dos mil a la tetera", "la 23 ahora sale 19000"],
      ["se me rompió el florerito azul", "vendí la 3"],
      ["¿qué tengo publicado?", "lista"],
    ];
    for (const [text, expected] of cases) {
      const r = await interpret(text, pieces, []);
      expect(r && toCommand(r), text).toBe(expected);
    }
  }, 60_000);

  it("propone un nombre mirando la foto", async () => {
    const title = await suggestTitle(new URL("https://norma-ceramica.vercel.app/piezas/07.webp"));
    console.log("nombre sugerido:", title);
    expect(title).toBeTruthy();
  }, 30_000);

  it.runIf(Boolean(process.env.AUDIO))("transcribe un audio", async () => {
    const text = await transcribeVoice(new Uint8Array(await readFile(process.env.AUDIO!)));
    console.log("transcripción:", text);
    expect(text?.toLowerCase()).toContain("jarrita");
    const r = await interpret(text!, pieces, []);
    expect(r && toCommand(r)).toBe("vendí la 14");
  }, 60_000);
});
