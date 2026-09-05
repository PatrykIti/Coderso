/**
 * Sole process-signal and HTTP drain owner (TASK-551-02-L02).
 *
 * `prod.ts` and `dev.ts` are thin mode adapters that delegate here; neither
 * installs its own handlers, deadline, or stop call. This owner installs one
 * temporary SIGINT/SIGTERM pair before startup, removes it in `finally`, never
 * calls `process.exit` from a handler, starts the lifecycle (and only then the
 * HTTP listener), waits for a signal in the running state, drains/forces HTTP
 * within the exact ceilings, and awaits the reverse lifecycle close — all
 * against the one absolute shutdown deadline created before the drain starts.
 *
 * The mode factories below are the real production/development adapter logic:
 * `prod.ts`/`dev.ts` only supply the mode bindings (port, URLs, server
 * starter, Vite spawner), so the full start -> listen -> drain -> close
 * sequence stays testable through injected fakes.
 */
import {
  closeRuntimeLifecycle,
  createShutdownAbsoluteDeadline,
  registerRuntimeLifecycleParticipant,
  startRuntimeLifecycle,
  type RuntimeLifecycleParticipant,
} from "./runtimeLifecycle";
import {
  HTTP_DRAIN_DEADLINE_MS,
  registerDatabaseLifecycleParticipant,
} from "../db/databaseLifecycle";

export { HTTP_DRAIN_DEADLINE_MS };

/** Structural subset of Bun's server handle this owner needs. */
export type HttpServerHandle = Readonly<{
  readonly port?: number;
  stop(closeActiveConnections?: boolean): unknown;
  readonly pendingRequests?: number;
}>;

/** One-shot shutdown signal surface (injectable for tests). */
export type RuntimeShutdownSignal = Readonly<{
  alreadyReceived(): boolean;
  reason(): "signal" | "startup_failure";
  wait(): Promise<"signal">;
  dispose(): void;
}>;

export type RuntimeEntrypointInput = Readonly<{
  /** Side-effect-free registration of mode participants (e.g. dev Vite). */
  registerModeParticipants?: () => void;
  startServer: () => HttpServerHandle;
  httpDrainDeadlineMs?: number;
  createShutdownSignal?: () => RuntimeShutdownSignal;
}>;

/** Mode-supplied HTTP starter: the static composition import stays in the adapter. */
export type ModeHttpServerStarter = (options: {
  port: number;
  adminDevUrl?: string;
}) => HttpServerHandle;

/** Managed development child surface (injectable for tests). */
export type ManagedViteProcess = Readonly<{
  kill(signal?: "SIGTERM" | "SIGKILL"): void;
  exited: Promise<unknown>;
}>;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bounded failure categories. Startup/shutdown failures stay enumerated
 * strings: raw driver text, binds, and URLs never surface through this owner.
 */
export const RUNTIME_ENTRYPOINT_ERROR_CODES = {
  startupFailure: "runtime_entrypoint_startup_failure",
} as const;

const URL_PATTERN = /(?:postgres(?:ql)?|https?):\/\/\S+/gu;
const MAX_ERROR_TEXT_LENGTH = 300;

/**
 * Bounds an error for the entrypoint boundary: known Error messages pass
 * through (truncated), connection URLs are redacted, and non-Error throwables
 * collapse to one bounded category.
 */
export function sanitizeRuntimeEntrypointError(error: unknown): Error {
  if (error instanceof Error) {
    const redacted = error.message.replace(URL_PATTERN, "[redacted-url]");
    const message =
      redacted.length > MAX_ERROR_TEXT_LENGTH
        ? `${redacted.slice(0, MAX_ERROR_TEXT_LENGTH)}...`
        : redacted;
    return message === error.message ? error : new Error(message);
  }
  return new Error(RUNTIME_ENTRYPOINT_ERROR_CODES.startupFailure);
}

/**
 * Default one-shot SIGINT/SIGTERM coalescing owner. Exactly one temporary
 * handler pair is installed; concurrent signals resolve the same wait.
 */
