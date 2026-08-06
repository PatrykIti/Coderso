import { deepFreezeExact, exactKeys, invariant } from "../core.mjs";
import { SCREENSHOT_DESCRIPTOR_BY_ACTION_ID } from "../metadata.mjs";
import { materializeEditableContentSchema } from "../output-contracts.mjs";
import { captureNamesRequiredByRef, executableRefs } from "../references.mjs";
import { ACTION_KEYS } from "../requirements.mjs";

export function expectContractFailure(callback, label) {
  let failed = false;
  try {
    callback();
  } catch {
    failed = true;
  }
  invariant(failed, label + " must fail closed");
}

export function assertRecursivelyFrozen(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return;
  if (seen.has(value)) return;
  seen.add(value);
  invariant(Object.isFrozen(value), "plan contains a mutable nested value");
  for (const key of Reflect.ownKeys(value)) assertRecursivelyFrozen(value[key], seen);
}

export function assertJsonSerializablePlan(value, path = "$", ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    invariant(Number.isFinite(value), path + " contains a non-finite number");
    return;
  }
  invariant(typeof value === "object", path + " contains a non-JSON value");
  invariant(!ancestors.has(value), path + " contains a cycle");
  const prototype = Object.getPrototypeOf(value);
  invariant(
    Array.isArray(value) || prototype === Object.prototype || prototype === null,
    path + " contains a non-plain object"
  );
  const ownKeys = Object.keys(value);
  const reflectedKeys = Reflect.ownKeys(value);
  if (Array.isArray(value)) {
    invariant(
      ownKeys.length === value.length &&
        ownKeys.every((key, index) => key === String(index)) &&
        reflectedKeys.length === ownKeys.length + 1 &&
        reflectedKeys.at(-1) === "length",
      path + " contains an array hole or custom key"
    );
  } else {
    invariant(
      reflectedKeys.length === ownKeys.length &&
        reflectedKeys.every((key, index) => key === ownKeys[index]),
      path + " contains a non-enumerable or symbol key"
    );
  }
  ancestors.add(value);
  for (const key of ownKeys) {
    assertJsonSerializablePlan(value[key], path + "." + key, ancestors);
  }
  ancestors.delete(value);
}

export function assertCanonicalJsonRoundTrip(value) {
  assertJsonSerializablePlan(value);
  const serialized = JSON.stringify(value);
  invariant(typeof serialized === "string", "plan did not serialize to JSON");
  const reparsed = JSON.parse(serialized);
  invariant(
    JSON.stringify(reparsed) === serialized,
    "plan JSON round-trip changed its canonical byte representation"
  );
}

export function replaceManifestAction(manifest, index, overrides, extra = null) {
  const values = { ...manifest[index], ...overrides };
  const replacement = Object.fromEntries(ACTION_KEYS.map((key) => [key, values[key]]));
  if (extra) Object.assign(replacement, extra);
  const copy = manifest.slice();
  copy[index] = deepFreezeExact(replacement);
  return Object.freeze(copy);
}


export function lookupExecutableRegistryDescriptor(plan, action) {
  const executable = action.executable;
  if (executable.type === "runtime-operation") {
    const descriptor = plan.registries.runtimeOperations[executable.operationId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " runtime registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-run-code") {
    const descriptor = plan.registries.browserRunCodeSources[executable.sourceId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " run-code registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-native") {
    const descriptor = plan.registries.browserNativeOperations[executable.operationId];
    invariant(
      descriptor?.operationId === executable.operationId &&
        descriptor.actionIds.includes(action.id),
      action.id + " native registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-screenshot") {
    const expected = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    const registeredPath = plan.registries.screenshotPaths[executable.screenshotId];
    invariant(
      expected?.screenshotId === executable.screenshotId &&
        expected.path === registeredPath &&
        action.repositoryMutationPolicy.paths[0] === registeredPath,
      action.id + " screenshot registry lookup drift"
    );
    return registeredPath;
  }
  invariant(
    executable.type === "browser-global-list" && action.id === "end-007-session-absence",
    action.id + " global-list registry lookup drift"
  );
  return true;
}

export function runHermeticOneLoopExecutorSelfTest(plan) {
  const completed = new Set();
  const captures = new Map();
  const actionDispatches = [];
  const actionReceipts = [];
  const refContext = { fixtureBlueprint: plan.fixtureBlueprint };
  for (const action of plan.actionManifest) {
    invariant(action.ordinal === completed.size + 1, "one-loop ordinal drift");
    lookupExecutableRegistryDescriptor(plan, action);
    invariant(
      action.assertionDependencies.every((dependency) => completed.has(dependency)),
      action.id + " one-loop dependency drift"
    );
    for (const ref of executableRefs(action.executable)) {
      for (const captureName of captureNamesRequiredByRef(ref, refContext)) {
        invariant(captures.has(captureName), action.id + " resolved an unbound capture");
      }
    }
    actionDispatches.push(deepFreezeExact({ ordinal: action.ordinal, actionId: action.id }));
    for (const captureName of [
      ...(plan.fixtureCaptureBindings[action.id] ?? []),
      ...(plan.runtimeCaptureBindings[action.id] ?? []),
    ]) {
      invariant(!captures.has(captureName), action.id + " rebound a capture");
      captures.set(captureName, "self-test:" + captureName);
    }
    completed.add(action.id);
    actionReceipts.push(
      deepFreezeExact({
        ordinal: action.ordinal,
        actionId: action.id,
        partition: action.ordinal <= 55 ? "setup" : action.ordinal <= 489 ? "flow" : "terminal",
      })
    );
  }
  invariant(completed.size === 496, "one-loop completion drift");
  invariant(captures.size === 26, "one-loop capture binding drift");
  return deepFreezeExact({ actionDispatches, actionReceipts });
}

export function createPrivateProjectionSelfTestHarness(plan) {
  const values = new WeakMap();
  const binding = plan.registries.privateProjectionBindings;
  const expectedSchema = materializeEditableContentSchema(
    plan.fixtureBlueprint.contentTypes.editable.fields
  );
  const bind = (authority, actionId, value) => {
    invariant(actionId === binding.producerActionIds[0], "private projection bind owner drift");
    invariant(authority && typeof authority === "object", "private projection authority drift");
    exactKeys(value, ["id", "slug", "name", "schema"], "private projection value");
    invariant(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.id) &&
        value.slug === plan.fixtureBlueprint.contentTypes.editable.slug &&
        value.name === plan.fixtureBlueprint.contentTypes.editable.name &&
        JSON.stringify(value.schema) === JSON.stringify(expectedSchema),
      "private projection value drift"
    );
    invariant(!values.has(authority), "private projection rebound");
    values.set(authority, deepFreezeExact(structuredClone(value)));
  };
  const read = (authority, actionId, authorityId) => {
    invariant(authorityId === binding.authorityId, "private projection authority ID drift");
    invariant(binding.consumerActionIds.includes(actionId), "private projection reader drift");
    const value = values.get(authority);
    invariant(value !== undefined, "private projection read before bind");
    return value;
  };
  return { bind, read, expectedSchema };
}
