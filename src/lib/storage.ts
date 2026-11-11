import "server-only";
import { put, get, del, list } from "@vercel/blob";
import { mkdir, readFile, writeFile, rm, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Almacenamiento mínimo: JSON + imágenes.
 * - En Vercel (o con BLOB_READ_WRITE_TOKEN): Vercel Blob.
 * - Sin token (desarrollo offline / tests): carpeta .data/ servida por /media.
 */
export interface Storage {
  readJSON<T>(key: string): Promise<T | null>;
  writeJSON(key: string, value: unknown): Promise<void>;
  putImage(key: string, data: Buffer, contentType: string): Promise<string>;
  remove(prefix: string): Promise<void>;
  listPrefixes(prefix: string): Promise<{ key: string; uploadedAt: Date }[]>;
}

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN) && process.env.STORAGE !== "fs";

const blobStorage: Storage = {
  async readJSON<T>(key: string) {
    const res = await get(key, { access: "public", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return (await new Response(res.stream).json()) as T;
  },
  async writeJSON(key, value) {
    await put(key, JSON.stringify(value), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
  },
  async putImage(key, data, contentType) {
    const blob = await put(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  },
  async remove(prefix) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      if (page.blobs.length) await del(page.blobs.map((b) => b.url));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  },
  async listPrefixes(prefix) {
    const out: { key: string; uploadedAt: Date }[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const b of page.blobs) out.push({ key: b.pathname, uploadedAt: b.uploadedAt });
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  },
};

const ROOT = join(process.cwd(), ".data");

const fsStorage: Storage = {
  async readJSON<T>(key: string) {
    try {
      return JSON.parse(await readFile(join(ROOT, key), "utf8")) as T;
    } catch {
      return null;
    }
  },
  async writeJSON(key, value) {
    const file = join(ROOT, key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value));
  },
  async putImage(key, data) {
    const unique = key.replace(/(\.\w+)$/, `-${Date.now().toString(36)}$1`);
    const file = join(ROOT, unique);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    return `/media/${unique}`;
  },
  async remove(prefix) {
    await rm(join(ROOT, prefix), { recursive: true, force: true });
  },
  async listPrefixes(prefix) {
    const dir = join(ROOT, prefix);
    try {
      const names = await readdir(dir);
      return Promise.all(
        names.map(async (n) => ({ key: `${prefix}${n}/`, uploadedAt: (await stat(join(dir, n))).mtime })),
      );
    } catch {
      return [];
    }
  },
};

export function getStorage(): Storage {
  return blobEnabled() ? blobStorage : fsStorage;
}

export const LOCAL_ROOT = ROOT;
