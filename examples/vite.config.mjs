import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@vaakx-dev/vrui": page("../src/index.ts"),
    },
  },
  build: {
    emptyOutDir: true,
  },
});