export function createProcessShutdownSignal(): RuntimeShutdownSignal {
  let received = false;
  let dispose = (): void => {};
  const waitPromise = new Promise<"signal">((resolve) => {
    const onSignal = (): void => {
      if (received) return;
      received = true;
      resolve("signal");
    };
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    dispose = () => {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
    };
  });
  return Object.freeze({
    alreadyReceived: () => received,
    reason: () => "signal",
    wait: () => waitPromise,
    dispose,
  });
}

async function awaitBoundedStop(
  stop: () => unknown,
  gracefulMs: number
): Promise<"stopped" | "elapsed"> {
  let stopPromise: Promise<unknown>;
  try {
    stopPromise = Promise.resolve(stop());
  } catch {
    stopPromise = Promise.resolve();
  }
  return Promise.race([
    stopPromise.then((): "stopped" => "stopped").catch((): "stopped" => "stopped"),
    sleep(Math.max(0, gracefulMs)).then((): "elapsed" => "elapsed"),
  ]);
}

/**
 * Stops acceptance and awaits the graceful drain for at most `gracefulMs`; at
 * the deadline it awaits the forced `stop(true)` branch and then the still
 * outstanding graceful stop, so no stop promise keeps running detached.
 */
export async function stopAcceptingAndDrainHttp(
  handle: HttpServerHandle,
  options: { gracefulMs: number; force?: boolean }
): Promise<void> {
  let gracefulStop: Promise<unknown> = Promise.resolve();
  let gracefulSettled = true;
  try {
    const maybePromise = handle.stop(false); // Stop accepting first; keep active work.
    gracefulSettled = false;
    gracefulStop = Promise.resolve(maybePromise);
  } catch {
    // Bounded category; the forced branch below still runs.
    gracefulSettled = true;
  }
  const outcome = await awaitBoundedStop(
    () => (gracefulSettled ? Promise.resolve() : gracefulStop),
    options.gracefulMs
  );
  const workRemains = (handle.pendingRequests ?? 0) > 0;
  if (outcome === "elapsed" || workRemains || options.force === true) {
    try {
      // The forced branch is awaited to terminal state, never detached.
      await handle.stop(true);
    } catch {
      // Bounded category; the graceful stop await below still runs.
    }
  }
  if (!gracefulSettled) {
    // Never abandon the graceful stop promise: after the forced stop it
    // resolves promptly, and its rejection stays a bounded category.
    await gracefulStop.catch(() => undefined);
  }
}

async function stopAcceptingAndDrainHttpBestEffort(handle: HttpServerHandle): Promise<void> {
  try {
    await stopAcceptingAndDrainHttp(handle, { gracefulMs: 0 });
  } catch {
    // Startup-failure rollback must never mask the original error.
  }
}

/**
 * The single runtime entrypoint algorithm shared by production and
 * development. See module docstring for the ordering guarantees.
 */
export async function runRuntimeEntrypoint(input: RuntimeEntrypointInput): Promise<void> {
  const signal = input.createShutdownSignal?.() ?? createProcessShutdownSignal();
  let server: HttpServerHandle | null = null;
  let lifecycleStarted = false;
  try {
    // Registration is side-effect-free; the database participant joins here so
    // every mode shares one lifecycle.
    input.registerModeParticipants?.();
    registerDatabaseLifecycleParticipant();
    await startRuntimeLifecycle();
    lifecycleStarted = true;
    if (signal.alreadyReceived()) {
      await closeRuntimeLifecycle(signal.reason());
      lifecycleStarted = false;
      return; // Never open a listener after an in-startup signal.
    }
    server = input.startServer(); // All awaited participants are running first.
    await signal.wait(); // Explicit running boundary.
    // The one absolute shutdown deadline starts here, before stop-accepting,
    // so the complete stop-accepting -> worker -> cache -> database sequence
    // shares it: a drain that consumes its whole 10-second window leaves the
    // later phases only the remaining global time.
    const shutdownAbsoluteDeadline = createShutdownAbsoluteDeadline();
    await stopAcceptingAndDrainHttp(server, {
      gracefulMs: input.httpDrainDeadlineMs ?? HTTP_DRAIN_DEADLINE_MS,
      force: true,
    });
    server = null;
    await closeRuntimeLifecycle("signal", { absoluteDeadline: shutdownAbsoluteDeadline }); // worker -> cache -> database.
    lifecycleStarted = false;
  } catch (error) {
    // startRuntimeLifecycle owns partial-start rollback. If listen or later
    // work fails, stop any opened listener before closing started participants.
    if (server) await stopAcceptingAndDrainHttpBestEffort(server);
    if (lifecycleStarted) await closeRuntimeLifecycle("startup_failure");
    throw sanitizeRuntimeEntrypointError(error);
  } finally {
    signal.dispose();
  }
}

