import sharp from "sharp";

// WhatsApp solo muestra fotos JPEG o PNG. Las de la página son WebP, así que las que el bot
// manda al chat pasan por acá. La dirección de la foto viaja en la ruta, en base64url.
export async function GET(req: Request, ctx: RouteContext<"/api/jpg/[src]">) {
  const { src } = await ctx.params;
  const origin = new URL(req.url).origin;
  let target: URL;
  try {
    target = new URL(Buffer.from(src.replace(/\.jpg$/, ""), "base64url").toString("utf8"), origin);
  } catch {
    return new Response("No", { status: 400 });
  }
  // Solo fotos nuestras: las del sitio o las que subió Norma.
  const ours = target.origin === origin && /^\/(piezas|media|simulador)\//.test(target.pathname);
  const uploaded = target.protocol === "https:" && target.hostname.endsWith(".public.blob.vercel-storage.com") && target.pathname.startsWith("/stores/");
  if (!ours && !uploaded) return new Response("No", { status: 400 });

  const res = await fetch(target);
  if (!res.ok) return new Response("No encontrado", { status: 404 });
  try {
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(jpg), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("No es una foto", { status: 415 });
  }
}
