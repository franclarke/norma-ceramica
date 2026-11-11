// Convierte las hojas de raw/ en recortes transparentes en out/.
// Uso: node scripts/extract.mjs [hoja ...]   (sin argumentos procesa todas las que existan)
//
// - "ink": el alfa sale de cuánto se aleja el píxel del blanco; el RGB queda negro.
//   Se usa como mask-image y se pinta por CSS con los colores del tema.
// - "color": color-to-alpha real (como GIMP): conserva el color, sirve para la cinta.
// - Cada hoja se separa en dibujos sueltos: por filas en blanco ("rows") o por manchas cercanas ("blobs").
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "raw");
const OUT = join(ROOT, "out");

const SHEETS = {
  logo: { mode: "ink", split: "rows", gap: 90 },
  doodles: { mode: "ink", split: "blobs", dilate: 22 },
  strokes: { mode: "ink", split: "blobs", dilate: 14 },
  stamps: { mode: "ink", split: "blobs", dilate: 14, preview: "#B4532A" },
  tape: { mode: "color", split: "blobs", dilate: 8, threshold: 0.06 },
  paper: { mode: "texture" },
};

const PAPER = { r: 0xf4, g: 0xed, b: 0xe1 };
const INK = "#2a211b";
const PAD = 16;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

async function load(name) {
  const { data, info } = await sharp(join(RAW, `${name}.png`))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// Devuelve RGBA. alpha en [0,1] según distancia al blanco.
function toAlpha({ data, w, h }, mode) {
  const rgba = Buffer.alloc(w * h * 4);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const raw = (255 - Math.min(r, g, b)) / 255;
    if (mode === "ink") {
      const a = clamp01((raw - 0.08) / (0.82 - 0.08));
      alpha[i] = a;
      rgba[i * 4 + 3] = Math.round(a * 255);
    } else {
      const a = raw < 0.035 ? 0 : raw;
      alpha[i] = a;
      if (a > 0) {
        for (let c = 0; c < 3; c++) {
          const v = data[i * 3 + c];
          rgba[i * 4 + c] = Math.round(clamp01((v - 255 * (1 - a)) / a / 255) * 255);
        }
      }
      rgba[i * 4 + 3] = Math.round(a * 255);
    }
  }
  return { rgba, alpha };
}

// Separa por bandas horizontales vacías de al menos `gap` px.
function splitRows(alpha, w, h, gap, threshold = 0.2) {
  const rowOn = new Array(h).fill(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (alpha[y * w + x] > threshold) { rowOn[y] = true; break; }
  }
  const bands = [];
  let start = -1, lastOn = -1;
  for (let y = 0; y < h; y++) {
    if (!rowOn[y]) continue;
    if (start === -1) start = y;
    else if (y - lastOn > gap) { bands.push([start, lastOn]); start = y; }
    lastOn = y;
  }
  if (start !== -1) bands.push([start, lastOn]);
  return bands.map(([y0, y1]) => ({ x0: 0, y0, x1: w - 1, y1, mask: null }));
}

// Agrupa trazos cercanos: grilla reducida, dilatación y componentes conexas.
function splitBlobs(alpha, w, h, dilate, threshold = 0.25) {
  const F = 4;
  const gw = Math.ceil(w / F), gh = Math.ceil(h / F);
  const on = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alpha[y * w + x] > threshold) on[((y / F) | 0) * gw + ((x / F) | 0)] = 1;

  const r = Math.max(1, Math.round(dilate / F));
  const dil = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      if (!on[y * gw + x]) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) dil[yy * gw + xx] = 1;
        }
    }

  const label = new Int32Array(gw * gh).fill(-1);
  const blobs = [];
  for (let i = 0; i < gw * gh; i++) {
    if (!dil[i] || label[i] !== -1) continue;
    const id = blobs.length;
    const stack = [i];
    label[i] = id;
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0, inkCells = 0;
    while (stack.length) {
      const j = stack.pop();
      const x = j % gw, y = (j / gw) | 0;
      if (on[j]) {
        inkCells++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      for (const n of [j - 1, j + 1, j - gw, j + gw]) {
        if (n < 0 || n >= gw * gh) continue;
        if ((n === j - 1 && x === 0) || (n === j + 1 && x === gw - 1)) continue;
        if (dil[n] && label[n] === -1) { label[n] = id; stack.push(n); }
      }
    }
    blobs.push({ id, inkCells, x0: x0 * F, y0: y0 * F, x1: Math.min(w - 1, x1 * F + F - 1), y1: Math.min(h - 1, y1 * F + F - 1) });
  }
  const minSide = 40;
  return blobs
    .filter((b) => b.inkCells > 12 && b.x1 - b.x0 > minSide / 2 && b.y1 - b.y0 > minSide / 4)
    .map((b) => ({ ...b, mask: { label, gw, F, id: b.id } }));
}