/** Mode adapter input for production: no sidecar participants, one listener. */
export type ProductionEntrypointModeInput = Readonly<{
  port: number;
  startHttpServer: ModeHttpServerStarter;
  logListen?: (url: string) => void;
}>;

/**
 * Builds the production mode input: the lifecycle starts every registered
 * participant before the listener opens, and the adapter owns no drain,
 * forced-stop, or signal logic of its own.
 */
export function createProductionEntrypointInput(
  input: ProductionEntrypointModeInput
): RuntimeEntrypointInput {
  return {
    startServer: () => {
      const server = input.startHttpServer({ port: input.port });
      input.logListen?.(`http://0.0.0.0:${server.port ?? input.port}`);
      return server;
    },
  };
}

/** Mode adapter input for development: awaited Vite children join the lifecycle. */
export type DevelopmentEntrypointModeInput = Readonly<{
  port: number;
  adminDevUrl: string;
  siteViteUrl: string;
  startHttpServer: ModeHttpServerStarter;
  spawnViteProcess: (configName: string, url: string) => ManagedViteProcess;
  logListen?: (url: string) => void;
  viteExitGraceMs?: number;
}>;

/**
 * Awaits development child exits within `graceMs`, then force-terminates and
 * awaits again. A child that survives both stages stays a bounded category
 * instead of leaving the close promise waiting forever.
 */
export async function awaitManagedProcessesExitBounded(
  children: readonly ManagedViteProcess[],
  graceMs: number
): Promise<void> {
  const exits = (): Promise<void> =>
    Promise.all(children.map((child) => child.exited)).then(() => undefined);
  const settled = await Promise.race([exits(), sleep(graceMs).then(() => "elapsed" as const)]);
  if (settled === "elapsed") {
    for (const child of children) child.kill("SIGKILL");
    await Promise.race([exits(), sleep(graceMs)]);
  }
}

/**
 * Builds the development mode input. Registration is side-effect-free: the
 * awaited Vite child start/close callbacks are lifecycle participants, not
 * post-listen work, so they start with the lifecycle (after database/cache)
 * and close in the reverse worker-phase order before cache/database teardown.
 */
export function createDevelopmentEntrypointInput(
  input: DevelopmentEntrypointModeInput
): RuntimeEntrypointInput {
  let adminVite: ManagedViteProcess | null = null;
  let siteVite: ManagedViteProcess | null = null;
  const registerModeParticipants = (): void => {
    const participant: RuntimeLifecycleParticipant = {
      id: "vite-sidecars",
      phase: "worker",
      start: async () => {
        adminVite = input.spawnViteProcess("vite.config.ts", input.adminDevUrl);
        siteVite = input.spawnViteProcess("vite.site.config.ts", input.siteViteUrl);
      },
      close: async () => {
        const children = [adminVite, siteVite].filter(
          (child): child is ManagedViteProcess => child !== null
        );
        adminVite = null;
        siteVite = null;
        for (const child of children) child.kill();
        await awaitManagedProcessesExitBounded(children, input.viteExitGraceMs ?? 2_000);
      },
    };
    registerRuntimeLifecycleParticipant(participant);
  };
  return {
    registerModeParticipants,
    startServer: () => {
      const server = input.startHttpServer({
        port: input.port,
        adminDevUrl: input.adminDevUrl,
      });
      input.logListen?.(`http://localhost:${server.port ?? input.port}`);
      return server;
    },
  };
}
