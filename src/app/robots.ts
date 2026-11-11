import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://norma-ceramica.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/tienda/", "/simulador/nuevo"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
