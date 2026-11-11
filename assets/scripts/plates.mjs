// Prepara las "plates" de la página a partir de assets/raw/ y las deja en public/plates/.
// - Tablillas: el fondo negro se vuelve transparente con un relleno desde los bordes
//   (así no se come el esmalte oscuro del interior) y se recortan al contenido.
// - Esmalte cobalto: se espeja 2x2 para que repita sin costuras.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "..", "public", "plates");
mkdirSync(OUT, { recursive: true });

async function tile(name) {
  const { data, info } = await sharp(join(ROOT, "raw", `${name}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = new Uint8Array(w * h);
  const dark = (i) => data[i * 3] < 34 && data[i * 3 + 1] < 34 && data[i * 3 + 2] < 34;
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (bg[i] || !dark(i)) continue;
    bg[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  // Borde suave: 1px de antialias donde el fondo toca la pieza.
  const rgba = Buffer.alloc(w * h * 4);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    if (bg[i]) continue;
    const x = i % w, y = (i / w) | 0;
    const edge = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
    rgba[i * 4 + 3] = edge ? 150 : 255;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const img = sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract({ left: x0, top: y0, width: cw, height: ch });
  const buf = await img.png().toBuffer();
  await sharp(buf).resize({ width: 900 }).webp({ quality: 82, alphaQuality: 90 }).toFile(join(OUT, `${name}.webp`));
  return { name, width: cw, height: ch };
}

async function glaze() {
  const base = await sharp(join(ROOT, "raw", "glaze-cobalt.png")).resize(720, 720).toBuffer();
  const flipX = await sharp(base).flop().toBuffer();
  const flipY = await sharp(base).flip().toBuffer();
  const both = await sharp(base).flip().flop().toBuffer();
  await sharp({ create: { width: 1440, height: 1440, channels: 3, background: "#000" } })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: flipX, left: 720, top: 0 },
      { input: flipY, left: 0, top: 720 },
      { input: both, left: 720, top: 720 },
    ])
    .modulate({ brightness: 0.82, saturation: 1.05 })
    .webp({ quality: 70 })
    .toFile(join(OUT, "glaze-cobalt.webp"));
  const { dominant } = await sharp(join(OUT, "glaze-cobalt.webp")).stats();
  return dominant;
}

const tiles = [];
for (const n of ["tile-celadon", "tile-ironred", "tile-shino", "tile-ash"]) tiles.push(await tile(n));
const dominant = await glaze();
writeFileSync(join(OUT, "plates.json"), JSON.stringify({ tiles, glazeDominant: dominant }, null, 2));
console.log(JSON.stringify({ tiles, dominant }));
