import { spawn } from "node:child_process";
import { access, lstat, readFile, readdir, readlink, realpath, stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";

import { parseCliArgs } from "./child-descriptors.mjs";
import { crossCheckRawEnvironment } from "./environment-preflight.mjs";
import {
  cloneIdentity,
  freezeReadyProjection,
  listProcessIdentities,
  PORTS,
  provePortsAbsent,
  readIdentity,
  stableStartupProof,
} from "./process-identity.mjs";
import {
  validateCanonicalRootAndToolchain,
  validateViteCacheAuthorities,
} from "./preflight.mjs";
import { exactOrderedDataObject, invariant } from "./validation.mjs";

export function createServeRuntime(configuration) {
  exactOrderedDataObject(
    configuration,
    [
      "CHILD_READY_MARKERS",
      "READY_TIMEOUT_MS",
      "childDescriptors",
      "createBoundedDrain",
      "createDescendantStopController",
      "validateChildDescriptors",
    ],
    "serve-runtime configuration"
  );
  const {
    CHILD_READY_MARKERS,
    READY_TIMEOUT_MS,
    childDescriptors,
    createBoundedDrain,
    createDescendantStopController,
    validateChildDescriptors,
  } = configuration;
  exactOrderedDataObject(
    CHILD_READY_MARKERS,
    ["backend", "admin", "site"],
    "serve-runtime ready markers"
  );
  invariant(
    Object.isFrozen(CHILD_READY_MARKERS) &&
      Object.values(CHILD_READY_MARKERS).every(
        (marker) => typeof marker === "string" && marker.length > 0
      ),
    "serve-runtime ready markers drift"
  );
  invariant(
    Number.isSafeInteger(READY_TIMEOUT_MS) && READY_TIMEOUT_MS > 0,
    "serve-runtime readiness timeout drift"
  );
  invariant(
    [
      childDescriptors,
      createBoundedDrain,
      createDescendantStopController,
      validateChildDescriptors,
    ].every((callback) => typeof callback === "function"),
    "serve-runtime callback drift"
  );

  function createRuntimeDependencies() {
    return {
      pid: process.pid,
      environment: process.env,
      stdoutWrite(value) {
        process.stdout.write(value);
      },
      onceSignal(signal, callback) {
        process.once(signal, callback);
      },
      spawn,
      access,
      lstat,
      readFile,
      readdir,
      readlink,
      realpath,
      stat,
      delay,
      monotonicNow() {
        return performance.now();
      },
      signalPid(pid, signal) {
        process.kill(pid, signal);
      },
    };
  }

  async function runHostCli(args, adapters) {
    exactOrderedDataObject(
      adapters,
      ["runSelfTest", "createRuntimeDependencies"],
      "host CLI adapters"
    );
    invariant(
      typeof adapters.runSelfTest === "function" &&
        typeof adapters.createRuntimeDependencies === "function",
      "host CLI adapter type drift"
    );
    const command = parseCliArgs(args);
    if (command.mode === "self-test") return adapters.runSelfTest();
    return serve(command.root, adapters.createRuntimeDependencies());
  }

  function createStartupDeadline(deps) {
    invariant(
      typeof deps.monotonicNow === "function" && typeof deps.delay === "function",
      "startup monotonic clock dependencies drift"
    );
    const startedAt = deps.monotonicNow();
    invariant(
      typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt >= 0,
      "startup monotonic epoch drift"
    );
    const expiresAt = startedAt + READY_TIMEOUT_MS;
    invariant(Number.isFinite(expiresAt), "startup monotonic deadline overflow");
    let lastObservedAt = startedAt;
    const read = () => {
      const observedAt = deps.monotonicNow();
      invariant(
        typeof observedAt === "number" && Number.isFinite(observedAt) && observedAt >= lastObservedAt,
        "startup monotonic clock regressed"
      );
      lastObservedAt = observedAt;
      return observedAt;
    };
    return Object.freeze({
      assertActive(boundary) {
        invariant(
          typeof boundary === "string" && boundary.length > 0 && read() < expiresAt,
          "startup deadline expired at " + boundary
        );
      },
      async boundedDelay(requestedMs, boundary) {
        invariant(
          Number.isSafeInteger(requestedMs) &&
            requestedMs > 0 &&
            typeof boundary === "string" &&
            boundary.length > 0,
          "startup bounded-delay contract drift"
        );
        const before = read();
        const remaining = expiresAt - before;
        invariant(remaining > 0, "startup deadline expired before " + boundary);
        await deps.delay(Math.min(requestedMs, remaining));
        const after = read();
        invariant(after <= expiresAt, "startup delay crossed its monotonic deadline");
        return after < expiresAt;
      },
    });
  }

  async function waitForDirectChildIdentity(child, runnerIdentity, deps, startupDeadline) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      startupDeadline.assertActive(child.kind + " identity attempt");
      invariant(!child.spawnFailed, child.kind + " failed to spawn");
      invariant(
        child.process.exitCode === null && child.process.signalCode === null,
        child.kind + " exited before identity retention"
      );
      try {
        const identity = await readIdentity(child.process.pid, deps);
        invariant(
          identity.ppid === runnerIdentity.pid && identity.pgid === runnerIdentity.pgid,
          child.kind + " initial lineage drift"
        );
        return cloneIdentity(identity);
      } catch {
        if (attempt === 49) break;
        if (!(await startupDeadline.boundedDelay(20, child.kind + " identity retry delay"))) {
          break;
        }
      }
    }
    invariant(false, child.kind + " identity retention timed out");
  }

  async function serve(root, deps) {
    const environment = await crossCheckRawEnvironment(deps);
    await validateCanonicalRootAndToolchain(root, environment, deps);
    const runnerIdentity = cloneIdentity(await readIdentity(deps.pid, deps));
    invariant(
      runnerIdentity.pid === runnerIdentity.pgid,
      "host runner is not its process-group leader"
    );
    const startupDeadline = createStartupDeadline(deps);
    startupDeadline.assertActive("initial port-absence proof");
    invariant(await provePortsAbsent(deps), "one or more smoke ports are already owned");
    startupDeadline.assertActive("first port-absence proof");
    invariant(
      await startupDeadline.boundedDelay(100, "stable port-absence delay"),
      "host readiness timed out before stable port proof"
    );
    invariant(await provePortsAbsent(deps), "smoke port absence is not stable");
    startupDeadline.assertActive("stable port-absence proof");
    const descriptors = childDescriptors(root);
    validateChildDescriptors(descriptors, root);
    const children = [];
    const stopController = createDescendantStopController({
      runnerIdentity,
      retainedIdentities: () => children.flatMap((child) => (child.identity ? [child.identity] : [])),
      dependencies: {
        async listIdentities() {
          return listProcessIdentities(deps);
        },
        async readIdentity(pid) {
          return readIdentity(pid, deps);
        },
        async signalPid(pid, signal) {
          deps.signalPid(pid, signal);
        },
        async portsAbsent() {
          return provePortsAbsent(deps);
        },
        delay: deps.delay,
      },
    });
    let requestedReason = null;
    let resolveReason;
    const reasonPromise = new Promise((resolve) => {
      resolveReason = resolve;
    });
    const requestStop = (reason) => {
      if (requestedReason === null) {
        requestedReason = reason;
        resolveReason(reason);
      }
    };
    const assertStartupActive = (boundary) => {
      invariant(requestedReason === null, "host stopped at startup boundary " + boundary);
      startupDeadline.assertActive(boundary);
    };
    deps.onceSignal("SIGTERM", () => requestStop("signal"));
    deps.onceSignal("SIGINT", () => requestStop("signal"));
    try {
      for (const descriptor of descriptors) {
        assertStartupActive("before-" + descriptor.kind + "-spawn");
        const child = deps.spawn(descriptor.file, descriptor.args, {
          cwd: descriptor.cwd,
          env: environment,
          shell: false,
          detached: false,
          stdio: ["ignore", "pipe", "pipe"],
        });
        const row = {
          kind: descriptor.kind,
          process: child,
          identity: null,
          spawnFailed: false,
          stdoutState: null,
          stderrState: null,
        };
        children.push(row);
        assertStartupActive("after-" + descriptor.kind + "-spawn");
        row.stdoutState = createBoundedDrain(child.stdout, CHILD_READY_MARKERS[descriptor.kind]);
        row.stderrState = createBoundedDrain(child.stderr, "WF540_FORBIDDEN_STDERR_READY\n");
        child.once("error", () => {
          row.spawnFailed = true;
          requestStop("startup_failure");
        });
        child.once("exit", () => requestStop("child_exit"));
        assertStartupActive("before-" + descriptor.kind + "-identity");
        row.identity = await waitForDirectChildIdentity(row, runnerIdentity, deps, startupDeadline);
        assertStartupActive("after-" + descriptor.kind + "-identity");
      }
      let proof = null;
      while (proof === null && requestedReason === null) {
        assertStartupActive("ready-proof attempt");
        invariant(
          children.every(
            (child) =>
              !child.spawnFailed &&
              child.process.exitCode === null &&
              child.process.signalCode === null
          ),
          "child exited during startup"
        );
        try {
          assertStartupActive("before-first-ready-proof");
          const first = await stableStartupProof(children, runnerIdentity, deps);
          assertStartupActive("after-first-ready-proof");
          if (!(await startupDeadline.boundedDelay(200, "stable startup proof observation delay"))) {
            break;
          }
          assertStartupActive("before-second-ready-proof");
          const second = await stableStartupProof(children, runnerIdentity, deps);
          assertStartupActive("after-second-ready-proof");
          invariant(JSON.stringify(first) === JSON.stringify(second), "startup proof is not stable");
          proof = second;
          break;
        } catch (error) {
          if (requestedReason !== null) throw error;
          if (!(await startupDeadline.boundedDelay(200, "startup proof retry delay"))) {
            break;
          }
        }
      }
      invariant(proof !== null, "host readiness timed out");
      assertStartupActive("before-readiness-projection");
      invariant(
        children.every(
          ({ stdoutState, stderrState }) => !stdoutState().exceeded && !stderrState().exceeded
        ),
        "child output exceeded the private bound"
      );
      await validateViteCacheAuthorities(root, deps, true);
      assertStartupActive("after-cache-authority-proof");
      const ready = freezeReadyProjection({
        schemaVersion: 1,
        runnerPid: proof.runner.pid,
        children: proof.children.map(({ kind, identity }) => ({ kind, pid: identity.pid })),
        ports: [...PORTS],
      });
      deps.stdoutWrite(JSON.stringify(ready) + "\n");
      const reason = await reasonPromise;
      const stopped = await stopController.stop(reason);
      invariant(
        stopped.descendantsAbsent &&
          stopped.term.survivors.length === 0 &&
          stopped.kill.survivors.length === 0 &&
          stopped.portsAbsent.length === PORTS.length,
        "host descendant cleanup failed"
      );
    } catch {
      try {
        await stopController.stop(requestedReason ?? "startup_failure");
      } catch {
        // The executor owns the outer negative-PGID cleanup when host proof cannot finish.
      }
      throw new Error("task540_smoke_host_failed");
    }
  }

  return Object.freeze({
    createRuntimeDependencies,
    createStartupDeadline,
    runHostCli,
    serve,
    waitForDirectChildIdentity,
  });
}
