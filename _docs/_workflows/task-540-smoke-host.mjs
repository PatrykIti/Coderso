import path from "node:path";
import { pathToFileURL } from "node:url";

import { createChildDescriptorContract } from "./task-540-smoke/host/child-descriptors.mjs";
import { createChildSourceContract } from "./task-540-smoke/host/child-sources.mjs";
import {
  VITE_OPTIONS_CLONE_VALIDATOR_SOURCE,
  VITE_READINESS_SOURCE,
  VITE_WARM_RESTART_SOURCE,
} from "./task-540-smoke/host/vite-source-runtime.mjs";
import { createServeRuntime } from "./task-540-smoke/host/serve-runtime.mjs";
import { createHostSelfTest } from "./task-540-smoke/host/self-test/index.mjs";
import { createStopRuntime } from "./task-540-smoke/host/stop-runtime.mjs";

const READY_TIMEOUT_MS = 360_000;
const STOP_TIMEOUT_MS = 15_000;
const MAX_CHILD_STREAM_BYTES = 4 * 1024 * 1024;
const CHILD_READY_MARKERS = Object.freeze({
  backend: "WF540_BACKEND_READY_V1\n",
  admin: "WF540_ADMIN_READY_V1\n",
  site: "WF540_SITE_READY_V1\n",
});

const CHILD_SOURCES = createChildSourceContract({
  VITE_READINESS_SOURCE,
  VITE_OPTIONS_CLONE_VALIDATOR_SOURCE,
  VITE_WARM_RESTART_SOURCE,
});
const { BACKEND_SOURCE, ADMIN_VITE_SOURCE, SITE_VITE_SOURCE } = CHILD_SOURCES;
const { childDescriptors, validateChildDescriptors } =
  createChildDescriptorContract(CHILD_SOURCES);

const { createBoundedDrain, createDescendantStopController, freezeStopProof } =
  createStopRuntime({ MAX_CHILD_STREAM_BYTES, STOP_TIMEOUT_MS });

const { createRuntimeDependencies, runHostCli, serve } = createServeRuntime({
  CHILD_READY_MARKERS,
  READY_TIMEOUT_MS,
  childDescriptors,
  createBoundedDrain,
  createDescendantStopController,
  validateChildDescriptors,
});

function isDirectModuleExecution(moduleUrl, argvEntry, cwd) {
  if (
    typeof moduleUrl !== "string" ||
    moduleUrl.length === 0 ||
    typeof argvEntry !== "string" ||
    argvEntry.length === 0 ||
    typeof cwd !== "string" ||
    cwd.length === 0
  ) {
    return false;
  }
  return pathToFileURL(path.resolve(cwd, argvEntry)).href === moduleUrl;
}

const runTask540SmokeHostSelfTest = createHostSelfTest({
  ADMIN_VITE_SOURCE,
  BACKEND_SOURCE,
  CHILD_READY_MARKERS,
  READY_TIMEOUT_MS,
  SITE_VITE_SOURCE,
  childDescriptors,
  createBoundedDrain,
  createDescendantStopController,
  freezeStopProof,
  isDirectModuleExecution,
  runHostCli,
  serve,
  validateChildDescriptors,
});

export { runTask540SmokeHostSelfTest };

if (isDirectModuleExecution(import.meta.url, process.argv[1], process.cwd())) {
  await runHostCli(process.argv.slice(2), {
    async runSelfTest() {
      process.stdout.write(JSON.stringify(await runTask540SmokeHostSelfTest()));
    },
    createRuntimeDependencies,
  });
}
