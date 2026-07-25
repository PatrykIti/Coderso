import path from "node:path";

import {
  BUN_BRIDGE_EXECUTION_AUTHORITY,
  MAX_COMPLETE_SESSION_ROWS,
} from "../config.mjs";
import { assertStorageFallbackEnvironmentAbsent } from "../environment.mjs";
import { deepFreezeExact, hashBytes, invariant } from "../foundation.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { ResourceLedgerBuilder, createResourceCore } from "../resource-ledger.mjs";
import {
  BRIDGE_INPUT_READER,
  bridgeInputSchemaGuard,
} from "../../runtime/bun-child-protocol.mjs";

export async function runBunBridgeContractsSelfTest(dependencies) {
  const {
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_INPUT_VALIDATORS,
    BUN_BRIDGE_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
    PRIVATE_BUN_RESOURCE_DESCRIPTORS,
    RESOURCE_BUN_SOURCE_SPECS,
    assertFinalStorageDatabaseBaseline,
    assertPreparedBunBridgeFrameExact,
    assertResourceBunDescriptorSetExact,
    dryDispatchBunBridgeDescriptor,
    encodeBoundedBunBridgeCanonicalFrame,
    expectAsyncFailure,
    initializeBunBridgeOperationAuthority,
    prepareBunBridgeDispatch,
    promoteResourceBunDescriptorsAfterLedgerAppend,
    responseLostStorageRoot,
    selfTestBunBridgeInputForSchema,
    selfTestExactBunChildInputSource,
    validateBunBridgeInput,
    validateBunBridgeOperationDescriptor,
    validateBunBridgeOutput,
    validateStaticBunBridgeDescriptorRegistries,
  } = dependencies;
  validateStaticBunBridgeDescriptorRegistries();
  const exactChildInputSchemaIds = Object.keys(BUN_BRIDGE_INPUT_VALIDATORS).sort();
  invariant(exactChildInputSchemaIds.length === 26, "Bun child input schema count drift");
  for (const schemaId of exactChildInputSchemaIds) {
    const input = selfTestBunBridgeInputForSchema(schemaId);
    invariant(
      (await selfTestExactBunChildInputSource(schemaId, input)) === input,
      schemaId + " child Bun positive input parity drift"
    );
  }
  const dryResourceUuid = (ordinal) =>
    `54000000-0000-4000-8000-${String(7600 + ordinal).padStart(12, "0")}`;
  const dryResourceCoreSpecs = [
    [
      "presentation-override",
      "failure-discovery",
      [dryResourceUuid(1), dryResourceUuid(2), "task-540-block", "mediaAssetId"],
    ],
    ["seo-document-entry", "cleanup-discovery", [dryResourceUuid(19), "entry", dryResourceUuid(7)]],
    [
      "setting-user-a",
      "failure-discovery",
      [dryResourceUuid(3), "customScreens.entry.preferences"],
    ],
    [
      "setting-user-b",
      "failure-discovery",
      [dryResourceUuid(4), "customScreens.entry.preferences"],
    ],
    ["screen-main", "failure-discovery", [dryResourceUuid(5)]],
    ["screen-retry", "failure-discovery", [dryResourceUuid(6)]],
    ["entry-editable", "failure-discovery", [dryResourceUuid(7)]],
    ["entry-related", "failure-discovery", [dryResourceUuid(8)]],
    ["content-type", "failure-discovery", [dryResourceUuid(9)]],
    ["media-row-key", "admin-api", [dryResourceUuid(10), `2026/07/${dryResourceUuid(10)}.png`]],
    [
      "media-row-key",
      "failure-discovery",
      [dryResourceUuid(11), `2026/07/${dryResourceUuid(11)}.png`],
    ],
    ["audit-log-task-ua", "terminal-db-delta", [dryResourceUuid(12)]],
    ["access-log-task-ua", "terminal-db-delta", [dryResourceUuid(13)]],
    ["session-task", "terminal-db-delta", [dryResourceUuid(14)]],
    ["user-a", "failure-discovery", [dryResourceUuid(15)]],
    ["user-b", "failure-discovery", [dryResourceUuid(16)]],
    ["bootstrap-user-login-state", "preflight", [dryResourceUuid(17)]],
    ["site-content-routes-baseline", "preflight", ["site.contentRoutes"]],
    ["storage-baseline", "preflight", ["storage-baseline"]],
    ["missing-media-baseline", "preflight", [dryResourceUuid(18)]],
  ];
  const dryResourceCores = deepFreezeExact(
    dryResourceCoreSpecs.map(([kind, acquisitionChannel, identifier], index) =>
      createResourceCore({
        acquisitionChannel,
        acquisitionSourceId: "self-test-bun-resource-" + String(index + 1),
        identifier,
        kind,
        sourceActionOrdinal: index + 1,
      })
    )
  );
  const dryResourceDelta = deepFreezeExact({
    cores: dryResourceCores,
    dependencyEdges: [],
  });
  const dryResourceLedger = new ResourceLedgerBuilder();
  dryResourceLedger.appendValidatedDelta(dryResourceDelta);
  const dryPersistentResourceRecords = dryResourceLedger.compileResourceRecords("persistent");
  const dryTerminalResourceRecords = dryResourceLedger.compileResourceRecords("terminal");
  invariant(
    dryPersistentResourceRecords.length === 17 &&
      dryTerminalResourceRecords.length === 3 &&
      new Set(
        [...dryPersistentResourceRecords, ...dryTerminalResourceRecords].map(
          ({ resourceKey }) => resourceKey
        )
      ).size === dryResourceCores.length,
    "dry-dispatch resource cores did not cross the real ledger boundary"
  );
  const dryResourceDescriptorState = {};
  initializeBunBridgeOperationAuthority(dryResourceDescriptorState);
  promoteResourceBunDescriptorsAfterLedgerAppend(dryResourceDescriptorState, dryResourceDelta);
  assertResourceBunDescriptorSetExact(dryResourceDescriptorState, dryResourceCores);
  const staticDryDescriptors = Object.values(BUN_BRIDGE_OPERATION_DESCRIPTORS);
  const resourceDryDescriptors = [
    ...PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(dryResourceDescriptorState).values(),
  ];
  const seenResourceSpecKeys = new Set(
    resourceDryDescriptors.map((descriptor) =>
      descriptor.resourceSlot === "provenance"
        ? descriptor.resourceKind + "/provenance/" + descriptor.acquisitionChannel
        : descriptor.resourceKind + "/" + descriptor.resourceSlot
    )
  );
  invariant(
    staticDryDescriptors.length === 62 &&
      resourceDryDescriptors.length === 43 &&
      seenResourceSpecKeys.size === 41 &&
      Object.keys(RESOURCE_BUN_SOURCE_SPECS).length === 41 &&
      deepEqualJson(
        [...seenResourceSpecKeys].sort(),
        Object.keys(RESOURCE_BUN_SOURCE_SPECS).sort()
      ),
    "Bun dry-dispatch descriptor/spec matrix drift"
  );
  const dryResourceCoreByKey = new Map(dryResourceCores.map((core) => [core.resourceKey, core]));
  const dryExternalExecutionTrap = new Error("TASK-540 hermetic Bun external execution trap");
  let dryExternalExecutionTrapCalls = 0;
  const dryDispatchProjections = [];
  let credentialBearingDryDispatches = 0;
  for (const descriptor of [...staticDryDescriptors, ...resourceDryDescriptors]) {
    const core = Object.hasOwn(descriptor, "resourceKey")
      ? dryResourceCoreByKey.get(descriptor.resourceKey)
      : null;
    invariant(
      core !== undefined,
      descriptor.operationId + " dry-dispatch resource core binding is absent"
    );
    const genericInput = selfTestBunBridgeInputForSchema(descriptor.inputSchemaId);
    let input = genericInput;
    if (core !== null && descriptor.inputSchemaId.startsWith("identifier-")) {
      input = deepFreezeExact({ identifier: core.identifier });
    } else if (core !== null && descriptor.inputSchemaId === "user-session-observation-input-v1") {
      input = deepFreezeExact({ ...genericInput, userId: core.identifier[0] });
    } else if (core !== null && descriptor.inputSchemaId === "media-id-input-v1") {
      input = deepFreezeExact({ mediaId: core.identifier[0] });
    } else if (core !== null && descriptor.inputSchemaId === "bootstrap-restore-input-v1") {
      input = deepFreezeExact({
        ...genericInput,
        baseline: {
          ...genericInput.baseline,
          id: core.identifier[0],
          rawUserRow: {
            ...genericInput.baseline.rawUserRow,
            id: core.identifier[0],
          },
          roleTuples: genericInput.baseline.roleTuples.map((role) => ({
            ...role,
            userId: core.identifier[0],
          })),
        },
        userId: core.identifier[0],
      });
    }
    let trappedAtExternalBoundary = false;
    try {
      dryDispatchBunBridgeDescriptor({}, descriptor, input, (projection) => {
        dryExternalExecutionTrapCalls += 1;
        const credentialBearing = descriptor.inputSchemaId === "bootstrap-restore-input-v1";
        if (credentialBearing) credentialBearingDryDispatches += 1;
        invariant(
          projection.operationId === descriptor.operationId &&
            projection.sourceSha256 === descriptor.sourceSha256 &&
            projection.inputSchemaId === descriptor.inputSchemaId &&
            projection.outputSchemaId === descriptor.outputSchemaId &&
            Number.isSafeInteger(projection.frameBytes) &&
            projection.frameBytes > 0 &&
            !Object.hasOwn(projection, "frameSha256"),
          descriptor.operationId + " dry-dispatch projection drift"
        );
        dryDispatchProjections.push(projection);
        throw dryExternalExecutionTrap;
      });
    } catch (error) {
      trappedAtExternalBoundary = error === dryExternalExecutionTrap;
    }
    invariant(
      trappedAtExternalBoundary,
      descriptor.operationId + " did not reach the hermetic external-execution trap"
    );
  }
  invariant(
    dryExternalExecutionTrapCalls === 105 &&
      dryDispatchProjections.length === 105 &&
      credentialBearingDryDispatches === 2 &&
      new Set(dryDispatchProjections.map(({ operationId }) => operationId)).size === 105,
    "Bun static/resource dry-dispatch coverage drift"
  );
  const credentialDescriptor =
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/bootstrap-cas-restore"];
  const credentialInput = selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1");
  const credentialPrepared = prepareBunBridgeDispatch({}, credentialDescriptor, credentialInput);
  const decodedCredentialFrame = JSON.parse(credentialPrepared.frame.toString("utf8"));
  invariant(
    !Object.hasOwn(credentialPrepared.projection, "frameSha256") &&
      decodedCredentialFrame.baseline.rawUserRow.passwordHash ===
        credentialInput.baseline.rawUserRow.passwordHash,
    "credential-bearing Bun frame projection drift"
  );
  const mutatedCredentialPrepared = prepareBunBridgeDispatch(
    {},
    credentialDescriptor,
    credentialInput
  );
  mutatedCredentialPrepared.frame[0] ^= 0x01;
  await expectAsyncFailure(
    async () =>
      assertPreparedBunBridgeFrameExact(
        {},
        credentialDescriptor,
        credentialInput,
        mutatedCredentialPrepared
      ),
    "mutated credential-bearing Bun frame"
  );
  const secretFreeDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-004b-session-policy-preflight"];
  const secretFreePrepared = prepareBunBridgeDispatch({}, secretFreeDescriptor, {});
  invariant(
    !Object.hasOwn(secretFreePrepared.projection, "frameSha256") &&
      secretFreePrepared.frame.equals(Buffer.from("{}\n")),
    "secret-free Bun frame projection drift"
  );
  const missingRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  delete missingRuntimeRegistry["runtime/set-001-storage-preflight"];
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({ runtimeRegistry: missingRuntimeRegistry }),
    "missing runtime Bun descriptor"
  );
  const extraOperationRegistry = {
    ...BUN_BRIDGE_OPERATION_DESCRIPTORS,
    "runtime/extra": BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-001-storage-preflight"],
  };
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({ operationRegistry: extraOperationRegistry }),
    "extra static Bun descriptor"
  );
  const reversedRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  const reversedOperationRegistry = { ...BUN_BRIDGE_OPERATION_DESCRIPTORS };
  const reversedId = "runtime/set-001-storage-preflight";
  const reversedDescriptor = { ...reversedRuntimeRegistry[reversedId], envProfileId: "database" };
  reversedRuntimeRegistry[reversedId] = reversedDescriptor;
  reversedOperationRegistry[reversedId] = reversedDescriptor;
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({
        operationRegistry: reversedOperationRegistry,
        runtimeRegistry: reversedRuntimeRegistry,
      }),
    "reversed runtime Bun environment profile"
  );
  const unknownOutputRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  const unknownOutputOperationRegistry = { ...BUN_BRIDGE_OPERATION_DESCRIPTORS };
  const unknownOutputDescriptor = deepFreezeExact({
    ...unknownOutputRuntimeRegistry[reversedId],
    outputSchemaId: "unregistered-private-output-v1",
  });
  unknownOutputRuntimeRegistry[reversedId] = unknownOutputDescriptor;
  unknownOutputOperationRegistry[reversedId] = unknownOutputDescriptor;
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({
        operationRegistry: unknownOutputOperationRegistry,
        runtimeRegistry: unknownOutputRuntimeRegistry,
      }),
    "unregistered Bun output schema"
  );
  const driftedLimitRuntimeRegistry = { ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS };
  const driftedLimitOperationRegistry = { ...BUN_BRIDGE_OPERATION_DESCRIPTORS };
  const driftedLimitDescriptor = deepFreezeExact({
    ...driftedLimitRuntimeRegistry[reversedId],
    maxStdoutBytes: BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdoutBytes + 1,
  });
  driftedLimitRuntimeRegistry[reversedId] = driftedLimitDescriptor;
  driftedLimitOperationRegistry[reversedId] = driftedLimitDescriptor;
  await expectAsyncFailure(
    async () =>
      validateStaticBunBridgeDescriptorRegistries({
        operationRegistry: driftedLimitOperationRegistry,
        runtimeRegistry: driftedLimitRuntimeRegistry,
      }),
    "drifted Bun descriptor stream bound"
  );
  const guardedDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-001-storage-preflight"];
  const exactChildGuard = bridgeInputSchemaGuard(guardedDescriptor.inputSchemaId);
  invariant(
    guardedDescriptor.source.startsWith(BRIDGE_INPUT_READER + exactChildGuard),
    "self-test child input guard fixture drift"
  );
  const sourceWithoutChildGuard =
    BRIDGE_INPUT_READER +
    guardedDescriptor.source.slice((BRIDGE_INPUT_READER + exactChildGuard).length);
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOperationDescriptor(
        deepFreezeExact({
          ...guardedDescriptor,
          source: sourceWithoutChildGuard,
          sourceSha256: hashBytes(Buffer.from(sourceWithoutChildGuard)),
        })
      ),
    "Bun child source without its independently bound input schema guard"
  );
  await expectAsyncFailure(
    async () =>
      encodeBoundedBunBridgeCanonicalFrame(
        { payload: "x".repeat(BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes) },
        BUN_BRIDGE_EXECUTION_AUTHORITY.maxStdinBytes
      ),
    "over-limit Bun descriptor input frame"
  );
  const storageContractRoot = "/task540-self-test-root";
  const storageContractTimestamp = "2026-07-16T00:00:00.000Z";
  const storageContractRequiredSettings = deepFreezeExact({
    driver: {
      key: "storage.driver",
      updatedAt: storageContractTimestamp,
      value: "local",
    },
    localDir: {
      key: "storage.local.dir",
      updatedAt: storageContractTimestamp,
      value: "./storage/media",
    },
    setup: {
      key: "setup.completed",
      updatedAt: storageContractTimestamp,
      value: true,
    },
  });
  const storageContractOutput = deepFreezeExact({
    bootstrap: selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1").baseline,
    contentRoutes: { exists: false, updatedAt: null, value: null },
    local: true,
    requiredSettings: storageContractRequiredSettings,
    setupComplete: true,
    storageRoot: path.resolve(storageContractRoot, "core", "./storage/media"),
    taskTrafficBaseline: { accessIds: [], auditIds: [], sessionIds: [] },
  });
  const storageContractState = { root: storageContractRoot };
  invariant(
    validateBunBridgeOutput(storageContractState, guardedDescriptor, {}, storageContractOutput) ===
      storageContractOutput,
    "storage preflight exact positive contract drift"
  );
  invariant(
    responseLostStorageRoot({
      root: storageContractRoot,
      storageRootBaseline: storageContractOutput.storageRoot,
    }) === storageContractOutput.storageRoot,
    "storage response-lost absolute root guard drift"
  );
  const storageOutputWithoutSetting = structuredClone(storageContractOutput);
  delete storageOutputWithoutSetting.requiredSettings.localDir;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithoutSetting
      ),
    "storage preflight missing required setting"
  );
  const storageOutputWithUnknownSetting = structuredClone(storageContractOutput);
  storageOutputWithUnknownSetting.requiredSettings.unexpected = {
    key: "unexpected",
    updatedAt: storageContractTimestamp,
    value: "unexpected",
  };
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithUnknownSetting
      ),
    "storage preflight unknown required setting"
  );
  const storageOutputWithoutNestedField = structuredClone(storageContractOutput);
  delete storageOutputWithoutNestedField.requiredSettings.localDir.updatedAt;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithoutNestedField
      ),
    "storage preflight missing nested required-setting field"
  );
  const storageOutputWithUnknownNestedField = structuredClone(storageContractOutput);
  storageOutputWithUnknownNestedField.requiredSettings.localDir.unexpected = true;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithUnknownNestedField
      ),
    "storage preflight unknown nested required-setting field"
  );
  const storageOutputWithWrongKey = structuredClone(storageContractOutput);
  storageOutputWithWrongKey.requiredSettings.localDir.key = "storage.local.directory";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithWrongKey
      ),
    "storage preflight wrong required setting key"
  );
  const storageOutputWithWrongValue = structuredClone(storageContractOutput);
  storageOutputWithWrongValue.requiredSettings.driver.value = "s3";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithWrongValue
      ),
    "storage preflight wrong required setting value"
  );
  const storageOutputWithEmptyLocalDir = structuredClone(storageContractOutput);
  storageOutputWithEmptyLocalDir.requiredSettings.localDir.value = "";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithEmptyLocalDir
      ),
    "storage preflight empty local directory"
  );
  const storageOutputWithWrongTimestamp = structuredClone(storageContractOutput);
  storageOutputWithWrongTimestamp.requiredSettings.setup.updatedAt = null;
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithWrongTimestamp
      ),
    "storage preflight missing required setting timestamp"
  );
  const storageOutputWithMalformedTimestamp = structuredClone(storageContractOutput);
  storageOutputWithMalformedTimestamp.requiredSettings.setup.updatedAt = "not-an-iso-timestamp";
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        storageContractState,
        guardedDescriptor,
        {},
        storageOutputWithMalformedTimestamp
      ),
    "storage preflight malformed required setting timestamp"
  );
  for (const [label, storageRoot] of [
    ["wrong core", path.resolve(storageContractRoot, "storage/media")],
    ["relative", "./storage/media"],
    ["noncanonical", storageContractRoot + "/core/storage/../storage/media"],
  ]) {
    const invalidStorageRootOutput = structuredClone(storageContractOutput);
    invalidStorageRootOutput.storageRoot = storageRoot;
    await expectAsyncFailure(
      async () =>
        validateBunBridgeOutput(
          storageContractState,
          guardedDescriptor,
          {},
          invalidStorageRootOutput
        ),
      "storage preflight " + label + " root"
    );
  }
  await expectAsyncFailure(
    async () =>
      responseLostStorageRoot({
        root: storageContractRoot,
        storageRootBaseline: "./storage/media",
      }),
    "response-lost relative storage root"
  );
  const emptyStorageEnvironment = Object.create(null);
  assertStorageFallbackEnvironmentAbsent(emptyStorageEnvironment, emptyStorageEnvironment);
  for (const key of ["MEDIA_STORAGE", "MEDIA_DIR"]) {
    await expectAsyncFailure(
      async () =>
        assertStorageFallbackEnvironmentAbsent(
          Object.assign(Object.create(null), { [key]: "" }),
          emptyStorageEnvironment
        ),
      "repo storage fallback presence " + key
    );
    await expectAsyncFailure(
      async () =>
        assertStorageFallbackEnvironmentAbsent(
          emptyStorageEnvironment,
          Object.assign(Object.create(null), { [key]: "" })
        ),
      "inherited storage fallback presence " + key
    );
  }
  const finalStorageContractState = {
    bootstrapBaseline: storageContractOutput.bootstrap,
    contentRoutesBaseline: storageContractOutput.contentRoutes,
    requiredSettingsBaseline: storageContractOutput.requiredSettings,
    storageRootBaseline: storageContractOutput.storageRoot,
    taskTrafficBaseline: storageContractOutput.taskTrafficBaseline,
  };
  assertFinalStorageDatabaseBaseline(
    finalStorageContractState,
    storageContractOutput,
    structuredClone(storageContractOutput)
  );
  const finalStorageTimestampDrift = structuredClone(storageContractOutput);
  finalStorageTimestampDrift.requiredSettings.localDir.updatedAt = "2026-07-16T00:00:00.001Z";
  await expectAsyncFailure(
    async () =>
      assertFinalStorageDatabaseBaseline(
        finalStorageContractState,
        finalStorageTimestampDrift,
        structuredClone(finalStorageTimestampDrift)
      ),
    "final storage required-setting timestamp drift"
  );
  const finalStorageByteDrift = structuredClone(storageContractOutput);
  finalStorageByteDrift.requiredSettings.localDir.value = "./storage/medib";
  await expectAsyncFailure(
    async () =>
      assertFinalStorageDatabaseBaseline(
        finalStorageContractState,
        finalStorageByteDrift,
        structuredClone(finalStorageByteDrift)
      ),
    "final storage required-setting byte drift"
  );
  const preferenceOutputDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-042-preference-a-proof"];
  invariant(
    validateBunBridgeOutput(
      {},
      preferenceOutputDescriptor,
      { userId: "54000000-0000-4000-8000-000000007401" },
      { showFieldMetadata: true }
    ).showFieldMetadata === true,
    "central Bun output validator selection drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        preferenceOutputDescriptor,
        { userId: "54000000-0000-4000-8000-000000007401" },
        { showFieldMetadata: true, unexpected: true }
      ),
    "unknown top-level Bun output field"
  );
  const apiSessionOutputDescriptor =
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/api-session-observation"];
  const apiSessionUserId = "54000000-0000-4000-8000-000000007402";
  const apiSessionUserAgent = "TASK-540/self-test-api-output";
  const apiSessionOutputRow = deepFreezeExact({
    createdAt: "2026-07-16T00:00:00.000Z",
    csrfTokenHash: "b".repeat(64),
    expiresAt: "2026-07-17T00:00:00.000Z",
    id: "54000000-0000-4000-8000-000000007403",
    ip: null,
    revokedAt: null,
    tokenHash: "a".repeat(64),
    userAgent: apiSessionUserAgent,
    userId: apiSessionUserId,
  });
  invariant(
    validateBunBridgeOutput(
      {},
      apiSessionOutputDescriptor,
      { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
      { rows: [apiSessionOutputRow] }
    ).rows.length === 1,
    "central nested Bun output validator drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        apiSessionOutputDescriptor,
        { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
        { rows: [{ ...apiSessionOutputRow, unexpected: true }] }
      ),
    "unknown nested Bun output field"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        apiSessionOutputDescriptor,
        { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
        { rows: [{ ...apiSessionOutputRow, id: [apiSessionOutputRow.id] }] }
      ),
    "array-coerced Bun output UUID"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        apiSessionOutputDescriptor,
        { userAgent: apiSessionUserAgent, userId: apiSessionUserId },
        { rows: [{ ...apiSessionOutputRow, tokenHash: [apiSessionOutputRow.tokenHash] }] }
      ),
    "array-coerced Bun output hash"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput({}, preferenceOutputDescriptor, { userId: [apiSessionUserId] }),
    "array-coerced Bun input UUID"
  );
  const taskTrafficOutputDescriptor =
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["terminal/task-traffic-snapshot"];
  const taskTrafficUserAgents = [
    "TASK-540/self-test-terminal-one",
    "TASK-540/self-test-terminal-two",
    "TASK-540/self-test-terminal-three",
    "TASK-540/self-test-terminal-four",
  ];
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        taskTrafficOutputDescriptor,
        { userAgents: taskTrafficUserAgents },
        {
          access: [
            {
              id: ["54000000-0000-4000-8000-000000007404"],
              sessionId: null,
              userAgent: taskTrafficUserAgents[0],
              userId: null,
            },
          ],
          audit: [],
          completeSession: [],
          session: [],
        }
      ),
    "array-coerced terminal Bun output UUID"
  );
  const completeSessionBoundaryRows = Array.from(
    { length: MAX_COMPLETE_SESSION_ROWS },
    (_value, index) => ({
      id: `54000000-0000-4000-8000-${String(780000 + index).padStart(12, "0")}`,
      userAgent: null,
      userId: "54000000-0000-4000-8000-000000007406",
    })
  );
  invariant(
    validateBunBridgeOutput(
      {},
      taskTrafficOutputDescriptor,
      { userAgents: taskTrafficUserAgents },
      {
        access: [],
        audit: [],
        completeSession: completeSessionBoundaryRows,
        session: [],
      }
    ).completeSession.length === MAX_COMPLETE_SESSION_ROWS,
    "exact-limit complete-session Bun output inventory drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        taskTrafficOutputDescriptor,
        { userAgents: taskTrafficUserAgents },
        {
          access: [],
          audit: [],
          completeSession: [
            ...completeSessionBoundaryRows,
            {
              id: "54000000-0000-4000-8000-000000007405",
              userAgent: null,
              userId: "54000000-0000-4000-8000-000000007406",
            },
          ],
          session: [],
        }
      ),
    "over-limit complete-session Bun output inventory"
  );
  return Object.freeze({ apiSessionUserId });
}
