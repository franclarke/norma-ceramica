import { Suspense } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoId, loadStore } from "@/lib/store";
import { aiAvailable } from "@/lib/bot/ai";
import { SAMPLE_PHOTOS } from "@/lib/samples";
import { Simulator } from "./simulator";
import s from "./simulador.module.css";

export const metadata: Metadata = {
  title: "Simulador · Así actualiza Norma su página",
  description: "Hacé de Norma: mandá una foto por WhatsApp y mirá cómo aparece en su página.",
};

export default function SimuladorPage() {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <Link href="/" className={s.home} aria-label="Ir a la página de Norma">
          <span className="brush" style={{ "--src": "url(/plates/logo.webp)" } as CSSProperties} aria-hidden />
        </Link>
        <div className={s.headText}>
          <h1 className={s.title}>Así actualiza Norma su página</h1>
          <p className={s.lede}>
            Norma no usa compu ni mail: le escribe a su página por WhatsApp, como a cualquier persona. Acá podés hacer de Norma. Lo que
            cambies se ve al instante en una tienda de prueba que es solo tuya.
          </p>
        </div>
      </header>
      <Suspense fallback={<p className={s.loading}>Abriendo el WhatsApp de Norma…</p>}>
        <SimulatorLoader />
      </Suspense>
    </div>
  );
}

async function SimulatorLoader() {
  const id = (await cookies()).get("norma-sim")?.value;
  if (!id || !isDemoId(id)) redirect("/simulador/nuevo");
  const store = await loadStore(id);
  return <Simulator storeId={id} initialChat={store.chat ?? []} samples={SAMPLE_PHOTOS} voice={await aiAvailable()} />;
}
