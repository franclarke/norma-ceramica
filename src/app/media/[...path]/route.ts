import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { LOCAL_ROOT } from "@/lib/storage";

// Solo para desarrollo sin Vercel Blob: sirve las fotos guardadas en .data/.
export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const file = normalize(join(LOCAL_ROOT, ...path));
  if (!file.startsWith(LOCAL_ROOT)) return new Response("No", { status: 403 });
  try {
    const body = await readFile(file);
    return new Response(body, { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
