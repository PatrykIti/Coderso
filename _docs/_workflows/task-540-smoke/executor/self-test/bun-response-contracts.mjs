import { deepFreezeExact, invariant } from "../foundation.mjs";
import { createResourceCore } from "../resource-ledger.mjs";
import { BRIDGE_INPUT_READER } from "../../runtime/bun-child-protocol.mjs";

export async function runBunResponseContractsSelfTest({
  BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
  BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  MEDIA_EXACT_BRIDGE_SOURCES,
  PRIVATE_BUN_OPERATION_DESCRIPTORS,
  PRIVATE_BUN_RESOURCE_DESCRIPTORS,
  STORAGE_PREFLIGHT_BRIDGE_SOURCE,
  USER_PROVISION_BRIDGE_SOURCE,
  apiSessionUserId,
  assertResourceBunDescriptorSetExact,
  bunBridgeDescriptorForOperation,
  contentSchemaFromFields,
  expectAsyncFailure,
  initializeBunBridgeOperationAuthority,
  plan,
  promoteResourceBunDescriptorsAfterLedgerAppend,
  responseLostCandidateFamilyForDescriptor,
  selfTestBunBridgeInputForSchema,
  selfTestExactBunChildInputSource,
  validateBunBridgeInput,
  validateBunBridgeOutput,
  validateResponseLostContentSchema,
}) {
  for (const [blueprintKey, blueprint] of Object.entries(plan.fixtureBlueprint.contentTypes)) {
    validateResponseLostContentSchema(
      contentSchemaFromFields(blueprint.fields),
      "self-test authored content schema " + blueprintKey
    );
  }
  const authoredEditableFields = plan.fixtureBlueprint.contentTypes.editable.fields;
  const authoredMediaField = authoredEditableFields.find(({ type }) => type === "media");
  const authoredRelationField = authoredEditableFields.find(({ type }) => type === "relation");
  invariant(
    authoredMediaField?.media && authoredRelationField?.relation,
    "self-test authored content union fixtures are absent"
  );
  const multipleMediaContentSchema = contentSchemaFromFields([
    {
      ...authoredMediaField,
      media: { ...authoredMediaField.media, multiple: true },
      name: "multipleMediaProof",
    },
  ]);
  const singleRelationContentSchema = contentSchemaFromFields([
    {
      ...authoredRelationField,
      name: "singleRelationProof",
      relation: { ...authoredRelationField.relation, multiple: false },
    },
  ]);
  validateResponseLostContentSchema(
    multipleMediaContentSchema,
    "self-test authored multiple-media content schema"
  );
  validateResponseLostContentSchema(
    singleRelationContentSchema,
    "self-test authored single-relation content schema"
  );
  const responseLostPreferredInputSchemaByFamily = {
    contentType: "slug-input-v1",
    entry: "entry-discovery-input-v1",
    media: "media-natural-input-v1",
    override: "override-discovery-input-v1",
    screen: "screen-discovery-input-v1",
    setting: "user-id-input-v1",
    user: "email-input-v1",
  };
  const responseLostCandidateDescriptorByFamily = Object.fromEntries(
    Object.keys(responseLostPreferredInputSchemaByFamily).map((family) => {
      const descriptor = Object.values(BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS).find(
        (candidateDescriptor) =>
          responseLostCandidateFamilyForDescriptor(candidateDescriptor) === family &&
          candidateDescriptor.inputSchemaId === responseLostPreferredInputSchemaByFamily[family]
      );
      invariant(descriptor !== undefined, family + " response-lost self-test descriptor is absent");
      return [family, descriptor];
    })
  );
  const responseLostCandidateInputByFamily = Object.fromEntries(
    Object.entries(responseLostCandidateDescriptorByFamily).map(([family, descriptor]) => [
      family,
      selfTestBunBridgeInputForSchema(descriptor.inputSchemaId),
    ])
  );
  const candidateUuid = (ordinal) =>
    `54000000-0000-4000-8000-${String(7700 + ordinal).padStart(12, "0")}`;
  const mediaCandidateKey = `2026/07/${candidateUuid(8)}.png`;
  const responseLostValidCandidateByFamily = {
    user: {
      adminRoleTupleCount: 1,
      adminWildcardPermissionCount: 1,
      id: candidateUuid(1),
      name: "Task 540 User",
      normalizedEmailMatches: true,
      passwordHashPresent: true,
      status: "active",
    },
    contentType: {
      config: {},
      id: candidateUuid(2),
      name: "Task 540 Type",
      schema: { additionalProperties: false, properties: {}, type: "object" },
      slug: responseLostCandidateInputByFamily.contentType.slug,
      status: "draft",
    },
    entry: {
      accessPasswordAbsent: true,
      authorId: null,
      data: {},
      id: candidateUuid(3),
      publishedAt: null,
      scheduledAt: null,
      slug: responseLostCandidateInputByFamily.entry.slug,
      status: "draft",
      tags: [],
      title: "Task 540 Entry",
      typeId: responseLostCandidateInputByFamily.entry.typeId,
      visibility: "public",
    },
    screen: {
      collectionRole: null,
      compositionKey: null,
      contentTypeId: responseLostCandidateInputByFamily.screen.contentTypeId,
      definition: { editorView: {}, listView: {}, schemaVersion: 4 },
      id: candidateUuid(4),
      name: responseLostCandidateInputByFamily.screen.name,
      schemaVersion: 4,
      showInSidebar: true,
      sidebarLabel: null,
      status: "active",
    },
    media: {
      alt: null,
      caption: null,
      createdBy: null,
      credit: null,
      description: null,
      focalX: null,
      focalY: null,
      folderId: null,
      height: null,
      id: candidateUuid(8),
      key: mediaCandidateKey,
      mimeType: responseLostCandidateInputByFamily.media.mimeType,
      originalName: responseLostCandidateInputByFamily.media.originalName,
      size: responseLostCandidateInputByFamily.media.size,
      tags: [],
      title: null,
      type: "image",
      url: "/media/" + mediaCandidateKey,
      width: null,
    },
    override: {
      blockId: responseLostCandidateInputByFamily.override.blockId,
      entryId: responseLostCandidateInputByFamily.override.entryId,
      propPath: responseLostCandidateInputByFamily.override.propPath,
      screenId: responseLostCandidateInputByFamily.override.screenId,
      updatedBy: null,
      value: candidateUuid(9),
    },
    setting: {
      key: "customScreens.entry.preferences",
      userId: responseLostCandidateInputByFamily.setting.userId,
      value: { showFieldMetadata: false, version: 1 },
    },
  };
  for (const family of Object.keys(responseLostValidCandidateByFamily)) {
    const candidate = responseLostValidCandidateByFamily[family];
    invariant(
      validateBunBridgeOutput(
        {},
        responseLostCandidateDescriptorByFamily[family],
        responseLostCandidateInputByFamily[family],
        { candidates: [candidate], overflow: false }
      ).candidates[0] === candidate,
      family + " response-lost candidate positive contract drift"
    );
  }
  const responseLostCandidateNegativeByFamily = {
    user: {
      ...responseLostValidCandidateByFamily.user,
      adminRoleTupleCount: [1],
    },
    contentType: {
      ...responseLostValidCandidateByFamily.contentType,
      config: { permissions: { admin: { read: "true" } } },
    },
    entry: {
      ...responseLostValidCandidateByFamily.entry,
      ["access" + "Password"]: "forbidden-self-test-value",
    },
    screen: {
      ...responseLostValidCandidateByFamily.screen,
      definition: {
        ...responseLostValidCandidateByFamily.screen.definition,
        schemaVersion: 3,
      },
    },
    media: {
      ...responseLostValidCandidateByFamily.media,
      tags: ["hero", 1],
    },
    override: {
      ...responseLostValidCandidateByFamily.override,
      value: [candidateUuid(9)],
    },
    setting: {
      ...responseLostValidCandidateByFamily.setting,
      value: {
        ...responseLostValidCandidateByFamily.setting.value,
        unexpected: true,
      },
    },
  };
  for (const family of Object.keys(responseLostCandidateNegativeByFamily)) {
    await expectAsyncFailure(
      async () =>
        validateBunBridgeOutput(
          {},
          responseLostCandidateDescriptorByFamily[family],
          responseLostCandidateInputByFamily[family],
          {
            candidates: [responseLostCandidateNegativeByFamily[family]],
            overflow: false,
          }
        ),
      family + " malformed response-lost candidate"
    );
  }
  await expectAsyncFailure(
    async () =>
      validateBunBridgeOutput(
        {},
        responseLostCandidateDescriptorByFamily.contentType,
        responseLostCandidateInputByFamily.contentType,
        {
          candidates: [
            {
              ...responseLostValidCandidateByFamily.contentType,
              schema: {
                additionalProperties: false,
                properties: {
                  impossibleTextArray: {
                    title: "Impossible text array",
                    type: "array",
                    xFieldConfig: { order: 0 },
                    xFieldType: "text",
                  },
                },
                type: "object",
              },
            },
          ],
          overflow: false,
        }
      ),
    "internally inconsistent content-type candidate schema"
  );
  const contentSchemaWithSingleProperty = (name, property) => ({
    additionalProperties: false,
    properties: { [name]: property },
    type: "object",
  });
  const multipleMediaProperty = multipleMediaContentSchema.properties.multipleMediaProof;
  const { items: ignoredMediaItems, ...multipleMediaWithoutItems } = multipleMediaProperty;
  void ignoredMediaItems;
  const singleRelationProperty = singleRelationContentSchema.properties.singleRelationProof;
  const twoTextContentSchema = contentSchemaFromFields(
    authoredEditableFields.filter(({ type }) => type === "text").slice(0, 2)
  );
  const twoTextNames = Object.keys(twoTextContentSchema.properties);
  invariant(twoTextNames.length === 2, "self-test text order fixture drift");
  const duplicateOrderContentSchema = {
    ...twoTextContentSchema,
    properties: {
      ...twoTextContentSchema.properties,
      [twoTextNames[1]]: {
        ...twoTextContentSchema.properties[twoTextNames[1]],
        xFieldConfig: {
          ...twoTextContentSchema.properties[twoTextNames[1]].xFieldConfig,
          order: 0,
        },
      },
    },
  };
  const contentSchemaInvariantNegatives = [
    [
      "foreign media branch key",
      contentSchemaWithSingleProperty("multipleMediaProof", {
        ...multipleMediaProperty,
        xRelationTarget: "forbidden-target",
      }),
    ],
    [
      "multiple media missing items",
      contentSchemaWithSingleProperty("multipleMediaProof", multipleMediaWithoutItems),
    ],
    [
      "single relation with array type",
      contentSchemaWithSingleProperty("singleRelationProof", {
        ...singleRelationProperty,
        items: { type: "string" },
        type: "array",
      }),
    ],
    [
      "relation target mismatch",
      contentSchemaWithSingleProperty("singleRelationProof", {
        ...singleRelationProperty,
        xRelationTarget: singleRelationProperty.xRelationTarget + "-drift",
      }),
    ],
    ["duplicate field order", duplicateOrderContentSchema],
  ];
  for (const [label, schema] of contentSchemaInvariantNegatives) {
    await expectAsyncFailure(
      async () =>
        validateBunBridgeOutput(
          {},
          responseLostCandidateDescriptorByFamily.contentType,
          responseLostCandidateInputByFamily.contentType,
          {
            candidates: [
              {
                ...responseLostValidCandidateByFamily.contentType,
                schema,
              },
            ],
            overflow: false,
          }
        ),
      "content-type schema " + label
    );
  }
  invariant(
    BRIDGE_INPUT_READER.includes("validateJsonBounds(input);") &&
      BRIDGE_INPUT_READER.includes("nodes > 100000 || current.depth > 64") &&
      BRIDGE_INPUT_READER.includes("value.length > 10000"),
    "Bun child recursive JSON input bound source drift"
  );
  const screenMaterializeInput = selfTestBunBridgeInputForSchema("screen-materialize-input-v1");
  const screenMaterializeDescriptor =
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-035-screen-create"];
  let overDepthScreenSchema = {};
  for (let depth = 0; depth < 65; depth += 1) {
    overDepthScreenSchema = { nested: overDepthScreenSchema };
  }
  const bootstrapRestoreInput = selfTestBunBridgeInputForSchema("bootstrap-restore-input-v1");
  const bunInputParityNegativeCases = [
    [
      "Screen content schema object root",
      "screen-materialize-input-v1",
      screenMaterializeDescriptor,
      {
        ...screenMaterializeInput,
        contentType: { ...screenMaterializeInput.contentType, schema: "not-an-object" },
      },
    ],
    [
      "Screen editor object root",
      "screen-materialize-input-v1",
      screenMaterializeDescriptor,
      {
        ...screenMaterializeInput,
        definitionWithoutListView: {
          ...screenMaterializeInput.definitionWithoutListView,
          editorView: [],
        },
      },
    ],
    [
      "Screen recursive JSON depth",
      "screen-materialize-input-v1",
      screenMaterializeDescriptor,
      {
        ...screenMaterializeInput,
        contentType: {
          ...screenMaterializeInput.contentType,
          schema: overDepthScreenSchema,
        },
      },
    ],
    [
      "bootstrap role-permission array",
      "bootstrap-restore-input-v1",
      BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/bootstrap-cas-restore"],
      {
        ...bootstrapRestoreInput,
        baseline: {
          ...bootstrapRestoreInput.baseline,
          roleTuples: bootstrapRestoreInput.baseline.roleTuples.map((role) => ({
            ...role,
            rolePermissions: "*",
          })),
        },
      },
    ],
  ];
  for (const [label, schemaId, descriptor, malformedInput] of bunInputParityNegativeCases) {
    await expectAsyncFailure(
      async () => validateBunBridgeInput({}, descriptor, malformedInput),
      "Node " + label + " alignment"
    );
    await expectAsyncFailure(
      async () => selfTestExactBunChildInputSource(schemaId, malformedInput),
      "child " + label + " alignment"
    );
  }
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput(
        {},
        BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS["runtime/set-041-preference-a"],
        { showFieldMetadata: "true", userId: apiSessionUserId }
      ),
    "wrong Bun input scalar"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput(
        {},
        BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["terminal/task-traffic-snapshot"],
        { userAgents: ["TASK-540/one", "TASK-540/two", "TASK-540/three"] }
      ),
    "wrong Bun input tuple bound"
  );
  const resourceOwnerInput = {
    entryIds: [
      "54000000-0000-4000-8000-000000007410",
      "54000000-0000-4000-8000-000000007411",
      "54000000-0000-4000-8000-000000007412",
      "54000000-0000-4000-8000-000000007413",
      "54000000-0000-4000-8000-000000007414",
      "54000000-0000-4000-8000-000000007415",
    ],
    mediaId: "54000000-0000-4000-8000-000000007416",
    override: {
      blockId: "task-540-block",
      entryId: "54000000-0000-4000-8000-000000007410",
      propPath: "mediaAssetId",
      screenId: "54000000-0000-4000-8000-000000007417",
    },
    overrideExpectedPresent: true,
  };
  invariant(
    validateBunBridgeInput(
      {},
      BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/current-owner-exact"],
      resourceOwnerInput
    ) === resourceOwnerInput,
    "nested Bun input validator drift"
  );
  await expectAsyncFailure(
    async () =>
      validateBunBridgeInput(
        {},
        BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS["resource/current-owner-exact"],
        { ...resourceOwnerInput, override: { ...resourceOwnerInput.override, unexpected: true } }
      ),
    "unknown nested Bun input field"
  );
  const descriptorSelectionState = {};
  initializeBunBridgeOperationAuthority(descriptorSelectionState);
  invariant(
    bunBridgeDescriptorForOperation(descriptorSelectionState, "runtime/set-001-storage-preflight")
      .source === STORAGE_PREFLIGHT_BRIDGE_SOURCE &&
      bunBridgeDescriptorForOperation(descriptorSelectionState, "runtime/set-012-user-a-create")
        .source === USER_PROVISION_BRIDGE_SOURCE,
    "Bun operation payload selection drift"
  );
  await expectAsyncFailure(
    async () => bunBridgeDescriptorForOperation(descriptorSelectionState, "runtime/not-registered"),
    "unregistered Bun operation payload selection"
  );
  const removedPrivateStaticDescriptor = PRIVATE_BUN_OPERATION_DESCRIPTORS.get(
    descriptorSelectionState
  ).get("runtime/set-001-storage-preflight");
  PRIVATE_BUN_OPERATION_DESCRIPTORS.get(descriptorSelectionState).delete(
    "runtime/set-001-storage-preflight"
  );
  await expectAsyncFailure(
    async () =>
      bunBridgeDescriptorForOperation(
        descriptorSelectionState,
        "runtime/set-001-storage-preflight"
      ),
    "missing private static Bun operation descriptor"
  );
  PRIVATE_BUN_OPERATION_DESCRIPTORS.get(descriptorSelectionState).set(
    "runtime/set-001-storage-preflight",
    removedPrivateStaticDescriptor
  );
  await expectAsyncFailure(
    async () => bunBridgeDescriptorForOperation({}, "runtime/set-001-storage-preflight"),
    "missing private Bun operation registry"
  );
  const resourceDescriptorState = {};
  initializeBunBridgeOperationAuthority(resourceDescriptorState);
  const descriptorProbeCore = createResourceCore({
    kind: "media-row-key",
    identifier: ["54000000-0000-4000-8000-000000007777", "task-540/descriptor-probe.png"],
    ownerSubjectIdentifier: null,
    acquisitionSourceId: "descriptor-probe",
    sourceActionOrdinal: 1,
    acquisitionChannel: "admin-api",
  });
  const descriptorProbeDelta = deepFreezeExact({
    cores: [descriptorProbeCore],
    dependencyEdges: [],
  });
  promoteResourceBunDescriptorsAfterLedgerAppend(resourceDescriptorState, descriptorProbeDelta);
  assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]);
  const probeRegistry = PRIVATE_BUN_RESOURCE_DESCRIPTORS.get(resourceDescriptorState);
  invariant(
    probeRegistry.get(descriptorProbeCore.provenanceOpId).source ===
      MEDIA_EXACT_BRIDGE_SOURCES.provenance &&
      probeRegistry.get(descriptorProbeCore.cleanupOpId).source ===
        MEDIA_EXACT_BRIDGE_SOURCES.delete &&
      probeRegistry.get(descriptorProbeCore.absenceOpId).source ===
        MEDIA_EXACT_BRIDGE_SOURCES.absence &&
      new Set([
        probeRegistry.get(descriptorProbeCore.provenanceOpId).sourceSha256,
        probeRegistry.get(descriptorProbeCore.cleanupOpId).sourceSha256,
        probeRegistry.get(descriptorProbeCore.absenceOpId).sourceSha256,
      ]).size === 3,
    "resource Bun P/C/A payload identity drift"
  );
  const removedProbeDescriptor = probeRegistry.get(descriptorProbeCore.absenceOpId);
  probeRegistry.delete(descriptorProbeCore.absenceOpId);
  await expectAsyncFailure(
    async () => assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]),
    "missing resource Bun descriptor"
  );
  probeRegistry.set(descriptorProbeCore.absenceOpId, removedProbeDescriptor);
  probeRegistry.set("resource/extra", removedProbeDescriptor);
  await expectAsyncFailure(
    async () => assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]),
    "extra resource Bun descriptor"
  );
  probeRegistry.delete("resource/extra");
  const cleanupDescriptor = probeRegistry.get(descriptorProbeCore.cleanupOpId);
  const absenceDescriptor = probeRegistry.get(descriptorProbeCore.absenceOpId);
  probeRegistry.set(descriptorProbeCore.cleanupOpId, absenceDescriptor);
  probeRegistry.set(descriptorProbeCore.absenceOpId, cleanupDescriptor);
  await expectAsyncFailure(
    async () => assertResourceBunDescriptorSetExact(resourceDescriptorState, [descriptorProbeCore]),
    "reversed resource Bun cleanup/absence descriptors"
  );
}
