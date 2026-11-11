import type { Piece, Store } from "./types";

// Piezas de ejemplo para la demo. Las fotos son reales (Unsplash / Pexels, ver
// assets/photos/CREDITS.md); los nombres y precios son inventados.
const SEED: [number, string, number, string, number, number][] = [
  [24, "Plato pintado con pájaro", 18000, "06", 1000, 667],
  [23, "Tetera con su cuenquito", 21000, "07", 750, 1000],
  [21, "Taza verde agua", 8500, "02", 1000, 667],
  [19, "Tinaja con tapa", 14000, "12", 750, 1000],
  [18, "Fuente gris honda", 15000, "03", 665, 1000],
  [16, "Taza crema", 8000, "10", 667, 1000],
  [14, "Jarrita blanca", 9500, "01", 800, 965],
  [11, "Par de tazas blancas", 10000, "08", 667, 1000],
  [9, "Botella blanca y negra", 11000, "04", 1000, 667],
  [7, "Centro de mesa verde", 13000, "05", 1000, 667],
  [5, "Maceta de barro", 5500, "09", 667, 1000],
  [3, "Botellita para flores secas", 6500, "11", 665, 1000],
];

export function seedPieces(now = "2026-11-10T12:00:00.000Z"): Piece[] {
  const base = Date.parse(now);
  return SEED.map(([number, title, price, file, width, height], i) => {
    const at = new Date(base - i * 86_400_000).toISOString();
    return { number, title, price, photo: { url: `/piezas/${file}.webp`, width, height }, createdAt: at, updatedAt: at };
  });
}

export function seedStore(id: string, demo = false): Store {
  const now = new Date().toISOString();
  return {
    id,
    ownerName: "Norma",
    contactPhone: process.env.NORMA_CONTACT_PHONE ?? "11 2345-6789",
    pieces: seedPieces(),
    sold: [],
    nextNumber: 25,
    updatedAt: now,
    conversation: { step: "idle" },
    undo: [],
    demo,
    chat: demo ? [] : undefined,
  };
}
