import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(() => ({
  root: path.resolve(__dirname, "./site"),
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
