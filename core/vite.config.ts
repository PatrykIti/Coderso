import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname, "./admin"),
  base: "/admin/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./admin"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "./dist/client"),
    emptyOutDir: true,
  },
});
