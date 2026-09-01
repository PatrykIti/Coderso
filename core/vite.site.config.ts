import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(() => ({
  root: path.resolve(__dirname, "./site"),
  // Own dep cache, mirroring `cacheDir` in vite.config.ts. Both dev servers
  // defaulted to `node_modules/.vite`, and the second boot's re-optimization
  // deleted the live server's cache (TASK-105-08-08-L07 r40/r41).
  cacheDir: "../node_modules/.vite/task105-site",
  base: "/site/",
  plugins: [tailwindcss()],
  build: {
    outDir: path.resolve(__dirname, "./dist/site"),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, "./site/main.ts"),
    },
  },
}));
