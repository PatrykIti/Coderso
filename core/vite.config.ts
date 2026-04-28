import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  root: path.resolve(__dirname, "./admin"),
  base: command === "build" ? "./" : "/admin/",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "admin-base-redirect",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/admin") {
            res.statusCode = 307;
            res.setHeader("Location", "/admin/");
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./admin"),
    },
  },
  server: {
    host: "localhost",
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname)],
    },
    proxy: {
      "/admin/api": {
        target: process.env.VITE_API_ORIGIN ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/media": {
        target: process.env.VITE_API_ORIGIN ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "./dist/client"),
    emptyOutDir: true,
  },
}));
