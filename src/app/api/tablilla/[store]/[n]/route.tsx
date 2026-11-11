import { siteUrl } from "@/lib/bot/run";
import { isDemoId, loadStore, NORMA } from "@/lib/store";
import { tileImage } from "@/lib/tile-image";

// La imagen de una tablilla. La URL lleva ?v=<fecha de cambio>, así que se cachea para siempre.
export async function GET(req: Request, ctx: RouteContext<"/api/tablilla/[store]/[n]">) {
  const { store: id, n } = await ctx.params;
  if (id !== NORMA && !isDemoId(id)) return new Response("No", { status: 404 });
  const store = await loadStore(id);
  const number = Number(n);
  const piece = store.pieces.find((p) => p.number === number);
  const sold = store.sold.find((p) => p.number === number);
  if (!piece && !sold) return new Response("No existe", { status: 404 });
  return tileImage((piece ?? sold)!, new URL(req.url).origin || siteUrl(), { sold: !piece });
}
