import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Standalone prototype app. Mirrors core/admin's stack (Vite + React 19 + Tailwind v4)
// so components and pages port back into `core/admin` with minimal friction.
export default defineConfig({
  // Relative asset paths so the built app works at any URL — root, a proxy
  // subpath (devcontainer/Codespaces/tunnel forwarding), or opened via file://.
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5180,
    open: true,
    host: true,
  },
  // `bun run preview` serves the static production build — robust over
  // container/host port-forwarding (no HMR websocket, just 1 JS + 1 CSS).
  preview: {
    port: 5180,
    host: true,
    strictPort: false,
  },
});
