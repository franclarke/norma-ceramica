import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // "server-only" corta el build si se importa en el cliente; en los tests no hace falta.
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
