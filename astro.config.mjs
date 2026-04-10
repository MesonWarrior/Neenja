import path from "node:path";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  trailingSlash: "always",
  vite: {
    resolve: {
      alias: {
        "@": path.resolve("./"),
      },
    },
  },
});
