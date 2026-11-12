import "server-only";
import { put, del, list } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import { after } from "next/server";
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
    // "No existe" es solo cuando no hay ninguna versión. Si existe y no se pudo leer, es un error:
    // devolver null haría que la tienda se cree de nuevo y pise la de Norma.
    if (!res.ok) throw new Error(`blob read ${res.status}`);
    return (await res.json()) as T;
  },
  async writeJSON(key, value) {
    const stamp = `${String(Date.now()).padStart(15, "0")}-${Math.random().toString(36).slice(2, 8)}`;
    await put(`${versionsOf(key)}${stamp}.json`, JSON.stringify(value), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    // La limpieza de versiones viejas no hace esperar a nadie: corre después de responder.
    const cleanup = async () => {
      const old = (await versions(key)).slice(KEEP);
      if (old.length) await del(old.map((b) => b.url)).catch(() => {});
    };
    try {
      after(cleanup);
    } catch {
      await cleanup(); // fuera de un request (por ejemplo, durante el build)
    }
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

/*
 * Con Upstash Redis conectado (Marketplace de Vercel), el estado de la conversación y del catálogo
 * vive en Redis: lecturas en milisegundos y escrituras atómicas. Las fotos siguen en Blob.
 * Las tiendas de prueba del simulador vencen solas a los 2 días.
 */
const redisUrl = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
let redis: Redis | null = null;
const getRedis = () => (redis ??= new Redis({ url: redisUrl()!, token: redisToken()! }));
const redisEnabled = () => Boolean(redisUrl() && redisToken() && process.env.STORAGE !== "fs");
/** El mismo cliente para todo lo que necesita Redis (candados, cupos). null si no está conectado. */
export const sharedRedis = () => (redisEnabled() ? getRedis() : null);
const DEMO_TTL = 60 * 60 * 24 * 2;

function withRedis(files: Storage): Storage {
  // Redis es la copia rápida; Blob (o el disco en local) la permanente. Se escribe en las dos,
  // y si Redis no responde o se vació, se lee de la permanente sin perder nada.
  const later = (job: () => Promise<unknown>) => {
    try {
      after(job);
    } catch {
      return job();
    }
  };
  return {
    ...files,
    async readJSON<T>(key: string) {
      try {
        const hit = await getRedis().get<T>(key);
        if (hit) return hit;
      } catch (e) {
        // Next corta las lecturas en vuelo cuando termina de prerenderizar: no es una falla de Redis.
        if (String(e).includes("During prerendering")) throw e;
        console.error("redis read", e);
        return files.readJSON<T>(key);
      }
      const stored = await files.readJSON<T>(key);
      if (stored) await getRedis().set(key, stored).catch(() => {});
      return stored;
    },
    async writeJSON(key, value) {
      const demo = key.startsWith("stores/demo-");
      try {
        await getRedis().set(key, value, demo ? { ex: DEMO_TTL } : undefined);
      } catch (e) {
        console.error("redis write", e);
        return files.writeJSON(key, value);
      }
      await later(() => files.writeJSON(key, value));
    },
    async remove(prefix) {
      const keys = await getRedis().keys(`${prefix}*`).catch(() => [] as string[]);
      if (keys.length) await getRedis().del(...keys).catch(() => {});
      await files.remove(prefix);
    },
  };
}

export function getStorage(): Storage {
  const files = blobEnabled() ? blobStorage : fsStorage;
  return redisUrl() && redisToken() && process.env.STORAGE !== "fs" ? withRedis(files) : files;
}

export const LOCAL_ROOT = ROOT;
