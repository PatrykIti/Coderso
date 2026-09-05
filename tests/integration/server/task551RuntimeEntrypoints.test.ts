import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

import {
  HTTP_DRAIN_DEADLINE_MS,
  RUNTIME_ENTRYPOINT_ERROR_CODES,
  awaitManagedProcessesExitBounded,
  createDevelopmentEntrypointInput,
  createProcessShutdownSignal,
  createProductionEntrypointInput,
  runRuntimeEntrypoint,
  sanitizeRuntimeEntrypointError,
  stopAcceptingAndDrainHttp,
  type ManagedViteProcess,
  type RuntimeShutdownSignal,
} from "../../../core/server/runtimeEntrypoint";
import {
  DATABASE_CLOSE_BUDGET_MS,
  GRACEFUL_SHUTDOWN_DEADLINE_MS,
  PARTICIPANT_CLOSE_DEADLINE_MS,
  getRuntimeLifecycleCloseTimeouts,
  participantCloseBudgetMs,
  registerRuntimeLifecycleParticipant,
  resetRuntimeLifecycleForTests,
  type RuntimeLifecycleParticipant,
} from "../../../core/server/runtimeLifecycle";
import {
  registerDatabaseLifecycleParticipant,
  resetDatabaseLifecycleForTests,
  setDatabaseClientModuleForTests,
} from "../../../core/db/databaseLifecycle";

function makeFakeSignal(options: {
  receiveBeforeStart?: boolean;
}): RuntimeShutdownSignal & { fire(): void } {
  let received = options.receiveBeforeStart === true;
  let resolveWait: (() => void) | null = null;
  const waitPromise = new Promise<"signal">((resolve) => {
    resolveWait = () => resolve("signal");
  });
  return {
    alreadyReceived: () => received,
    reason: () => "signal",
    wait: () => waitPromise,
    dispose: () => {},
    fire: () => {
      received = true;
      resolveWait?.();
    },
  };
}

/**
 * Structurally assignable to `HttpServerHandle`, but with a writable `stop`
 * property so tests can swap in scripted stop implementations.
 */
type FakeServer = {
  port: number;
  pendingRequests: number;
  stopCalls: (boolean | undefined)[];
  stop: (closeActiveConnections?: boolean) => unknown;
};

function makeFakeServer(port = 4123): FakeServer {
  const handle = {
    port,
    pendingRequests: 0,
    stopCalls: [] as (boolean | undefined)[],
    stop: (closeActiveConnections?: boolean): unknown => {
      handle.stopCalls.push(closeActiveConnections);
      if (closeActiveConnections) handle.pendingRequests = 0;
      return undefined;
    },
  };
  return handle;
}

function resetSeams(fakeDb: object): void {
  resetRuntimeLifecycleForTests();
  resetDatabaseLifecycleForTests();
  setDatabaseClientModuleForTests(async () => fakeDb as never);
}

const noopDbModule = {
  verifyDatabaseSessions: async () => {},
  assertMaintenanceSessionAffinity: async () => {},
  assertMaintenanceSessionAffinityIfDeclared: async () => {},
  closeAllDatabaseClientsWithin: async () => {},
  listDatabaseClients: () => [],
};

function recordingParticipant(id: string, events: string[]): RuntimeLifecycleParticipant {
  return {
    id,
    phase: "worker",
    start: async () => {
      events.push(`${id}-start`);
    },
    close: async () => {
      events.push(`${id}-close`);
    },
  };
}

