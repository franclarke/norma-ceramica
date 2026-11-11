import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { saveStore } from "@/lib/store";
import { seedStore } from "@/lib/seed";

// Crea una tienda de prueba nueva para este visitante y lo manda al simulador.
export async function GET() {
  const id = `demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  await saveStore(seedStore(id, true));
  (await cookies()).set("norma-sim", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 2 });
  redirect("/simulador");
}
