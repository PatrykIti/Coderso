import { BUN_BRIDGE_EXECUTION_AUTHORITY, MAX_STREAM_BYTES } from "./config.mjs";
import { deepFreezeExact, exactOwnKeys, hashBytes, invariant } from "./foundation.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";
import {
  BUN_BRIDGE_INPUT_VALIDATORS,
  bunBridgeInputSchemaId,
} from "./bridge-input-validators.mjs";
import {
  RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
} from "./bridge-sources/response-lost.mjs";
import { BUN_BRIDGE_ENV_PROFILES } from "../runtime/bun-bridge-transport.mjs";
import { BRIDGE_INPUT_READER, bridgeInputSchemaGuard } from "../runtime/bun-child-protocol.mjs";

// The Bun bridge output validator registry belongs to an authority the facade
// composes from runtime services, so it cannot be imported statically. The facade
// binds it exactly once, before any descriptor is built or validated.
let BUN_BRIDGE_OUTPUT_VALIDATORS = null;

function bindBunBridgeOutputValidatorRegistry(registry) {
  invariant(
    BUN_BRIDGE_OUTPUT_VALIDATORS === null,
    "Bun bridge output validator registry is already bound"
  );
  exactOwnKeys(registry, ["BUN_BRIDGE_OUTPUT_VALIDATORS"], "Bun bridge descriptor registry", {
    plain: true,
  });
  invariant(
    Object.isFrozen(registry.BUN_BRIDGE_OUTPUT_VALIDATORS) &&
      Object.values(registry.BUN_BRIDGE_OUTPUT_VALIDATORS).every(
        (validator) => typeof validator === "function"
      ),
    "Bun bridge output validator registry binding drift"
  );
  BUN_BRIDGE_OUTPUT_VALIDATORS = registry.BUN_BRIDGE_OUTPUT_VALIDATORS;
}

const PRIVATE_BUN_RESOURCE_DESCRIPTORS = new WeakMap();

const BUN_BRIDGE_BASE_DESCRIPTOR_KEYS = deepFreezeExact([
  "argvShape",
  "cwdShape",
  "envProfileId",
  "file",
  "inputKeys",
  "inputSchemaId",
  "maxStderrBytes",
  "maxStdinBytes",
  "maxStdoutBytes",
  "operationId",
  "outputSchemaId",
  "source",
  "sourceSha256",
  "timeoutMs",
]);
const BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS = deepFreezeExact([
  "acquisitionChannel",
  "participationMode",
  "resourceKey",
  "resourceKind",
  "resourceSlot",
]);

function validateBunBridgeOperationDescriptor(
  descriptor,
  expectedOperationId = descriptor?.operationId
) {
  const resourceKeyCount = BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS.filter(
    (key) => descriptor && Object.hasOwn(descriptor, key)
  ).length;
  invariant(
    resourceKeyCount === 0 || resourceKeyCount === BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS.length,
    "Bun bridge resource descriptor binding is partial"
  );
  exactOwnKeys(
    descriptor,
    resourceKeyCount === 0
      ? BUN_BRIDGE_BASE_DESCRIPTOR_KEYS
      : [...BUN_BRIDGE_BASE_DESCRIPTOR_KEYS, ...BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS],
    "Bun bridge operation descriptor",
    { plain: true }
  );
  invariant(
    Object.isFrozen(descriptor) &&
      Object.isFrozen(descriptor.argvShape) &&
      Object.isFrozen(descriptor.cwdShape) &&
      Object.isFrozen(descriptor.inputKeys) &&
      typeof expectedOperationId === "string" &&
      expectedOperationId.length > 0 &&
      descriptor.operationId === expectedOperationId &&
      descriptor.file === BUN_BRIDGE_EXECUTION_AUTHORITY.file &&
      deepEqualJson(descriptor.argvShape, BUN_BRIDGE_EXECUTION_AUTHORITY.argvShape) &&
      deepEqualJson(descriptor.cwdShape, BUN_BRIDGE_EXECUTION_AUTHORITY.cwdShape) &&
      typeof descriptor.source === "string" &&
      descriptor.source.length > 0 &&
      !descriptor.source.includes("\0") &&
      Buffer.byteLength(descriptor.source) <= MAX_STREAM_BYTES &&
      typeof descriptor.sourceSha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(descriptor.sourceSha256) &&
      descriptor.sourceSha256 === hashBytes(Buffer.from(descriptor.source)) &&
      descriptor.source.startsWith(
        BRIDGE_INPUT_READER + bridgeInputSchemaGuard(descriptor.inputSchemaId)
      ) &&
      BUN_BRIDGE_ENV_PROFILES[descriptor.envProfileId] !== undefined &&
      descriptor.inputSchemaId ===
        bunBridgeInputSchemaId(descriptor.source, descriptor.inputKeys) &&
      BUN_BRIDGE_INPUT_VALIDATORS[descriptor.inputSchemaId] !== undefined &&
      Array.isArray(descriptor.inputKeys) &&
      descriptor.inputKeys.every((key) => typeof key === "string" && key.length > 0) &&
      new Set(descriptor.inputKeys).size === descriptor.inputKeys.length &&
      deepEqualJson(descriptor.inputKeys, [...descriptor.inputKeys].sort()) &&
      deepEqualJson(
        descriptor.inputKeys,
        BUN_BRIDGE_INPUT_VALIDATORS[descriptor.inputSchemaId].inputKeys
      ) &&
      typeof descriptor.outputSchemaId === "string" &&
      typeof BUN_BRIDGE_OUTPUT_VALIDATORS[descriptor.outputSchemaId] === "function" &&
      descriptor.timeoutMs === BUN_BRIDGE_EXECUTION_AUTHORITY.timeoutMs &&
      descriptor.maxStdinBytes === BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes &&
      descriptor.maxStdoutBytes === BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdoutBytes &&
      descriptor.maxStderrBytes === BUN_BRIDGE_EXECUTION_AUTHORITY.maxStderrBytes,
    "Bun bridge descriptor source/schema/argv/cwd/limit authority drift"
  );
  if (resourceKeyCount > 0) {
    invariant(
      [
        descriptor.acquisitionChannel,
        descriptor.participationMode,
        descriptor.resourceKey,
        descriptor.resourceKind,
      ].every((value) => typeof value === "string" && value.length > 0) &&
        ["absence", "cleanup", "provenance"].includes(descriptor.resourceSlot) &&
        ["bun-one-shot", "node+bun-one-shot"].includes(descriptor.participationMode),
      "Bun bridge resource descriptor binding drift"
    );
  }
  return descriptor;
}

const REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE = deepFreezeExact({
  "bootstrap-preflight": ["runtime/set-001-storage-preflight"],
  database: [
    "runtime/set-004b-session-policy-preflight",
    "runtime/set-004c-auth-rate-budget-preflight",
    "runtime/set-032-storage-post-setup",
    "runtime/set-041-preference-a",
    "runtime/set-042-preference-a-proof",
    "runtime/set-043-preference-b",
    "runtime/set-044-preference-b-proof",
  ],
  "user-identity-proof": ["runtime/set-013-user-a-proof", "runtime/set-015-user-b-proof"],
  "user-provisioning": ["runtime/set-012-user-a-create", "runtime/set-014-user-b-create"],
  "schema-only": ["runtime/set-035-screen-create", "runtime/set-037-retry-screen-create"],
});

function bunBridgeOperationDescriptor(
  operationId,
  source,
  envProfileId,
  inputKeys,
  outputSchemaId
) {
  invariant(
    typeof operationId === "string" &&
      operationId.length > 0 &&
      typeof source === "string" &&
      source.length > 0 &&
      BUN_BRIDGE_ENV_PROFILES[envProfileId] !== undefined &&
      Array.isArray(inputKeys) &&
      inputKeys.every((key) => typeof key === "string") &&
      new Set(inputKeys).size === inputKeys.length &&
      typeof BUN_BRIDGE_OUTPUT_VALIDATORS[outputSchemaId] === "function",
    "Bun bridge descriptor input drift"
  );
  const descriptor = deepFreezeExact({
    operationId,
    file: BUN_BRIDGE_EXECUTION_AUTHORITY.file,
    argvShape: BUN_BRIDGE_EXECUTION_AUTHORITY.argvShape,
    cwdShape: BUN_BRIDGE_EXECUTION_AUTHORITY.cwdShape,
    source,
    sourceSha256: hashBytes(Buffer.from(source)),
    envProfileId,
    inputSchemaId: bunBridgeInputSchemaId(source, inputKeys),
    inputKeys: deepFreezeExact([...inputKeys].sort()),
    outputSchemaId,
    timeoutMs: BUN_BRIDGE_EXECUTION_AUTHORITY.timeoutMs,
    maxStdinBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes,
    maxStdoutBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdoutBytes,
    maxStderrBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStderrBytes,
  });
  return validateBunBridgeOperationDescriptor(descriptor, operationId);
}

const RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID = deepFreezeExact({
  "set-012-user-a-create": "user",
  "set-014-user-b-create": "user",
  "set-016-editable-type-create": "content-type",
  "set-018-related-a-type-create": "content-type",
  "set-020-related-b-type-create": "content-type",
  "set-021a-related-failure-type-create": "content-type",
  "set-022-related-a1-create": "entry",
  "set-024-related-a2-create": "entry",
  "set-026-related-b1-create": "entry",
  "set-028-related-b2-create": "entry",
  "set-029a-related-failure1-create": "entry",
  "set-033-entry-create": "entry",
  "set-030-media-upload": "media",
  "set-035-screen-create": "screen",
  "set-037-retry-screen-create": "screen",
  "set-039-override-create": "override",
  "set-041-preference-a": "setting",
  "set-043-preference-b": "setting",
});
const RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY = deepFreezeExact({
  user: {
    preflight: RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
    profile: "user-identity-proof",
    preflightKeys: ["email"],
  },
  "content-type": {
    preflight: RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["slug"],
  },
  entry: {
    preflight: RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["entrySlug", "typeSlug"],
  },
  media: {
    preflight: RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["mimeType", "originalName", "size"],
  },
  screen: {
    preflight: RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["contentTypeSlug", "name"],
  },
  override: {
    preflight: RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE,
    profile: "database",
    preflightKeys: ["blockId", "contentTypeSlug", "entrySlug", "propPath", "screenName"],
  },
  setting: {
    preflight: RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE,
    discovery: RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE,
    profile: "user-identity-proof",
    preflightKeys: ["email"],
  },
});

const BUN_BRIDGE_RESOURCE_OPERATION_DESCRIPTORS = PRIVATE_BUN_RESOURCE_DESCRIPTORS;

export {
  BUN_BRIDGE_BASE_DESCRIPTOR_KEYS,
  BUN_BRIDGE_RESOURCE_DESCRIPTOR_KEYS,
  BUN_BRIDGE_RESOURCE_OPERATION_DESCRIPTORS,
  PRIVATE_BUN_RESOURCE_DESCRIPTORS,
  REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE,
  RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID,
  RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY,
  bindBunBridgeOutputValidatorRegistry,
  bunBridgeOperationDescriptor,
  validateBunBridgeOperationDescriptor,
};