// Orden de lectura: por filas (centros cercanos en Y) y después de izquierda a derecha.
function readingOrder(parts) {
  const sorted = [...parts].sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const rows = [];
  for (const p of sorted) {
    const cy = (p.y0 + p.y1) / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < (p.y1 - p.y0) * 0.6);
    if (row) row.items.push(p); else rows.push({ cy, items: [p] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));
}

async function cropPart(rgba, w, h, part) {
  const x0 = Math.max(0, part.x0 - PAD), y0 = Math.max(0, part.y0 - PAD);
  const x1 = Math.min(w - 1, part.x1 + PAD), y1 = Math.min(h - 1, part.y1 + PAD);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const buf = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const sx = x0 + x, sy = y0 + y;
      const si = (sy * w + sx) * 4, di = (y * cw + x) * 4;
      if (part.mask) {
        const { label, gw, F, id } = part.mask;
        if (label[((sy / F) | 0) * gw + ((sx / F) | 0)] !== id) continue;
      }
      rgba.copy(buf, di, si, si + 4);
    }
  return { buf, cw, ch };
}

// "logo-v2" usa la configuración de "logo".
const configFor = (name) => SHEETS[name] ?? SHEETS[name.split("-")[0]];

async function processSheet(name) {
  const cfg = configFor(name);
  const dir = join(OUT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  if (cfg.mode === "texture") {
    await sharp(join(RAW, `${name}.png`)).resize(512, 512).webp({ quality: 72 }).toFile(join(dir, `${name}.webp`));
    console.log(`${name}: textura -> out/${name}/${name}.webp`);
    return;
  }

  const img = await load(name);
  const { rgba, alpha } = toAlpha(img, cfg.mode);
  const parts =
    cfg.split === "rows"
      ? splitRows(alpha, img.w, img.h, cfg.gap)
      : readingOrder(splitBlobs(alpha, img.w, img.h, cfg.dilate, cfg.threshold));

  const tiles = [];
  for (const [i, part] of parts.entries()) {
    const { buf, cw, ch } = await cropPart(rgba, img.w, img.h, part);
    const base = join(dir, `${name}-${i + 1}`);
    const s = sharp(buf, { raw: { width: cw, height: ch, channels: 4 } });
    await s.clone().png({ compressionLevel: 9 }).toFile(`${base}.png`);
    await s.clone().webp({ quality: 85, alphaQuality: 90 }).toFile(`${base}.webp`);
    tiles.push({ buf, cw, ch, n: i + 1 });
  }
  await preview(name, tiles, cfg);
  console.log(`${name}: ${tiles.length} recortes -> out/${name}/`);
  return tiles.map((t) => ({ file: `out/${name}/${name}-${t.n}.webp`, w: t.cw, h: t.ch }));
}

// Hoja de contacto sobre color papel para revisar a ojo.
async function preview(name, tiles, cfg) {
  const cell = 300, cols = Math.min(4, tiles.length), rows = Math.ceil(tiles.length / cols);
  const layers = [];
  for (const [k, t] of tiles.entries()) {
    const scale = Math.min((cell - 40) / t.cw, (cell - 50) / t.ch, 1);
    const tw = Math.max(1, Math.round(t.cw * scale)), th = Math.max(1, Math.round(t.ch * scale));
    let tile = sharp(t.buf, { raw: { width: t.cw, height: t.ch, channels: 4 } }).resize(tw, th);
    if (cfg.mode === "ink") {
      const alphaOnly = await tile.clone().extractChannel(3).png().toBuffer();
      tile = sharp({ create: { width: tw, height: th, channels: 3, background: cfg.preview ?? INK } }).joinChannel(alphaOnly);
    }
    const left = (k % cols) * cell + Math.round((cell - tw) / 2);
    const top = Math.floor(k / cols) * cell + 30 + Math.round((cell - 50 - th) / 2);
    layers.push({ input: await tile.png().toBuffer(), left, top });
    const label = `<svg width="60" height="28"><text x="8" y="20" font-family="Arial" font-size="18" fill="#7a6a5a">${t.n}</text></svg>`;
    layers.push({ input: Buffer.from(label), left: (k % cols) * cell, top: Math.floor(k / cols) * cell });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: PAPER } })
    .composite(layers)
    .png()
    .toFile(join(OUT, `_preview-${name}.png`));
}

const wanted = process.argv.slice(2);
const all = readdirSync(RAW).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4));
const names = (wanted.length ? wanted : all).filter((n) => configFor(n) && existsSync(join(RAW, `${n}.png`)));
mkdirSync(OUT, { recursive: true });

// manifest.json: lo que hay en out/, para la lámina de revisión.
const manifestPath = join(OUT, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
for (const n of names) {
  const files = await processSheet(n);
  manifest[n] = { mode: configFor(n).mode, files: files ?? [{ file: `out/${n}/${n}.webp` }] };
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
