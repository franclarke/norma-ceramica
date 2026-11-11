import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoreView } from "@/components/store-view";
import { getPublicStore, NORMA } from "@/lib/store";
import { formatPrice } from "@/lib/bot/parse";

// El link de una pieza ("norma-ceramica.vercel.app/14"): se reenvía por WhatsApp y la vista
// previa ya muestra la tablilla con foto, número y precio.

const parse = (raw: string) => (/^\d{1,4}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: PageProps<"/[numero]">): Promise<Metadata> {
  const n = parse((await params).numero);
  if (n === null) return {};
  const store = await getPublicStore(NORMA);
  const piece = store.pieces.find((p) => p.number === n);
  if (!piece) return { title: `Pieza Nº ${n} · Norma · cerámica`, robots: { index: false } };
  const image = `/api/tablilla/${NORMA}/${piece.number}?v=${Date.parse(piece.updatedAt)}`;
  const title = `Nº ${piece.number} · ${piece.title} · ${formatPrice(piece.price)}`;
  const description = "Una pieza del taller de Norma. Si te gusta, escribile y contale cuál es: cada pieza tiene su numerito.";
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630, alt: `${piece.title}, pieza Nº ${piece.number}` }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function PiecePage({ params }: PageProps<"/[numero]">) {
  return (
    <Suspense>
      <Piece params={params} />
    </Suspense>
  );
}

async function Piece({ params }: { params: PageProps<"/[numero]">["params"] }) {
  const n = parse((await params).numero);
  if (n === null) notFound();
  const store = await getPublicStore(NORMA);
  return <StoreView store={store} featured={n} />;
}
