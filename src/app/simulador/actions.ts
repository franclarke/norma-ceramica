"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { runTurn } from "@/lib/bot/run";
import { processPhoto } from "@/lib/images";
import { SAMPLE_PHOTOS } from "@/lib/samples";
import { isDemoId, saveStore, storeTag } from "@/lib/store";
import { seedStore } from "@/lib/seed";
import type { ChatEntry, IncomingMessage } from "@/lib/types";

const SIM_COOKIE = "norma-sim";

async function sandboxId() {
  const id = (await cookies()).get(SIM_COOKIE)?.value;
  if (!id || !isDemoId(id)) throw new Error("No hay tienda de prueba. Recargá la página.");
  return id;
}

export type SendResult = { ok: true; chat: ChatEntry[]; changed: boolean } | { ok: false; error: string };

export async function sendToBot(form: FormData): Promise<SendResult> {
  try {
    const id = await sandboxId();
    const kind = String(form.get("kind"));
    let incoming: IncomingMessage;

    if (kind === "text") {
      const text = String(form.get("text") ?? "").slice(0, 500).trim();
      if (!text) return { ok: false, error: "Escribí algo antes de mandar." };
      incoming = { kind: "text", text };
    } else if (kind === "button") {
      incoming = { kind: "button", id: String(form.get("id")), title: String(form.get("title")) };
    } else if (kind === "image") {
      const caption = String(form.get("caption") ?? "").slice(0, 300).trim() || undefined;
      const sample = SAMPLE_PHOTOS.find((p) => p.id === form.get("sample"));
      const file = form.get("file");
      if (sample) {
        incoming = { kind: "image", photo: sample.photo, caption, dark: sample.dark };
      } else if (file instanceof File && file.size > 0) {
        if (file.size > 8 * 1024 * 1024) return { ok: false, error: "La foto es muy pesada (más de 8 MB)." };
        if (!file.type.startsWith("image/")) return { ok: false, error: "Eso no parece una foto." };
        const { photo, dark } = await processPhoto(id, Buffer.from(await file.arrayBuffer()));
        incoming = { kind: "image", photo, caption, dark };
      } else {
        return { ok: false, error: "No llegó ninguna foto." };
      }
    } else {
      return { ok: false, error: "Mensaje desconocido." };
    }

    const { store, changed } = await runTurn(id, incoming);
    if (changed) updateTag(storeTag(id));
    return { ok: true, chat: store.chat ?? [], changed: Boolean(changed) };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Algo falló. Probá de nuevo." };
  }
}

/** Vuelve la tienda de prueba al estado inicial. */
export async function resetSandbox(): Promise<SendResult> {
  const id = await sandboxId();
  await saveStore(seedStore(id, true));
  updateTag(storeTag(id));
  return { ok: true, chat: [], changed: true };
}
