import "server-only";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { formatPrice } from "./bot/parse";
import type { Piece } from "./types";

// La tablilla como imagen: es lo que ve Norma en WhatsApp después de cada cambio
// y la vista previa cuando alguien comparte el link de una pieza.

const GLAZES = ["celadon", "ironred", "shino", "ash"] as const;
const W = 1200;
const H = 630;

const fonts = Promise.all(
  ([700, 800] as const).map(async (weight) => ({
    name: "Atkinson Hyperlegible Next",
    weight,
    style: "normal" as const,
    data: await readFile(join(process.cwd(), `src/assets/fonts/atkinson-next-${weight}.ttf`)),
  })),
);

/** Satori no lee WebP: todo se pasa a PNG (o JPEG para la foto) como data URI. */
async function asDataUri(url: string, base: string, opts: { width: number; height?: number; png?: boolean; white?: boolean; whole?: boolean }) {
  const res = await fetch(url.startsWith("http") ? url : new URL(url, base));
  if (!res.ok) throw new Error(`no pude bajar ${url}: ${res.status}`);
  const source = Buffer.from(await res.arrayBuffer());
  let img = sharp(source).resize({ width: opts.width, height: opts.height, fit: opts.height ? "cover" : "inside" });
  if (opts.whole && opts.height) {
    // Igual que en la página: la foto vertical va casi entera (5:6) al centro, con los bordes
    // fundidos en la misma foto estirada y fuera de foco.
    const w = Math.round((opts.height * 5) / 6);
    const fade = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${opts.height}"><defs><linearGradient id="g"><stop offset="0" stop-opacity="0"/><stop offset=".09"/><stop offset=".91"/><stop offset="1" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
    );
    const whole = await sharp(source).resize({ width: w, height: opts.height, fit: "cover" }).ensureAlpha().composite([{ input: fade, blend: "dest-in" }]).png().toBuffer();
    const back = await sharp(source).resize({ width: opts.width, height: opts.height, fit: "fill" }).blur(16).toBuffer();
    img = sharp(back).composite([{ input: whole, gravity: "centre" }]);
  }
  if (opts.white) {
    // El logo es una máscara: lo pintamos de blanco conservando su alfa.
    const alpha = await img.clone().extractChannel(3).toBuffer();
    const meta = await sharp(alpha).metadata();
    img = sharp({ create: { width: meta.width!, height: meta.height!, channels: 3, background: "#ffffff" } }).joinChannel(alpha);
  }
  const buf = opts.png || opts.white ? await img.png().toBuffer() : await img.jpeg({ quality: 82 }).toBuffer();
  return `data:image/${opts.png || opts.white ? "png" : "jpeg"};base64,${buf.toString("base64")}`;
}

export async function tileImage(piece: Piece, base: string, opts: { sold?: boolean } = {}) {
  const tileW = 470;
  const tileH = Math.round(tileW * 1.14);
  const glaze = GLAZES[piece.number % GLAZES.length];
  const [wall, slab, photo, logo, fontData] = await Promise.all([
    asDataUri("/plates/glaze-cobalt.webp", base, { width: W, height: H }),
    asDataUri(`/plates/tile-${glaze}.webp`, base, { width: tileW, png: true }),
    asDataUri(piece.photo.url, base, { width: Math.round(tileW * 0.81), height: Math.round(tileH * 0.55), whole: piece.photo.height > piece.photo.width * 1.1 }),
    asDataUri("/plates/logo.webp", base, { width: 300, white: true }),
    fonts,
  ]);

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", fontFamily: "Atkinson Hyperlegible Next", color: "#fff" }}>
        <img src={wall} width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
        {/* La tablilla, colgada un poquito torcida */}
        <div style={{ position: "absolute", left: 70, top: 44, width: tileW, height: tileH, display: "flex", transform: "rotate(-1.2deg)" }}>
          <img src={slab} width={tileW} height={tileH} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
          <img
            src={photo}
            width={Math.round(tileW * 0.81)}
            height={Math.round(tileH * 0.55)}
            style={{ position: "absolute", left: Math.round(tileW * 0.095), top: Math.round(tileH * 0.105), borderRadius: 4 }}
            alt=""
          />
          <div
            style={{
              position: "absolute",
              left: Math.round(tileW * 0.065),
              right: Math.round(tileW * 0.06),
              bottom: Math.round(tileH * 0.045),
              height: Math.round(tileH * 0.255),
              display: "flex",
              alignItems: "center",
              color: "#2b1a0e",
            }}
          >
            <div style={{ fontSize: 76, fontWeight: 800, color: "#36200f", width: 120, justifyContent: "center", display: "flex" }}>{piece.number}</div>
            <div style={{ width: 3, height: 70, background: "rgba(74,44,23,0.4)", margin: "0 22px 0 8px" }} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{piece.title}</div>
              <div style={{ fontSize: 40, fontWeight: 800 }}>{formatPrice(piece.price)}</div>
            </div>
          </div>
        </div>
        {/* A la derecha, lo que se lee en chiquito en el chat */}
        <div style={{ position: "absolute", left: 620, right: 60, top: 70, bottom: 70, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <img src={logo} width={300} style={{ marginLeft: -6 }} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#dfe5ff" }}>{opts.sold ? "Esta ya se vendió" : `Pieza Nº ${piece.number}`}</div>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, marginTop: 6 }}>{piece.title}</div>
            {!opts.sold && <div style={{ fontSize: 72, fontWeight: 800, marginTop: 14 }}>{formatPrice(piece.price)}</div>}
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: await fontData, headers: { "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable" } },
  );
}
