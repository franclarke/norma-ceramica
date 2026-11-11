import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Las tipografías de la imagen de cada tablilla se leen del disco: que viajen con la función.
  outputFileTracingIncludes: { "/api/tablilla/[store]/[n]": ["./src/assets/fonts/**"] },
  partialPrefetching: true,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/piezas/**", search: "" }, { pathname: "/plates/**", search: "" }, { pathname: "/media/**", search: "" }],
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
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
