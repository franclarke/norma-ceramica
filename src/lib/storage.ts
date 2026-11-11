import "server-only";
import { put, del, list } from "@vercel/blob";
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

/*
 * Sobrescribir el mismo archivo en Blob deja lecturas viejas durante minutos (lo vimos en
 * producción). Por eso cada guardado es una versión nueva e inmutable
 * (stores/<id>/store/<timestamp>.json) y se lee siempre la última que lista Blob, que sí es
 * consistente. Se conservan las últimas versiones y se borran las demás.
 */
const versionsOf = (key: string) => `${key.replace(/\.json$/, "")}/`;
const KEEP = 4;

async function versions(key: string) {
  const { blobs } = await list({ prefix: versionsOf(key), limit: 1000 });
  return blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1)); // la más nueva primero
}

const blobStorage: Storage = {
  async readJSON<T>(key: string) {
    const [latest] = await versions(key);
    if (!latest) return null;
    const res = await fetch(latest.url, { cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  },
  async writeJSON(key, value) {
    const stamp = `${String(Date.now()).padStart(15, "0")}-${Math.random().toString(36).slice(2, 8)}`;
    await put(`${versionsOf(key)}${stamp}.json`, JSON.stringify(value), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    const old = (await versions(key)).slice(KEEP);
    if (old.length) await del(old.map((b) => b.url)).catch(() => {});
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
