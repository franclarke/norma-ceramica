import type { Photo } from "./types";

/** Fotos para probar el simulador sin tener cerámica a mano. */
export const SAMPLE_PHOTOS: { id: string; label: string; photo: Photo; dark?: boolean }[] = [
  { id: "taza", label: "Taza verde", photo: { url: "/piezas/02-b.webp", width: 1000, height: 750 } },
  { id: "tetera", label: "Tetera", photo: { url: "/piezas/07.webp", width: 750, height: 1000 } },
  { id: "plato", label: "Plato pintado", photo: { url: "/piezas/06.webp", width: 1000, height: 667 } },
  { id: "oscura", label: "Una foto oscura", photo: { url: "/simulador/oscura.webp", width: 750, height: 1000 }, dark: true },
];
