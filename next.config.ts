import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Las tipografías de la imagen de cada tablilla se leen del disco: que viajen con la función.
  outputFileTracingIncludes: { "/api/tablilla/[store]/[n]": ["./src/assets/fonts/**"] },
  partialPrefetching: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // 60 para las losas (textura de gres: no se nota y pesan un tercio menos); 75 para las fotos.
    qualities: [60, 75],
    // Un escalón de 480 y otro de 560: un celular de gama baja no baja la foto de uno de gama alta.
    deviceSizes: [480, 560, 640, 750, 828, 1080, 1200, 1920],
    // Las fotos no cambian nunca con el mismo nombre (las de Norma llevan sufijo único): un mes en el navegador.
    minimumCacheTTL: 2678400,
    localPatterns: [{ pathname: "/piezas/**", search: "" }, { pathname: "/plates/**", search: "" }, { pathname: "/media/**", search: "" }],
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    // Los estilos pesan 6 KB: van dentro del HTML y el celular se ahorra dos pedidos antes de pintar.
    inlineCss: true,
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
