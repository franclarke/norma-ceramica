import type { MetadataRoute } from "next";
import { getPublicStore, NORMA } from "@/lib/store";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://norma-ceramica.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getPublicStore(NORMA);
  return [
    { url: site, lastModified: store.updatedAt },
    ...store.pieces.map((p) => ({ url: `${site}/${p.number}`, lastModified: p.updatedAt })),
  ];
}
