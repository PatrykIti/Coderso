import { startHttpServer } from "./httpServer";

const port = Number(process.env.PORT ?? 3000);
const viteUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
process.env.VITE_DEV_SERVER_URL = viteUrl;

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

const shutdown = () => {
  viteProcess.kill();
  server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
