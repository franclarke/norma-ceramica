import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoreView } from "@/components/store-view";
import { getPublicStore, isDemoId } from "@/lib/store";

export const metadata: Metadata = {
  title: "Tienda de prueba · Norma · cerámica",
  robots: { index: false },
};

// Las tiendas de prueba del simulador. Cada visitante del simulador tiene la suya.
export default function DemoStore({ params, searchParams }: PageProps<"/tienda/[id]">) {
  return (
    <Suspense>
      <DemoStoreContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DemoStoreContent({ params, searchParams }: PageProps<"/tienda/[id]">) {
  const { id } = await params;
  const { compacta } = await searchParams;
  if (!isDemoId(id)) notFound();
  const store = await getPublicStore(id);
  return <StoreView store={store} compact={compacta !== undefined} />;
}