describe("task551 runtime entrypoints", () => {
  test("starts lifecycle before listen, drains on signal, then closes in reverse order", async () => {
    resetSeams(noopDbModule);
    const events: string[] = [];
    const server = makeFakeServer();
    const signal = makeFakeSignal({});
    registerRuntimeLifecycleParticipant({
      id: "probe-worker",
      phase: "worker",
      start: async () => {
        events.push("participant-start");
      },
      close: async () => {
        events.push("participant-close");
      },
    });
    await runRuntimeEntrypoint({
      createShutdownSignal: () => signal,
      startServer: () => {
        // All awaited participants are running before any listener opens.
        expect(events).toContain("participant-start");
        events.push("listen");
        // Deliver the shutdown signal once we are in the running state.
        setTimeout(() => signal.fire(), 10);
        return server;
      },
      httpDrainDeadlineMs: HTTP_DRAIN_DEADLINE_MS,
    });
    expect(events.slice(0, 2)).toEqual(["participant-start", "listen"]);
    // Stop-acceptance happens before reverse-lifecycle close.
    expect(server.stopCalls[0]).toBe(false);
    expect(events[events.length - 1]).toBe("participant-close");
  });

  test("never listens after an in-startup signal and closes the lifecycle", async () => {
    resetSeams(noopDbModule);
    let listened = false;
    const signal = makeFakeSignal({ receiveBeforeStart: true });
    await runRuntimeEntrypoint({
      createShutdownSignal: () => signal,
      startServer: () => {
        listened = true;
        return makeFakeServer();
      },
    });
    expect(listened).toBe(false);
  });

  test("closes the already-started lifecycle when listen fails", async () => {
    resetSeams(noopDbModule);
    const events: string[] = [];
    registerRuntimeLifecycleParticipant({
      id: "cache-probe",
      phase: "cache",
      start: async () => {
        events.push("start");
      },
      close: async () => {
        events.push("close");
      },
    });
    await expect(
      runRuntimeEntrypoint({
        createShutdownSignal: () => makeFakeSignal({}),
        startServer: () => {
          throw new Error("listen_failed");
        },
      })
    ).rejects.toThrowError("listen_failed");
    // Partial-start rollback closed every started participant; zero listeners.
    expect(events).toEqual(["start", "close"]);
  });

  test("never listens when a lifecycle participant fails to start", async () => {
    resetSeams(noopDbModule);
    let listened = false;
    registerRuntimeLifecycleParticipant({
      id: "failing",
      phase: "worker",
      start: async () => {
        throw new Error("participant_boom");
      },
      close: async () => {},
    });
    await expect(
      runRuntimeEntrypoint({
        createShutdownSignal: () => makeFakeSignal({}),
        startServer: () => {
          listened = true;
          return makeFakeServer();
        },
      })
    ).rejects.toThrowError("participant_boom");
    expect(listened).toBe(false);
  });

  test("forces the stop(true) branch when pending work outlives the drain window", async () => {
    const server = makeFakeServer();
    server.pendingRequests = 2;
    await stopAcceptingAndDrainHttp(server, { gracefulMs: 30 });
    expect(server.stopCalls[0]).toBe(false);
    expect(server.stopCalls).toContain(true);
    expect(server.pendingRequests).toBe(0);
  });

  test("coalesces concurrent SIGINT/SIGTERM through one one-shot owner", async () => {
    const signal = createProcessShutdownSignal();
    expect(signal.alreadyReceived()).toBe(false);
    const waited = signal.wait();
    process.emit("SIGINT");
    process.emit("SIGTERM");
    expect(await waited).toBe("signal");
    expect(signal.alreadyReceived()).toBe(true);
    // The one-shot handlers are removed on dispose: no further delivery.
    signal.dispose();
    expect(signal.reason()).toBe("signal");
  });

  test("bounds the drain: graceful completion skips the forced branch", async () => {
    const handle = makeFakeServer();
    let resolveStop: (() => void) | null = null;
    handle.stop = (closeActiveConnections?: boolean) => {
      handle.stopCalls.push(closeActiveConnections);
      if (closeActiveConnections) {
        handle.pendingRequests = 0;
        return;
      }
      // Graceful drain settles well inside the window.
      return new Promise<void>((resolve) => {
        resolveStop = resolve;
      });
    };
    const drained = stopAcceptingAndDrainHttp(handle, { gracefulMs: 5_000 });
    setTimeout(() => resolveStop?.(), 10);
    await drained;
    expect(handle.stopCalls).toEqual([false]);
  });

  test("runs the forced branch when forced even after a graceful drain", async () => {
    const handle = makeFakeServer();
    await stopAcceptingAndDrainHttp(handle, { gracefulMs: 5_000, force: true });
    expect(handle.stopCalls).toEqual([false, true]);
  });

  test("awaits the outstanding graceful stop after the forced branch", async () => {
    const handle = makeFakeServer();
    let gracefulSettled = false;
    handle.stop = (closeActiveConnections?: boolean) => {
      handle.stopCalls.push(closeActiveConnections);
      if (closeActiveConnections) {
        handle.pendingRequests = 0;
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gracefulSettled = true;
          resolve();
        }, 15);
      });
    };
    await stopAcceptingAndDrainHttp(handle, { gracefulMs: 0, force: true });
    // The graceful stop promise was never abandoned: it settled before the
    // drain returned, after the forced branch completed.
    expect(handle.stopCalls).toEqual([false, true]);
    expect(gracefulSettled).toBe(true);
  });

  test("sanitizes entrypoint failures: URLs redacted, text bounded, non-Error collapsed", () => {
    const redacted = sanitizeRuntimeEntrypointError(
      new Error("connect failed to postgres://db-user:db-pass@db.invalid:5432/coderso")
    );
    expect(redacted.message).not.toContain("db-pass");
    expect(redacted.message).not.toContain("db.invalid");
    expect(redacted.message).toContain("[redacted-url]");

    const long = sanitizeRuntimeEntrypointError(new Error("x".repeat(1_000)));
    expect(long.message.length).toBeLessThanOrEqual(303);
    expect(long.message.endsWith("...")).toBe(true);

    const collapsed = sanitizeRuntimeEntrypointError("raw-string-failure");
    expect(collapsed.message).toBe(RUNTIME_ENTRYPOINT_ERROR_CODES.startupFailure);
  });

  test("awaits managed dev children, and force-terminates ones that hang", async () => {
    let exits = 0;
    const quick: ManagedViteProcess = {
      kill: () => {},
      exited: new Promise((resolve) =>
        setTimeout(() => {
          exits += 1;
          resolve(undefined);
        }, 10)
      ),
    };
    await awaitManagedProcessesExitBounded([quick], 5_000);
    expect(exits).toBe(1);

    let killed: string[] = [];
    const hung: ManagedViteProcess = {
      kill: (signal) => {
        killed = [...killed, signal ?? "SIGTERM"];
      },
      exited: new Promise(() => undefined), // never settles
    };
    const startedAt = Date.now();
    await awaitManagedProcessesExitBounded([hung], 15);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(killed).toEqual(["SIGKILL"]);
  });
});

