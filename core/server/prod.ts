/**
 * Production entrypoint: thin mode adapter (TASK-551-02-L02).
 *
 * Supplies only production mode dependencies. All signal handling, HTTP
 * drain/force behavior, deadlines, and lifecycle close are owned by
 * `./runtimeEntrypoint`; this file installs no handlers of its own.
 */
import { startHttpServer } from "./httpServer";
import { createProductionEntrypointInput, runRuntimeEntrypoint } from "./runtimeEntrypoint";

const port = Number(process.env.PORT ?? 3000);

await runRuntimeEntrypoint(
  createProductionEntrypointInput({
    port,
    startHttpServer,
    logListen: (url) => console.log(`Core HTTP server listening on ${url}`),
  })
);
