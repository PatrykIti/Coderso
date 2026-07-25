// Resource Bun operation authority for the TASK-540 smoke executor.
//
// Owns the per-resource Bun descriptor registry promotion, the descriptor/ledger
// exactness proofs, the bound resource operation dispatch and the static Bun bridge
// descriptor registry validation.
import { deepFreezeExact, exactOwnKeys, hashBytes, invariant } from "./foundation.mjs";
import {
  RESOURCE_BUN_BRIDGE_PARTICIPATION,
  assertResourceBunParticipationExhaustive,
  deepEqualJson,
} from "./resource-contracts.mjs";
import {
  BUN_BRIDGE_INPUT_VALIDATORS,
  bunBridgeInputSchemaId,
} from "./bridge-input-validators.mjs";
import {
  assertCurrentResourceOwnerBridgeFailClosedSource,
  assertSeoEntryDiscoveryBridgeFailClosedSource,
} from "./bridge-sources/platform.mjs";
import {
  assertSeoEntryDocumentExactBridgeSourcesFailClosed,
} from "./bun-bridge-resource-sources.mjs";
import { BUN_BRIDGE_ENV_PROFILES } from "../runtime/bun-bridge-transport.mjs";

export const PRIVATE_BUN_OPERATION_DESCRIPTORS = new WeakMap();

export function resourceBunParticipationSlot(core, slot) {
  const participation = RESOURCE_BUN_BRIDGE_PARTICIPATION[core.kind];
  invariant(participation !== undefined, "resource Bun participation kind is absent");
  if (slot === "provenance") return participation.provenance[core.acquisitionChannel];
  return participation[slot];
}

function resourceBunSourceSpecKey(core, slot) {
  return slot === "provenance"
    ? core.kind + "/provenance/" + core.acquisitionChannel
    : core.kind + "/" + slot;
}

function expectedResourceBunOperationIds(records) {
  const expected = [];
  for (const record of records) {
    for (const [slot, operationId] of [
      ["provenance", record.provenanceOpId],
      ["cleanup", record.cleanupOpId],
      ["absence", record.absenceOpId],
    ]) {
      const participation = resourceBunParticipationSlot(record, slot);
      if (
        participation !== null &&
        (participation.mode === "bun-one-shot" || participation.mode === "node+bun-one-shot")
      ) {
        expected.push(operationId);
      }
    }
  }
  invariant(
    new Set(expected).size === expected.length,
    "derived resource Bun operation IDs contain duplicates"
  );
  return expected.sort();
}