describe("mode adapters through injected fakes", () => {
  test("production adapter: full start -> listen -> drain -> forced stop -> close sequence", async () => {
    resetSeams(noopDbModule);
    const events: string[] = [];
    const closeBudgets: number[] = [];
    setDatabaseClientModuleForTests(
      async () =>
        ({
          ...noopDbModule,
          closeAllDatabaseClientsWithin: async (budgetMs: number) => {
            closeBudgets.push(budgetMs);
          },
        }) as never
    );
    registerDatabaseLifecycleParticipant();
    const server = makeFakeServer(4321);
    const signal = makeFakeSignal({});
    const listenedPorts: number[] = [];
    const listenLogs: string[] = [];
    const input = createProductionEntrypointInput({
      port: 4321,
      startHttpServer: ({ port }) => {
        listenedPorts.push(port);
        events.push("listen");
        setTimeout(() => signal.fire(), 10);
        return server;
      },
      logListen: (url) => listenLogs.push(url),
    });
    // Production registers no mode sidecar participants.
    expect(input.registerModeParticipants).toBeUndefined();
    registerRuntimeLifecycleParticipant(recordingParticipant("worker-probe", events));
    await runRuntimeEntrypoint({
      ...input,
      createShutdownSignal: () => signal,
      httpDrainDeadlineMs: 15,
    });
    expect(listenedPorts).toEqual([4321]);
    expect(listenLogs).toEqual(["http://0.0.0.0:4321"]);
    expect(server.stopCalls).toEqual([false, true]);
    // Stop-accepting precedes the reverse close, and the database participant
    // receives its explicit min(10s, remaining) budget, not the 5s ceiling.
    expect(events[events.length - 1]).toBe("worker-probe-close");
    expect(closeBudgets).toHaveLength(1);
    expect(closeBudgets[0]!).toBeGreaterThan(5_000);
    expect(closeBudgets[0]!).toBeLessThanOrEqual(10_000);
  });

  test("development adapter: vite sidecars start before listen and close before teardown", async () => {
    resetSeams(noopDbModule);
    const events: string[] = [];
    const server = makeFakeServer(3000);
    const signal = makeFakeSignal({});
    const spawnedConfigs: string[] = [];
    const input = createDevelopmentEntrypointInput({
      port: 3000,
      adminDevUrl: "http://localhost:5173",
      siteViteUrl: "http://localhost:5174",
      startHttpServer: () => {
        // Both awaited sidecars are already started when the listener opens.
        expect(events.filter((event) => event.startsWith("vite-start"))).toHaveLength(2);
        events.push("listen");
        setTimeout(() => signal.fire(), 10);
        return server;
      },
      spawnViteProcess: (configName) => {
        spawnedConfigs.push(configName);
        events.push(`vite-start:${configName}`);
        return {
          kill: (signalName) => events.push(`vite-kill:${signalName ?? "SIGTERM"}`),
          exited: Promise.resolve(undefined),
        };
      },
      logListen: () => {},
      viteExitGraceMs: 20,
    });
    expect(typeof input.registerModeParticipants).toBe("function");
    registerRuntimeLifecycleParticipant(recordingParticipant("worker-probe", events));
    // The database participant is a lifecycle peer that closes last.
    registerRuntimeLifecycleParticipant({
      id: "database-close",
      phase: "database",
      start: async () => undefined,
      close: async () => {
        events.push("database-close");
      },
    });
    await runRuntimeEntrypoint({
      ...input,
      createShutdownSignal: () => signal,
      httpDrainDeadlineMs: 15,
    });
    expect(spawnedConfigs).toEqual(["vite.config.ts", "vite.site.config.ts"]);
    // Sidecars close (reverse worker order) before the database teardown.
    expect(events.slice(-4)).toEqual([
      "vite-kill:SIGTERM",
      "vite-kill:SIGTERM",
      "worker-probe-close",
      "database-close",
    ]);
    expect(server.stopCalls).toEqual([false, true]);
  });

  test("keeps zero listeners when a dev sidecar start fails", async () => {
    resetSeams(noopDbModule);
    let listened = false;
    const input = createDevelopmentEntrypointInput({
      port: 3000,
      adminDevUrl: "http://localhost:5173",
      siteViteUrl: "http://localhost:5174",
      startHttpServer: () => {
        listened = true;
        return makeFakeServer();
      },
      spawnViteProcess: () => {
        throw new Error("vite_spawn_boom");
      },
    });
    await expect(
      runRuntimeEntrypoint({ ...input, createShutdownSignal: () => makeFakeSignal({}) })
    ).rejects.toThrowError("vite_spawn_boom");
    expect(listened).toBe(false);
  });

  test("clocks the drain against the shared absolute shutdown deadline", async () => {
    resetSeams(noopDbModule);
    const recorded: { phase: string; budget: number }[] = [];
    registerRuntimeLifecycleParticipant({
      id: "worker-clock",
      phase: "worker",
      start: async () => undefined,
      close: async (_reason, context) => {
        recorded.push({
          phase: "worker",
          budget: participantCloseBudgetMs("worker", context.absoluteDeadline),
        });
      },
    });
    const drainMs = 25;
    const startedAt = Date.now();
    const server = makeFakeServer();
    server.stop = (closeActiveConnections?: boolean) => {
      server.stopCalls.push(closeActiveConnections);
      if (closeActiveConnections) server.pendingRequests = 0;
      // The graceful drain consumes its configured window inside the shared
      // absolute deadline that was created before the drain started.
      if (!closeActiveConnections) {
        return new Promise<void>((resolve) => setTimeout(resolve, drainMs));
      }
      return undefined;
    };
    const signal = makeFakeSignal({});
    await runRuntimeEntrypoint({
      startServer: () => {
        setTimeout(() => signal.fire(), 5);
        return server;
      },
      createShutdownSignal: () => signal,
      httpDrainDeadlineMs: drainMs,
    });
    const elapsedBeforeClose = Date.now() - startedAt - drainMs;
    // The worker close ceiling is the 5s cap; the database phase receives the
    // full remaining global time (bounded by its own 10s exception).
    expect(recorded[0]!.phase).toBe("worker");
    expect(recorded[0]!.budget).toBe(5_000);
    expect(elapsedBeforeClose).toBeLessThan(GRACEFUL_SHUTDOWN_DEADLINE_MS);
  });

  test("charges a full 10-second HTTP drain to the shared shutdown deadline", async () => {
    resetSeams(noopDbModule);
    const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    const observed: { phase: string; budget: number; absoluteDeadline: number }[] = [];
    let databaseSettled = false;
    registerRuntimeLifecycleParticipant({
      id: "worker-remaining",
      phase: "worker",
      start: async () => undefined,
      close: async (_reason, context) => {
        observed.push({
          phase: "worker",
          budget: participantCloseBudgetMs("worker", context.absoluteDeadline),
          absoluteDeadline: context.absoluteDeadline,
        });
      },
    });
    registerRuntimeLifecycleParticipant({
      id: "database-remaining",
      phase: "database",
      start: async () => undefined,
      close: async (_reason, context) => {
        observed.push({
          phase: "database",
          budget: participantCloseBudgetMs("database", context.absoluteDeadline),
          absoluteDeadline: context.absoluteDeadline,
        });
        // Runs past the shared absolute deadline on purpose: the database
        // phase is the one participant never wrapped in the 5-second race, so
        // this overstep must still be awaited to a terminal state.
        await sleep(Math.max(0, context.absoluteDeadline - Date.now()) + 100);
        databaseSettled = true;
      },
    });
    const server = makeFakeServer();
    server.pendingRequests = 2;
    server.stop = (closeActiveConnections?: boolean) => {
      server.stopCalls.push(closeActiveConnections);
      if (closeActiveConnections) {
        server.pendingRequests = 0;
        return undefined;
      }
      // The graceful drain never settles inside its window: the clocked drain
      // consumes the whole 10-second HTTP ceiling.
      return sleep(HTTP_DRAIN_DEADLINE_MS + 50);
    };
    const signal = makeFakeSignal({});
    const startedAt = Date.now();
    await runRuntimeEntrypoint({
      startServer: () => {
        setTimeout(() => signal.fire(), 5);
        return server;
      },
      createShutdownSignal: () => signal,
      httpDrainDeadlineMs: HTTP_DRAIN_DEADLINE_MS,
    });
    const elapsed = Date.now() - startedAt;
    // Both close phases read the same absolute deadline, created before the
    // drain started rather than after it.
    expect(observed).toHaveLength(2);
    expect(observed[0]!.absoluteDeadline).toBe(observed[1]!.absoluteDeadline);
    const worker = observed[0]!;
    const database = observed[1]!;
    // Non-database phases receive only the remaining global time: after a full
    // 10-second drain that is below the 5-second participant ceiling.
    expect(worker.budget).toBeGreaterThanOrEqual(4_000);
    expect(worker.budget).toBeLessThan(PARTICIPANT_CLOSE_DEADLINE_MS);
    // The database exception is min(10s, remaining) on the same clock, never a
    // fresh 10 seconds and never a 5-second race cap.
    expect(database.budget).toBeGreaterThanOrEqual(4_000);
    expect(database.budget).toBeLessThanOrEqual(worker.budget);
    expect(database.budget).toBeLessThan(DATABASE_CLOSE_BUDGET_MS);
    // The overstepping database close was awaited past the shared deadline, not
    // abandoned, and the database phase recorded no participant-ceiling timeout
    // (a non-database close that outlives its ceiling is recorded instead).
    expect(databaseSettled).toBe(true);
    expect(getRuntimeLifecycleCloseTimeouts()).not.toContain("database-remaining");
    // One 15-second budget covered the drain, the close phases, and the awaited
    // overstep: no fresh deadline was granted after the drain.
    expect(elapsed).toBeGreaterThanOrEqual(GRACEFUL_SHUTDOWN_DEADLINE_MS);
    expect(elapsed).toBeLessThan(GRACEFUL_SHUTDOWN_DEADLINE_MS + 2_000);
    expect(server.stopCalls[0]).toBe(false);
  }, 30_000);

  test("pins that the mode adapters install no handlers and never exit the process", () => {
    const readSource = (relative: string): string =>
      readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
    for (const relative of ["../../../core/server/prod.ts", "../../../core/server/dev.ts"]) {
      const source = readSource(relative);
      expect(source).not.toMatch(/process\.(on|once|addListener)\s*\(/);
      expect(source).not.toMatch(/process\.exit\s*\(/);
      // dev.ts forwards a signal to its own child; it never installs a
      // process-level SIGINT/SIGTERM handler.
      expect(source).not.toMatch(/["']SIG(INT|TERM)["']\s*\)/);
      expect(source).not.toMatch(/\.stop\s*\(/);
      expect(source).toMatch(/runRuntimeEntrypoint\(/);
    }
    // Both adapters delegate to the shared owner through its mode factory.
    expect(
      readFileSync(fileURLToPath(new URL("../../../core/server/prod.ts", import.meta.url)), "utf8")
    ).toMatch(/createProductionEntrypointInput/);
    expect(
      readFileSync(fileURLToPath(new URL("../../../core/server/dev.ts", import.meta.url)), "utf8")
    ).toMatch(/createDevelopmentEntrypointInput/);
  });
});
