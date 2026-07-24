import { validateReadyProjection } from "../process-identity.mjs";
import { exactOrderedDataObject, invariant } from "../validation.mjs";

export async function runStopServeSelfTest(configuration, support) {
  exactOrderedDataObject(
    configuration,
    ["READY_TIMEOUT_MS", "environment", "freezeStopProof", "root", "serve"],
    "stop/serve self-test configuration"
  );
  const { READY_TIMEOUT_MS, environment, freezeStopProof, root, serve } = configuration;
  const {
    clonePlain,
    createServeSelfTestHarness,
    createStopSelfTestHarness,
    expectAsyncFailure,
    expectFailure,
  } = support;

  const termOnlyHarness = createStopSelfTestHarness("term-only");
  const concurrentFirst = termOnlyHarness.controller.stop("signal");
  const concurrentSecond = termOnlyHarness.controller.stop("signal");
  invariant(concurrentFirst === concurrentSecond, "concurrent stop did not share one promise");
  const termOnly = await concurrentFirst;
  invariant(
    termOnly.descendantsAbsent &&
      termOnly.term.targets.length === 3 &&
      termOnly.term.survivors.length === 0 &&
      !termOnly.kill.attempted &&
      termOnly.portsAbsent.length === 3 &&
      termOnlyHarness.signals.every(({ signal }) => signal === "SIGTERM"),
    "TERM-only cleanup drift"
  );
  invariant(
    Object.isFrozen(termOnly) && Object.isFrozen(termOnly.term.targets[0]),
    "stop proof freeze drift"
  );

  const termKillHarness = createStopSelfTestHarness("term-kill");
  const termKill = await termKillHarness.controller.stop("child_exit");
  invariant(
    termKill.descendantsAbsent &&
      termKill.term.survivors.length === 3 &&
      termKill.kill.targets.length === 3 &&
      termKill.kill.survivors.length === 0 &&
      termKillHarness.signals.filter(({ signal }) => signal === "SIGKILL").length === 3,
    "TERM-to-KILL cleanup drift"
  );

  const timeoutHarness = createStopSelfTestHarness("timeout");
  const timeout = await timeoutHarness.controller.stop("startup_failure");
  invariant(
    !timeout.descendantsAbsent && timeout.kill.survivors.length === 3,
    "cleanup timeout did not fail closed"
  );
  const persistentPortHarness = createStopSelfTestHarness("persistent-port");
  const persistentPort = await persistentPortHarness.controller.stop("signal");
  invariant(
    persistentPort.descendantsAbsent && persistentPort.portsAbsent.length === 0,
    "persistent port did not fail closed"
  );
  const pidReuseHarness = createStopSelfTestHarness("pid-reuse");
  await expectAsyncFailure(() => pidReuseHarness.controller.stop("signal"), "cleanup PID reuse");
  const stopProofNegatives = [
    {
      base: termOnly,
      mutate(value) {
        value.extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets.extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets[0].extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets[1] = clonePlain(value.term.targets[0]);
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets.reverse();
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.term.survivors[1] = clonePlain(value.term.survivors[0]);
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.term.survivors[0].startTicks = "9001";
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.term.survivors.reverse();
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.attempted = false;
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.targets.pop();
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.targets[0].startTicks = "9001";
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.targets.reverse();
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.kill.survivors[0].pid = 999;
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.kill.survivors.reverse();
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.descendantsAbsent = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.descendantsAbsent = false;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.kill.attempted = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.reason = "unknown";
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.portsAbsent = [3000, 5173];
      },
    },
  ];
  for (const [index, { base, mutate }] of stopProofNegatives.entries()) {
    const candidate = clonePlain(base);
    mutate(candidate);
    expectFailure(() => freezeStopProof(candidate), "stop proof negative " + index);
  }

  const serveHarness = createServeSelfTestHarness(root, environment);
  await serve(root, serveHarness.dependencies);
  invariant(
    serveHarness.spawnCalls.length === 3 &&
      JSON.stringify(serveHarness.spawnCalls.map(({ kind }) => kind)) ===
        JSON.stringify(["backend", "admin", "site"]) &&
      serveHarness.signals.length === 3 &&
      serveHarness.signals.every(({ signal }) => signal === "SIGTERM") &&
      serveHarness.output.length === 1 &&
      serveHarness.preflightCalls() > 0,
    "fully injected serve success path drift"
  );
  const serveReady = JSON.parse(serveHarness.output[0]);
  validateReadyProjection(serveReady);
  const missingPostReadyCache = createServeSelfTestHarness(root, environment, {
    cacheFault: "missing-admin-cache",
  });
  await expectAsyncFailure(
    () => serve(root, missingPostReadyCache.dependencies),
    "fully injected serve missing post-ready cache"
  );
  invariant(
    missingPostReadyCache.spawnCalls.length === 3 &&
      missingPostReadyCache.output.length === 0 &&
      missingPostReadyCache.signals.length === 3,
    "missing post-ready cache did not fail before public readiness"
  );
  const missingPostReadyBase = createServeSelfTestHarness(root, environment, {
    cacheFault: "missing-base",
  });
  await expectAsyncFailure(
    () => serve(root, missingPostReadyBase.dependencies),
    "fully injected serve missing post-ready cache base"
  );
  invariant(
    missingPostReadyBase.spawnCalls.length === 3 &&
      missingPostReadyBase.output.length === 0 &&
      missingPostReadyBase.signals.length === 3,
    "missing post-ready cache base did not fail before public readiness"
  );
  const cachePreflightFaults = [
    "missing-base-with-children",
    "base-symlink",
    "base-noncanonical",
    "base-escape",
    "node-modules-symlink",
    "missing-node-modules",
  ];
  for (const cacheFault of cachePreflightFaults) {
    const harness = createServeSelfTestHarness(root, environment, { cacheFault });
    await expectAsyncFailure(
      () => serve(root, harness.dependencies),
      "fully injected serve cache preflight " + cacheFault
    );
    invariant(
      harness.spawnCalls.length === 0 &&
        harness.output.length === 0 &&
        harness.signals.length === 0,
      cacheFault + " escaped cache preflight before spawn"
    );
  }
  const startupTimeoutHarness = createServeSelfTestHarness(root, environment, {
    startupTimeout: true,
  });
  await expectAsyncFailure(
    () => serve(root, startupTimeoutHarness.dependencies),
    "fully injected serve monotonic startup timeout"
  );
  invariant(
    startupTimeoutHarness.spawnCalls.length === 3 &&
      startupTimeoutHarness.output.length === 0 &&
      startupTimeoutHarness.signals.length === 3 &&
      startupTimeoutHarness.clock.firstCleanupSignalAt() === READY_TIMEOUT_MS &&
      startupTimeoutHarness.clock.delayRequests.every(
        (requestedMs) => requestedMs > 0 && requestedMs <= 200
      ) &&
      !Function.prototype.toString.call(serve).includes("READY_TIMEOUT_MS / 200") &&
      startupTimeoutHarness.clock.firstCleanupSignalAt() < 2 * READY_TIMEOUT_MS,
    "monotonic startup timeout boundary or cleanup drift"
  );
  const twoObservationTimeoutHarness = createServeSelfTestHarness(root, environment, {
    alternatingSecondProofDrift: true,
  });
  await expectAsyncFailure(
    () => serve(root, twoObservationTimeoutHarness.dependencies),
    "fully injected serve second-observation monotonic timeout"
  );
  invariant(
    twoObservationTimeoutHarness.spawnCalls.length === 3 &&
      twoObservationTimeoutHarness.output.length === 0 &&
      twoObservationTimeoutHarness.signals.length === 3 &&
      twoObservationTimeoutHarness.clock.firstCleanupSignalAt() === READY_TIMEOUT_MS &&
      twoObservationTimeoutHarness.proofCycles.successfulFirst > 0 &&
      twoObservationTimeoutHarness.proofCycles.failedSecond > 0 &&
      twoObservationTimeoutHarness.proofCycles.recoveredFirst > 0 &&
      twoObservationTimeoutHarness.proofCycles.successfulFirst ===
        twoObservationTimeoutHarness.proofCycles.failedSecond &&
      twoObservationTimeoutHarness.proofCycles.observationDelays.length ===
        twoObservationTimeoutHarness.proofCycles.failedSecond &&
      twoObservationTimeoutHarness.proofCycles.observationDelays.every(
        (elapsedMs) => elapsedMs === 200
      ) &&
      twoObservationTimeoutHarness.proofCycles.recoveryDelays.length ===
        twoObservationTimeoutHarness.proofCycles.recoveredFirst &&
      twoObservationTimeoutHarness.proofCycles.recoveryDelays.every(
        (elapsedMs) => elapsedMs === 200
      ) &&
      twoObservationTimeoutHarness.signals.every(({ signal }) => signal === "SIGTERM") &&
      twoObservationTimeoutHarness.clock.firstCleanupSignalAt() < 2 * READY_TIMEOUT_MS,
    "second-observation timeout did not cover the prior two-delay regression"
  );
  for (const listenerFault of [
    "missing",
    "duplicate",
    "foreign",
    "extra-port",
    "runner-extra-port",
    "escaped-extra-listener",
    "escaped-member",
  ]) {
    const harness = createServeSelfTestHarness(root, environment, { listenerFault });
    await expectAsyncFailure(
      () => serve(root, harness.dependencies),
      `fully injected serve ${listenerFault} listener`
    );
    invariant(harness.output.length === 0, `${listenerFault} listener emitted readiness`);
    invariant(
      harness.signals.every(({ pid }) => pid !== 104),
      `${listenerFault} cleanup signalled a foreign non-descendant`
    );
    if (["escaped-extra-listener", "escaped-member"].includes(listenerFault)) {
      invariant(
        harness.signals.some(({ pid, signal }) => pid === 105 && signal === "SIGTERM") &&
          harness.signals.every(({ pid }) => [101, 102, 103, 105].includes(pid)),
        `${listenerFault} cleanup did not remain scoped to the complete owned lineage`
      );
    }
  }
  const shutdownDuringSpawn = createServeSelfTestHarness(root, environment, {
    shutdownAfterFirstSpawn: true,
  });
  await expectAsyncFailure(
    () => serve(root, shutdownDuringSpawn.dependencies),
    "shutdown after first child acquisition"
  );
  invariant(
    shutdownDuringSpawn.spawnCalls.length === 1 &&
      shutdownDuringSpawn.spawnCalls[0].kind === "backend" &&
      shutdownDuringSpawn.output.length === 0 &&
      shutdownDuringSpawn.signals.length === 1 &&
      shutdownDuringSpawn.signals[0].pid === 101 &&
      shutdownDuringSpawn.signals[0].signal === "SIGTERM",
    "shutdown boundary acquired a later child or missed partial cleanup"
  );

  return Object.freeze({
    shutdownCases: 6,
    stopProofNegativeCases: stopProofNegatives.length,
    startupDeadlineCases: 2,
    secondObservationCycles: twoObservationTimeoutHarness.proofCycles.failedSecond,
    injectedServeCases: 19,
  });
}
