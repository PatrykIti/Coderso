/**
 * Development entrypoint: thin mode adapter (TASK-551-02-L02).
 *
 * Supplies development mode dependencies: the admin/site Vite sidecars run as
 * lifecycle participants so they start before the listener accepts traffic and
 * close (bounded) during reverse lifecycle shutdown. Signal handling, drain,
 * and close ordering are owned exclusively by `./runtimeEntrypoint`; this file
 * installs no handlers and never calls `process.exit`.
 */
import { startHttpServer } from "./httpServer";
import {
  createDevelopmentEntrypointInput,
  runRuntimeEntrypoint,
  type ManagedViteProcess,
} from "./runtimeEntrypoint";

const port = Number(process.env.PORT ?? 3000);
const viteUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
const siteViteUrl = process.env.VITE_SITE_DEV_SERVER_URL ?? "http://localhost:5174";
process.env.VITE_DEV_SERVER_URL = viteUrl;
process.env.VITE_SITE_DEV_SERVER_URL = siteViteUrl;

function spawnViteProcess(configName: string, url: string): ManagedViteProcess {
  const child = Bun.spawn([
    "bunx",
    "vite",
    "--config",
    configName,
    "--port",
    new URL(url).port || (configName === "vite.config.ts" ? "5173" : "5174"),
  ]);
  return {
    kill: (signal?: "SIGTERM" | "SIGKILL") => {
      try {
        child.kill(signal);
      } catch {
        // Already exited.
      }
    },
    exited: child.exited,
  };
}

await runRuntimeEntrypoint(
  createDevelopmentEntrypointInput({
    port,
    adminDevUrl: viteUrl,
    siteViteUrl,
    startHttpServer,
    spawnViteProcess,
    logListen: (url) => console.log(`Core HTTP server listening on ${url}`),
  })
);
