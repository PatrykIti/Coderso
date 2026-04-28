import { startHttpServer } from "./httpServer";

const port = Number(process.env.PORT ?? 3000);
const viteUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
const siteViteUrl = process.env.VITE_SITE_DEV_SERVER_URL ?? "http://localhost:5174";
process.env.VITE_DEV_SERVER_URL = viteUrl;
process.env.VITE_SITE_DEV_SERVER_URL = siteViteUrl;

const server = startHttpServer({ port, adminDevUrl: viteUrl });
console.log(`Core HTTP server listening on http://localhost:${server.port}`);

const viteProcess = Bun.spawn([
  "bunx",
  "vite",
  "--config",
  "vite.config.ts",
  "--port",
  new URL(viteUrl).port || "5173",
]);
const siteViteProcess = Bun.spawn([
  "bunx",
  "vite",
  "--config",
  "vite.site.config.ts",
  "--port",
  new URL(siteViteUrl).port || "5174",
]);

const shutdown = () => {
  viteProcess.kill();
  siteViteProcess.kill();
  server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
