import { RAW_ACTION_ROWS } from "./action-rows.mjs";
import { deepFreezeExact, exactKeys, invariant } from "./core.mjs";
import { buildFixtureBlueprint, validateFixtureBlueprint } from "./fixtures.mjs";
import {
  compileAction,
  createStateMachineRegistry,
  validateManifest,
  validateStateMachines,
} from "./manifest.mjs";
import {
  FIXTURE_CAPTURE_BY_ACTION,
  FIXTURE_SUBJECT_CAPTURE,
  REQUIRED_SCREENSHOT_PATHS,
  RUNTIME_CAPTURE_BY_ACTION,
} from "./metadata.mjs";
import { createRegistries } from "./registries.mjs";
import {
  MAX_PREFERENCE_UNMOUNT_WINDOW_MS,
  NONCE_PATTERN,
  REQUIRED_AUTH_RATE_PLAN,
  REQUIRED_BUILDER_KIND_COUNTS,
  REQUIRED_CAPTURE_NAMES,
  REQUIRED_FIXTURE_SUBJECT_KEYS,
  REQUIRED_ISOLATED_API_ACTION_IDS,
  REQUIRED_METADATA_STATE_VALUES,
  REQUIRED_RUNTIME_BLOCK_CAPTURES,
  REQUIRED_SCENARIOS,
  REQUIRED_SIGNOUT_SETTLEMENT_IDS,
  REQUIRED_SMOKE_ASSERTIONS,
  SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
} from "./requirements.mjs";

export function buildTask540SmokePlan(input) {
  invariant(arguments.length === 1, "plan builder requires one argument object");
  invariant(
    input !== null &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      Object.getPrototypeOf(input) === Object.prototype,
    "plan input must be a plain object"
  );
  const descriptors = Object.getOwnPropertyDescriptors(input);
  exactKeys(descriptors, ["nonce"], "plan input descriptors");
  const nonceDescriptor = descriptors.nonce;
  invariant(
    Object.hasOwn(nonceDescriptor, "value") &&
      !Object.hasOwn(nonceDescriptor, "get") &&
      !Object.hasOwn(nonceDescriptor, "set") &&
      nonceDescriptor.enumerable === true,
    "plan nonce must be one enumerable data property"
  );
  const nonce = nonceDescriptor.value;
  invariant(
    typeof nonce === "string" && NONCE_PATTERN.test(nonce),
    "nonce must be 12 lowercase hex characters"
  );
  const manifest = RAW_ACTION_ROWS.map(compileAction);
  validateManifest(manifest);
  validateStateMachines(manifest);
  const fixtureBlueprint = buildFixtureBlueprint(nonce);
  validateFixtureBlueprint(fixtureBlueprint);
  const registries = createRegistries(manifest, fixtureBlueprint);
  return deepFreezeExact({
    schemaVersion: 1,
    nonce,
    prefix: fixtureBlueprint.fixturePrefix,
    fixtureBlueprint,
    actionManifest: manifest,
    requiredScenarios: REQUIRED_SCENARIOS,
    requiredAssertions: REQUIRED_SMOKE_ASSERTIONS,
    requiredFixtureSubjectKeys: REQUIRED_FIXTURE_SUBJECT_KEYS,
    requiredCaptureNames: REQUIRED_CAPTURE_NAMES,
    requiredRuntimeBlockCaptures: REQUIRED_RUNTIME_BLOCK_CAPTURES,
    requiredScreenshotPaths: REQUIRED_SCREENSHOT_PATHS,
    requiredBuilderKindCounts: REQUIRED_BUILDER_KIND_COUNTS,
    fixtureCaptureBindings: FIXTURE_CAPTURE_BY_ACTION,
    runtimeCaptureBindings: RUNTIME_CAPTURE_BY_ACTION,
    fixtureSubjectCapture: FIXTURE_SUBJECT_CAPTURE,
    requiredIsolatedApiActionIds: REQUIRED_ISOLATED_API_ACTION_IDS,
    requiredSignoutSettlementIds: REQUIRED_SIGNOUT_SETTLEMENT_IDS,
    requiredMetadataStateValues: REQUIRED_METADATA_STATE_VALUES,
    requiredAuthRatePlan: REQUIRED_AUTH_RATE_PLAN,
    maxPreferenceUnmountWindowMs: MAX_PREFERENCE_UNMOUNT_WINDOW_MS,
    screenPreferenceSettledRetentionMs: SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
    stateMachines: createStateMachineRegistry(),
    registries,
  });
}