export function createResourceBunOperationAuthority(dependencies) {
  // The static descriptor registries, the per-resource descriptor registry, the descriptor
  // constructors and the Bun bridge operation runner belong to authorities the facade
  // composes from runtime services, so they cannot be imported statically. The facade
  // injects them here and every function below closes over those exact values, so this
  // module keeps no mutable state of its own.
  exactOwnKeys(
    dependencies,
    [
      "BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS",
      "BUN_BRIDGE_OPERATION_DESCRIPTORS",
      "BUN_BRIDGE_OUTPUT_VALIDATORS",
      "BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS",
      "BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS",
      "PRIVATE_BUN_RESOURCE_DESCRIPTORS",
      "REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE",
      "RESOURCE_BUN_SOURCE_SPECS",
      "bunBridgeOperationDescriptor",
      "runBunBridgeOperation",
      "validateBunBridgeOperationDescriptor",
    ],
    "resource Bun operation authority dependencies",
    { plain: true }
  );
  invariant(
    [
      dependencies.BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
      dependencies.BUN_BRIDGE_OPERATION_DESCRIPTORS,
      dependencies.BUN_BRIDGE_OUTPUT_VALIDATORS,
      dependencies.BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
      dependencies.BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
      dependencies.REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE,
      dependencies.RESOURCE_BUN_SOURCE_SPECS,
    ].every(
      (registry) =>
        registry !== null && typeof registry === "object" && Object.isFrozen(registry)
    ),
    "resource Bun operation authority registries are not frozen"
  );
  invariant(
    dependencies.PRIVATE_BUN_RESOURCE_DESCRIPTORS instanceof WeakMap &&
      typeof dependencies.bunBridgeOperationDescriptor === "function" &&
      typeof dependencies.runBunBridgeOperation === "function" &&
      typeof dependencies.validateBunBridgeOperationDescriptor === "function",
    "resource Bun operation authority binding drift"
  );
  const {
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_OUTPUT_VALIDATORS,
    BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
    PRIVATE_BUN_RESOURCE_DESCRIPTORS,
    REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE,
    RESOURCE_BUN_SOURCE_SPECS,
    bunBridgeOperationDescriptor,
    runBunBridgeOperation,
    validateBunBridgeOperationDescriptor,
  } = dependencies;

  function initializeBunBridgeOperationAuthority(state) {
    invariant(
      !PRIVATE_BUN_RESOURCE_DESCRIPTORS.has(state) && !PRIVATE_BUN_OPERATION_DESCRIPTORS.has(state),
      "Bun operation authority was assigned twice"
    );
    PRIVATE_BUN_RESOURCE_DESCRIPTORS.set(state, new Map());
    PRIVATE_BUN_OPERATION_DESCRIPTORS.set(
      state,
      new Map(Object.entries(BUN_BRIDGE_OPERATION_DESCRIPTORS))
    );
  }

  function promoteResourceBunDescriptorsAfterLedgerAppend(state, delta) {
    const resourceRegistry = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state);
    const unionRegistry = PRIVATE_BUN_OPERATION_DESCRIPTORS.get(state);
    invariant(
      resourceRegistry instanceof Map && unionRegistry instanceof Map,
      "resource Bun descriptor authority is absent"
    );
    for (const core of delta.cores) {
      for (const [slot, operationId] of [
        ["provenance", core.provenanceOpId],
        ["cleanup", core.cleanupOpId],
        ["absence", core.absenceOpId],
      ]) {
        const participation = resourceBunParticipationSlot(core, slot);
        if (participation === null) {
          invariant(operationId === null, "null resource Bun slot has an operation ID");
          continue;
        }
        if (
          participation.mode === "bound-runtime-bridge" ||
          participation.mode === "node+bound-runtime-bridge"
        ) {
          invariant(
            slot === "provenance" &&
              BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS[participation.operationId] !== undefined,
            "bound runtime resource descriptor drift"
          );
          continue;
        }
        if (participation.mode === "node-local") continue;
        invariant(
          participation.mode === "bun-one-shot" || participation.mode === "node+bun-one-shot",
          "resource Bun descriptor mode is not executable"
        );
        const specKey = resourceBunSourceSpecKey(core, slot);
        const spec = RESOURCE_BUN_SOURCE_SPECS[specKey];
        invariant(
          spec !== undefined && spec.envProfileId === participation.envProfileId,
          "resource Bun source spec drift: " + specKey
        );
        invariant(
          typeof operationId === "string" &&
            !resourceRegistry.has(operationId) &&
            !unionRegistry.has(operationId),
          "resource Bun operation ID collision"
        );
        const descriptor = validateBunBridgeOperationDescriptor(
          deepFreezeExact({
            ...bunBridgeOperationDescriptor(
              operationId,
              spec.source,
              spec.envProfileId,
              spec.inputKeys,
              spec.outputSchemaId
            ),
            resourceKey: core.resourceKey,
            resourceKind: core.kind,
            resourceSlot: slot,
            acquisitionChannel: core.acquisitionChannel,
            participationMode: participation.mode,
          }),
          operationId
        );
        resourceRegistry.set(operationId, descriptor);
        unionRegistry.set(operationId, descriptor);
      }
    }
  }

  function assertResourceBunDescriptorSetExact(state, records) {
    const resourceRegistry = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state);
    invariant(resourceRegistry instanceof Map, "resource Bun registry is absent");
    const expected = expectedResourceBunOperationIds(records);
    const actual = [...resourceRegistry.keys()].sort();
    invariant(deepEqualJson(actual, expected), "resource Bun descriptor/ledger set equality drift");
    for (const record of records) {
      const perResourceSourceHashes = [];
      for (const [slot, operationId] of [
        ["provenance", record.provenanceOpId],
        ["cleanup", record.cleanupOpId],
        ["absence", record.absenceOpId],
      ]) {
        const participation = resourceBunParticipationSlot(record, slot);
        if (
          participation === null ||
          !["bun-one-shot", "node+bun-one-shot"].includes(participation.mode)
        )
          continue;
        const descriptor = resourceRegistry.get(operationId);
        const spec = RESOURCE_BUN_SOURCE_SPECS[resourceBunSourceSpecKey(record, slot)];
        validateBunBridgeOperationDescriptor(descriptor, operationId);
        invariant(
          descriptor?.operationId === operationId &&
            descriptor.resourceKey === record.resourceKey &&
            descriptor.resourceKind === record.kind &&
            descriptor.resourceSlot === slot &&
            descriptor.acquisitionChannel === record.acquisitionChannel &&
            descriptor.participationMode === participation.mode &&
            descriptor.source === spec?.source &&
            descriptor.sourceSha256 === hashBytes(Buffer.from(spec.source)),
          "resource Bun P/C/A descriptor binding drift"
        );
        perResourceSourceHashes.push(descriptor.sourceSha256);
      }
      invariant(
        new Set(perResourceSourceHashes).size === perResourceSourceHashes.length,
        "resource Bun P/C/A sources are not independently immutable"
      );
    }
  }

  async function runBoundResourceBunOperation(state, record, operationKind) {
    const slot =
      operationKind === "provenance"
        ? "provenance"
        : operationKind === "delete"
          ? "cleanup"
          : "absence";
    const operationId =
      record[
        slot === "provenance" ? "provenanceOpId" : slot === "cleanup" ? "cleanupOpId" : "absenceOpId"
      ];
    const descriptor = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state)?.get(operationId);
    invariant(
      descriptor !== undefined &&
        descriptor.resourceKey === record.resourceKey &&
        descriptor.resourceSlot === slot,
      "bound resource Bun descriptor lookup drift"
    );
    return runBunBridgeOperation(state, operationId, { identifier: record.identifier });
  }

  function validateStaticBunBridgeDescriptorRegistries({
    runtimeRegistry = BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
    operationRegistry = BUN_BRIDGE_OPERATION_DESCRIPTORS,
  } = {}) {
    assertCurrentResourceOwnerBridgeFailClosedSource();
    assertSeoEntryDiscoveryBridgeFailClosedSource();
    assertSeoEntryDocumentExactBridgeSourcesFailClosed();
    assertResourceBunParticipationExhaustive();
    const requiredRuntimeIds = Object.values(
      REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE
    ).flat();
    invariant(
      requiredRuntimeIds.length === 14 && new Set(requiredRuntimeIds).size === 14,
      "required runtime Bun descriptor count drift"
    );
    invariant(
      deepEqualJson(Object.keys(runtimeRegistry).sort(), [...requiredRuntimeIds].sort()),
      "runtime Bun descriptor key-set drift"
    );
    invariant(
      deepEqualJson(
        Object.keys(BUN_BRIDGE_ENV_PROFILES).sort(),
        Object.keys(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).sort()
      ),
      "Bun descriptor environment profile-set drift"
    );
    invariant(
      Object.entries(BUN_BRIDGE_ENV_PROFILES).every(
        ([profileId, profile]) =>
          profile.requiredRepo.includes("ADMIN_PASSWORD") === (profileId === "user-provisioning") &&
          !profile.optionalRepo.includes("ADMIN_PASSWORD")
      ),
      "ADMIN_PASSWORD may enter only the exact user-provisioning Bun profile"
    );
    const expectedStaticIds = [
      ...Object.keys(runtimeRegistry),
      ...Object.keys(BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS),
      ...Object.keys(BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS),
    ].sort();
    invariant(
      deepEqualJson(Object.keys(operationRegistry).sort(), expectedStaticIds) &&
        new Set(expectedStaticIds).size === expectedStaticIds.length,
      "static Bun operation descriptor union drift"
    );
    const expectedOutputSchemaIds = [
      ...new Set([
        ...Object.values(BUN_BRIDGE_OPERATION_DESCRIPTORS).map(
          ({ outputSchemaId }) => outputSchemaId
        ),
        ...Object.values(RESOURCE_BUN_SOURCE_SPECS).map(({ outputSchemaId }) => outputSchemaId),
      ]),
    ].sort();
    invariant(
      deepEqualJson(Object.keys(BUN_BRIDGE_OUTPUT_VALIDATORS).sort(), expectedOutputSchemaIds),
      "Bun bridge output validator registry is not exhaustive"
    );
    const expectedInputSchemaIds = [
      ...new Set([
        ...Object.values(BUN_BRIDGE_OPERATION_DESCRIPTORS).map(({ inputSchemaId }) => inputSchemaId),
        ...Object.values(RESOURCE_BUN_SOURCE_SPECS).map(({ inputKeys, source }) =>
          bunBridgeInputSchemaId(source, inputKeys)
        ),
      ]),
    ].sort();
    invariant(
      deepEqualJson(Object.keys(BUN_BRIDGE_INPUT_VALIDATORS).sort(), expectedInputSchemaIds),
      "Bun bridge input validator registry is not exhaustive"
    );
    const expectedProfileByRuntimeId = new Map(
      Object.entries(REQUIRED_BUN_BRIDGE_RUNTIME_OPERATION_IDS_BY_ENV_PROFILE).flatMap(
        ([profile, operationIds]) => operationIds.map((operationId) => [operationId, profile])
      )
    );
    for (const [operationId, descriptor] of Object.entries(operationRegistry)) {
      validateBunBridgeOperationDescriptor(descriptor, operationId);
      invariant(
        deepEqualJson(descriptor, BUN_BRIDGE_OPERATION_DESCRIPTORS[operationId]) &&
          (expectedProfileByRuntimeId.get(operationId) === undefined ||
            expectedProfileByRuntimeId.get(operationId) === descriptor.envProfileId),
        "Bun descriptor canonical source/profile/schema/argv/cwd/limit identity drift"
      );
    }
  }

  function bunBridgeDescriptorForOperation(state, operationId) {
    invariant(
      typeof operationId === "string" && operationId.length > 0,
      "Bun bridge operation ID is invalid"
    );
    const privateRegistry = PRIVATE_BUN_OPERATION_DESCRIPTORS.get(state);
    invariant(privateRegistry instanceof Map, "private Bun bridge operation registry is absent");
    const descriptor = privateRegistry.get(operationId);
    const staticDescriptor = BUN_BRIDGE_OPERATION_DESCRIPTORS[operationId];
    const resourceDescriptor = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(state)?.get(operationId);
    invariant(
      descriptor !== undefined &&
        (descriptor === staticDescriptor || descriptor === resourceDescriptor),
      "Bun bridge operation is not registered by canonical identity: " + operationId
    );
    return validateBunBridgeOperationDescriptor(descriptor, operationId);
  }
  return Object.freeze({
    assertResourceBunDescriptorSetExact,
    bunBridgeDescriptorForOperation,
    initializeBunBridgeOperationAuthority,
    promoteResourceBunDescriptorsAfterLedgerAppend,
    runBoundResourceBunOperation,
    validateStaticBunBridgeDescriptorRegistries,
  });
}
