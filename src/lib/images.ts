import "server-only";
import sharp from "sharp";
import { getStorage } from "./storage";
import type { Photo } from "./types";

/**
 * Las fotos de Norma llegan como llegan: giradas, grandes, oscuras.
 * Se enderezan según el EXIF, se achican, se pasan a WebP y se mide la luz
 * para que el bot pueda avisarle si la pieza no se va a ver bien.
 */
export async function processPhoto(storeId: string, input: Buffer): Promise<{ photo: Photo; dark: boolean }> {
  const img = sharp(input, { failOn: "none" }).rotate();
  const { data, info } = await img
    .clone()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .normalise({ lower: 1, upper: 99 })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  const stats = await sharp(input, { failOn: "none" }).resize(64, 64, { fit: "inside" }).greyscale().stats();
  const dark = stats.channels[0].mean < 72;

  const url = await getStorage().putImage(`stores/${storeId}/photos/foto.webp`, data, "image/webp");
  return { photo: { url, width: info.width, height: info.height }, dark };
}
