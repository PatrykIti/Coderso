import { EventEmitter } from "node:events";

import {
  COMMAND_TIMEOUT_MS,
  DATABASE_OPERATION_TIMEOUT_MS,
  HOST_READY_TIMEOUT_MS,
} from "../config.mjs";
import { canonicalJson, invariant } from "../foundation.mjs";
import { parseRegisteredOutput } from "../output-parser.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import {
  buildRouteHitSource,
  buildRouteReleaseSource,
  buildRouteSetupSource,
} from "../../browser/route-and-action-sources.mjs";

export async function runHostReadinessPolicySelfTest({
  BROWSER_FIXED_TIMEOUT_ENV,
  BROWSER_OPTIONAL_INHERITED_ENV,
  PROCESS_KILL_GRACE_MS,
  PROCESS_TERM_GRACE_MS,
  applyFixedBrowserTimeoutEnvironment,
  expectAsyncFailure,
  incrementNegativeCases,
  normalizeAuthRatePolicy,
  plan,
  readHostReadyLine,
  readHostReadyLineWithTimerAuthority,
  selfTestContext,
}) {
  const createHostReadySelfTestChild = () =>
    Object.assign(new EventEmitter(), { stdout: new EventEmitter() });
  const createHostReadySelfTestTimers = () => {
    const registrations = [];
    let clearCalls = 0;
    return {
      authority: {
        setTimer(callback, timeoutMs) {
          const handle = { callback, timeoutMs, cleared: false };
          registrations.push(handle);
          return handle;
        },
        clearTimer(handle) {
          invariant(registrations.includes(handle), "host ready self-test timer identity drift");
          invariant(!handle.cleared, "host ready self-test timer cleared more than once");
          handle.cleared = true;
          clearCalls += 1;
        },
      },
      registrations,
      readClearCalls: () => clearCalls,
    };
  };
  invariant(
    HOST_READY_TIMEOUT_MS === 540_000 && readHostReadyLine.length === 1,
    "host ready production timeout contract drift"
  );
  invariant(
    DATABASE_OPERATION_TIMEOUT_MS === 540_000 &&
      COMMAND_TIMEOUT_MS === 1_200_000 &&
      COMMAND_TIMEOUT_MS > DATABASE_OPERATION_TIMEOUT_MS &&
      COMMAND_TIMEOUT_MS > HOST_READY_TIMEOUT_MS,
    "nested command timeout envelope drift"
  );
  invariant(
    PROCESS_TERM_GRACE_MS === 40_000 &&
      PROCESS_KILL_GRACE_MS === 3_000 &&
      PROCESS_TERM_GRACE_MS > 2 * 15_000 + 5_000,
    "host stop process-group envelope drift"
  );
  invariant(
    buildRouteSetupSource({}).includes("timeout: 540000,"),
    "browser backing API timeout drift"
  );
  invariant(
    buildRouteHitSource({ key: "self-test", mode: "delayed" }).includes(
      "page.waitForTimeout(540000)"
    ) &&
      buildRouteReleaseSource({ key: "self-test", mode: "delayed" }).includes(
        "page.waitForTimeout(540000)"
      ),
    "browser route capture/release timeout drift"
  );
  const fixedBrowserTimeoutEnvironment = Object.create(null);
  applyFixedBrowserTimeoutEnvironment(fixedBrowserTimeoutEnvironment, {}, {});
  invariant(
    deepEqualJson(fixedBrowserTimeoutEnvironment, BROWSER_FIXED_TIMEOUT_ENV) &&
      BROWSER_FIXED_TIMEOUT_ENV.PLAYWRIGHT_MCP_TIMEOUT_ACTION === "90000" &&
      BROWSER_FIXED_TIMEOUT_ENV.PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION === "540000" &&
      Number(BROWSER_FIXED_TIMEOUT_ENV.PLAYWRIGHT_MCP_TIMEOUT_ACTION) <= COMMAND_TIMEOUT_MS &&
      Number(BROWSER_FIXED_TIMEOUT_ENV.PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION) < COMMAND_TIMEOUT_MS &&
      Object.keys(BROWSER_FIXED_TIMEOUT_ENV).every(
        (key) => !BROWSER_OPTIONAL_INHERITED_ENV.includes(key)
      ),
    "fixed browser timeout environment authority drift"
  );
  for (const [key] of Object.entries(BROWSER_FIXED_TIMEOUT_ENV)) {
    await expectAsyncFailure(
      async () => applyFixedBrowserTimeoutEnvironment(Object.create(null), { [key]: "1" }, {}),
      "repo browser timeout override " + key
    );
    await expectAsyncFailure(
      async () => applyFixedBrowserTimeoutEnvironment(Object.create(null), {}, { [key]: "1" }),
      "inherited browser timeout override " + key
    );
  }
  const readyProjection = {
    schemaVersion: 1,
    runnerPid: 540,
    children: [],
    ports: [3000, 5173, 5174],
  };
  const readyChild = createHostReadySelfTestChild();
  const readyTimers = createHostReadySelfTestTimers();
  let readyFulfillments = 0;
  let readyRejections = 0;
  const readyPromise = readHostReadyLineWithTimerAuthority(readyChild, readyTimers.authority).then(
    (value) => {
      readyFulfillments += 1;
      return value;
    },
    (error) => {
      readyRejections += 1;
      throw error;
    }
  );
  invariant(
    readyTimers.registrations.length === 1 &&
      readyTimers.registrations[0].timeoutMs === HOST_READY_TIMEOUT_MS,
    "host ready valid-line timer registration drift"
  );
  readyChild.stdout.emit("data", Buffer.from(canonicalJson(readyProjection) + "\n"));
  const parsedReadyProjection = await readyPromise;
  readyChild.stdout.emit("data", Buffer.from("{}\n"));
  readyChild.emit("exit");
  readyTimers.registrations[0].callback();
  await Promise.resolve();
  invariant(
    deepEqualJson(parsedReadyProjection, readyProjection) &&
      readyFulfillments === 1 &&
      readyRejections === 0 &&
      readyTimers.readClearCalls() === 1 &&
      readyTimers.registrations[0].cleared &&
      readyChild.listenerCount("exit") === 0 &&
      readyChild.stdout.listenerCount("data") === 0,
    "host ready valid-line settlement drift"
  );

  const timeoutPrivateMarker = "TASK540_HOST_READY_PRIVATE_DO_NOT_EGRESS";
  const timeoutChild = createHostReadySelfTestChild();
  const timeoutTimers = createHostReadySelfTestTimers();
  let timeoutSettlements = 0;
  let timeoutFailure = null;
  const timeoutPromise = readHostReadyLineWithTimerAuthority(
    timeoutChild,
    timeoutTimers.authority
  ).then(
    () => {
      timeoutSettlements += 1;
    },
    (error) => {
      timeoutSettlements += 1;
      timeoutFailure = error;
    }
  );
  invariant(
    timeoutTimers.registrations.length === 1 &&
      timeoutTimers.registrations[0].timeoutMs === HOST_READY_TIMEOUT_MS,
    "host ready expiry timer registration drift"
  );
  timeoutChild.stdout.emit("data", Buffer.from(timeoutPrivateMarker));
  timeoutTimers.registrations[0].callback();
  timeoutTimers.registrations[0].callback();
  timeoutChild.stdout.emit("data", Buffer.from(canonicalJson(readyProjection) + "\n"));
  timeoutChild.emit("exit");
  await timeoutPromise;
  await Promise.resolve();
  invariant(
    timeoutSettlements === 1 &&
      timeoutFailure instanceof Error &&
      timeoutFailure.message === "host ready timeout" &&
      !String(timeoutFailure).includes(timeoutPrivateMarker) &&
      timeoutTimers.readClearCalls() === 1 &&
      timeoutTimers.registrations[0].cleared &&
      timeoutChild.listenerCount("exit") === 0 &&
      timeoutChild.stdout.listenerCount("data") === 0,
    "host ready expiry settlement drift"
  );
  incrementNegativeCases();
  const previewShellContract = plan.registries.observations["preview-shell-desktop"];
  const previewShellOutput = {
    shellVisible: true,
    device: "desktop",
    outerTabsVisible: true,
    innerTabsVisible: true,
  };
  invariant(
    deepEqualJson(
      parseRegisteredOutput(
        previewShellContract,
        Buffer.from(canonicalJson(previewShellOutput) + "\n"),
        "preview-shell-positive",
        selfTestContext(plan, "tk-011-preview-proof")
      ),
      previewShellOutput
    ),
    "preview shell visible proof drift"
  );
  for (const [label, patch] of [
    ["preview shell hidden", { shellVisible: false }],
    ["preview shell wrong device", { device: "tablet" }],
    ["preview outer Tabs hidden", { outerTabsVisible: false }],
    ["preview inner Tabs hidden", { innerTabsVisible: false }],
  ]) {
    await expectAsyncFailure(
      async () =>
        parseRegisteredOutput(
          previewShellContract,
          Buffer.from(canonicalJson({ ...previewShellOutput, ...patch }) + "\n"),
          label,
          selfTestContext(plan, "tk-011-preview-proof")
        ),
      label
    );
  }

  const enabledAuthRatePolicy = normalizeAuthRatePolicy(
    { enabled: true, maxRequests: 10, windowSeconds: 60 },
    plan.requiredAuthRatePlan
  );
  invariant(
    Object.isFrozen(enabledAuthRatePolicy) &&
      deepEqualJson(enabledAuthRatePolicy, {
        enabled: true,
        maxRequests: 10,
        windowSeconds: 60,
      }),
    "enabled auth rate policy normalization drift"
  );
  const disabledAuthRatePolicy = normalizeAuthRatePolicy(
    { enabled: false, maxRequests: 1, windowSeconds: 61 },
    plan.requiredAuthRatePlan
  );
  invariant(
    Object.isFrozen(disabledAuthRatePolicy) && disabledAuthRatePolicy.enabled === false,
    "disabled auth rate policy normalization drift"
  );
  for (const [label, policy] of [
    ["auth max below plan", { enabled: true, maxRequests: 9, windowSeconds: 60 }],
    ["auth window below plan", { enabled: true, maxRequests: 10, windowSeconds: 0 }],
    ["auth window above plan", { enabled: true, maxRequests: 10, windowSeconds: 61 }],
    ["auth policy unknown key", { enabled: true, maxRequests: 10, windowSeconds: 60, extra: true }],
  ]) {
    await expectAsyncFailure(
      async () => normalizeAuthRatePolicy(policy, plan.requiredAuthRatePlan),
      label
    );
  }

  return { enabledAuthRatePolicy, disabledAuthRatePolicy };
}
