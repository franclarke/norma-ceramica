import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getStorage } from "./storage";
import { seedStore } from "./seed";
import type { Store } from "./types";

export const NORMA = "norma";
export const storeTag = (id: string) => `store:${id}`;
const key = (id: string) => `stores/${id}/store.json`;

/** Lectura fresca (para el bot y el simulador). Si la tienda no existe, nace con la demo. */
export async function loadStore(id: string): Promise<Store> {
  const found = await getStorage().readJSON<Store>(key(id));
  if (found) return found;
  const fresh = seedStore(id, id !== NORMA);
  await getStorage().writeJSON(key(id), fresh);
  return fresh;
}

export async function saveStore(store: Store): Promise<void> {
  await getStorage().writeJSON(key(store.id), store);
}

/** Lo que ve el comprador: cacheado y con tag, se invalida cuando Norma cambia algo. */
export async function getPublicStore(id: string) {
  "use cache";
  cacheTag(storeTag(id));
  cacheLife("days");
  const s = await loadStore(id);
  return { id: s.id, ownerName: s.ownerName, contactPhone: s.contactPhone, pieces: s.pieces, updatedAt: s.updatedAt, demo: Boolean(s.demo) };
}

export type PublicStore = Awaited<ReturnType<typeof getPublicStore>>;

export const isDemoId = (id: string) => /^demo-[a-z0-9]{6,16}$/.test(id);
