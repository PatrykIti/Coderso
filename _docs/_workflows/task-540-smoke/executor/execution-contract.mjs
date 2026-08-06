import path from "node:path";

import { INPUT_KEYS, NONCE_PATTERN } from "./config.mjs";
import { exactOwnKeys, invariant } from "./foundation.mjs";
import { isSafeRepositoryRelativePath } from "./json-schema.mjs";
import { assertScreenshotScenarioOwnership } from "../browser/scenarios/ownership.mjs";

export function assertExecutionInput(input) {
  exactOwnKeys(input, INPUT_KEYS, "execution input", { plain: true });
  invariant(
    typeof input.root === "string" &&
      input.root.length > 1 &&
      !input.root.includes("\0") &&
      path.isAbsolute(input.root) &&
      path.resolve(input.root) === input.root,
    "root must be a canonical absolute repository path"
  );
  invariant(
    typeof input.nonce === "string" && NONCE_PATTERN.test(input.nonce),
    "nonce must be 12 lowercase hex characters"
  );
  invariant(
    typeof input.assertSafeEvidence === "function",
    "assertSafeEvidence must be a function"
  );
  invariant(
    typeof input.snapshotRepository === "function",
    "snapshotRepository must be a function"
  );
}

export function assertRegisteredExecutable(plan, action) {
  const executable = action.executable;
  invariant(executable && typeof executable === "object", action.id + " executable is missing");
  if (executable.type === "runtime-operation") {
    const descriptor = plan.registries.runtimeOperations[executable.operationId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " runtime registry mismatch"
    );
  } else if (executable.type === "browser-run-code") {
    const descriptor = plan.registries.browserRunCodeSources[executable.sourceId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " run-code registry mismatch"
    );
  } else if (executable.type === "browser-native") {
    const descriptor = plan.registries.browserNativeOperations[executable.operationId];
    invariant(
      descriptor?.operationId === executable.operationId &&
        descriptor.actionIds.includes(action.id),
      action.id + " native registry mismatch"
    );
  } else if (executable.type === "browser-screenshot") {
    assertScreenshotScenarioOwnership(plan, action);
    const registeredPath = plan.registries.screenshotPaths[executable.screenshotId];
    invariant(
      typeof registeredPath === "string" &&
        action.repositoryMutationPolicy.mode === "allowlist" &&
        action.repositoryMutationPolicy.paths.length === 1 &&
        action.repositoryMutationPolicy.paths[0] === registeredPath &&
        isSafeRepositoryRelativePath(registeredPath),
      action.id + " screenshot registry mismatch"
    );
  } else {
    invariant(
      executable.type === "browser-global-list" && action.id === "end-007-session-absence",
      action.id + " global-list registry mismatch"
    );
  }
  invariant(
    plan.registries.outputs[action.outputSchemaId] !== undefined,
    action.id + " output schema is missing"
  );
  return executable;
}
