import { getStorage } from "@/lib/storage";

// Cron diario: borra las tiendas de prueba del simulador con más de 2 días.
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const storage = getStorage();
  const limit = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const newest = new Map<string, number>();
  for (const { key, uploadedAt } of await storage.listPrefixes("stores/demo-")) {
    const id = key.split("/")[1];
    newest.set(id, Math.max(newest.get(id) ?? 0, uploadedAt.getTime()));
  }
  const old = [...newest].filter(([, t]) => t < limit).map(([id]) => id);
  for (const id of old) await storage.remove(`stores/${id}/`);
  return Response.json({ removed: old.length });
}
