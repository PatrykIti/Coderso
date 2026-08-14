import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The admin base path mirrors the backend's `site.adminPath` setting (default
// `/admin`). The dev host resolves that setting from the DB and exports
// `VITE_ADMIN_BASE_PATH` (e.g. `/admin-panel/`) so the SPA, the proxy, and the
// redirect all honor the operator-chosen path. Build output stays relative.
const adminBase = process.env.VITE_ADMIN_BASE_PATH ?? "/admin/";
const normalizedAdminBase = adminBase.endsWith("/") ? adminBase : `${adminBase}/`;
const adminPath = normalizedAdminBase.slice(0, -1);
const apiPrefix = `${adminPath}/api`;

export default defineConfig(({ command }) => ({
  root: path.resolve(__dirname, "./admin"),
  base: command === "build" ? "./" : normalizedAdminBase,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "admin-base-redirect",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === adminPath) {
            res.statusCode = 307;
            res.setHeader("Location", `${adminPath}/`);
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
      [apiPrefix]: {
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
    rolldownOptions: {
      output: {
        // Keep the admin entry chunk small and under the bundle budget by extracting
        // shared code into preloaded chunks (Rolldown dedupes shared modules across
        // groups, unlike rollupOptions.manualChunks which duplicated them).
        codeSplitting: {
          groups: [
            {
              name(id: string) {
                if (id.includes("/node_modules/")) {
                  // lucide-react is excluded so its full icon set stays in the
                  // dynamically imported timelineLucideIcons chunk (see timeline.tsx),
                  // not merged into an eager vendor chunk. Split the rest per package.
                  if (id.includes("/node_modules/lucide-react/")) return null;
                  const match = id.match(/\/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
                  return match ? `vendor-${match[1].replace(/[@/]/g, "-")}` : null;
                }
                return null;
              },
            },
          ],
        },
      },
    },
  },
}));
