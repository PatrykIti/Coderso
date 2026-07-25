import { deepFreezeExact, invariant } from "../foundation.mjs";
import {
  TASK_FIXTURE_ENTRY_SEMANTICS,
  seoDocumentResourceSemantic,
} from "../config.mjs";
import {
  RESOURCE_KIND_CONTRACTS,
  deepEqualJson,
} from "../resource-contracts.mjs";
import {
  ResourceCleanupPlanner,
  ResourceLedgerBuilder,
  actionOrdinal,
  createResourceCore,
} from "../resource-ledger.mjs";

export async function runSeoEntryCleanupSelfTest({
  BUN_BRIDGE_OPERATION_DESCRIPTORS,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  assertSeoEntryDocumentExactBridgeSourcesFailClosed,
  cleanupPlanView,
  discoverExactSeoEntryResources,
  executeCleanupPlanStage,
  expectAsyncFailure,
  initializeBunBridgeOperationAuthority,
  plan,
  validateBunBridgeInput,
}) {
  const exactSeoEntryPredicate =
    "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));";
  const seoPcaPredicateMutants = [
    [
      "SEO provenance predicate without exact document ID",
      "provenance",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance.replace(
        exactSeoEntryPredicate,
        "const predicate = and(eq(seoDocuments.targetType,targetType),eq(seoDocuments.targetId,targetId));"
      ),
    ],
    [
      "SEO cleanup predicate without exact target type",
      "delete",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete.replace(
        exactSeoEntryPredicate,
        "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetId,targetId));"
      ),
    ],
    [
      "SEO absence predicate without exact target ID",
      "absence",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence.replace(
        exactSeoEntryPredicate,
        "const predicate = and(eq(seoDocuments.id,id),eq(seoDocuments.targetType,targetType));"
      ),
    ],
    [
      "SEO provenance before-read bypasses exact predicate",
      "provenance",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance.replace(
        ".from(seoDocuments).where(predicate).limit(2);",
        ".from(seoDocuments).where(eq(seoDocuments.id,id)).limit(2);"
      ),
    ],
    [
      "SEO cleanup delete bypasses exact predicate",
      "delete",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete.replace(
        "db.delete(seoDocuments).where(predicate).returning",
        "db.delete(seoDocuments).where(eq(seoDocuments.id,id)).returning"
      ),
    ],
    [
      "SEO absence after-read bypasses exact predicate",
      "absence",
      SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence.replace(
        "const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(predicate).limit(2);",
        "const after = await db.select({ id:seoDocuments.id,targetId:seoDocuments.targetId,targetType:seoDocuments.targetType }).from(seoDocuments).where(eq(seoDocuments.id,id)).limit(2);"
      ),
    ],
  ];
  for (const [label, operation, mutantSource] of seoPcaPredicateMutants) {
    invariant(
      mutantSource !== SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES[operation],
      label + " mutant anchor drift"
    );
    const mutantSources = deepFreezeExact({
      ...SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
      [operation]: mutantSource,
    });
    await expectAsyncFailure(
      async () => assertSeoEntryDocumentExactBridgeSourcesFailClosed(mutantSources),
      label
    );
  }

  const seoEntryOriginBySemantic = deepFreezeExact({
    "editable-entry": "set-033-entry-create",
    "related-entry-a1": "set-022-related-a1-create",
    "related-entry-a2": "set-024-related-a2-create",
    "related-entry-b1": "set-026-related-b1-create",
    "related-entry-b2": "set-028-related-b2-create",
    "related-entry-failure1": "set-029a-related-failure1-create",
  });
  const makeSeoDiscoveryHarness = () => {
    const targetIds = TASK_FIXTURE_ENTRY_SEMANTICS.map(
      (_entrySemantic, index) => `54000000-0000-4000-8000-${String(7601 + index).padStart(12, "0")}`
    );
    const entryCores = TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => {
      const origin = seoEntryOriginBySemantic[entrySemantic];
      return createResourceCore({
        kind: entrySemantic === "editable-entry" ? "entry-editable" : "entry-related",
        identifier: [targetIds[index]],
        ownerSubjectIdentifier: null,
        acquisitionSourceId: origin,
        sourceActionOrdinal: actionOrdinal(plan, origin),
        acquisitionChannel: "admin-api",
      });
    });
    const ledger = new ResourceLedgerBuilder();
    ledger.appendValidatedDelta(
      deepFreezeExact({ cores: deepFreezeExact(entryCores), dependencyEdges: deepFreezeExact([]) })
    );
    const state = {
      fixtureIds: new Map(
        TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => [
          entrySemantic,
          targetIds[index],
        ])
      ),
      resourceKeys: new Map(
        TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => [
          entrySemantic,
          entryCores[index].resourceKey,
        ])
      ),
    };
    initializeBunBridgeOperationAuthority(state);
    return { entryCores, ledger, state, targetIds };
  };
  const seoHarness = makeSeoDiscoveryHarness();
  const seoCandidates = deepFreezeExact(
    seoHarness.targetIds
      .map((targetId, index) => ({
        id: `54000000-0000-4000-8000-${String(7611 + index).padStart(12, "0")}`,
        targetId,
        targetType: "entry",
      }))
      .sort(
        (left, right) =>
          left.targetId.localeCompare(right.targetId) || left.id.localeCompare(right.id)
      )
  );
  const seoPoll = deepFreezeExact({ candidates: seoCandidates });
  const nominalQueryTargets = [];
  const discoveredSeo = await discoverExactSeoEntryResources(
    seoHarness.state,
    seoHarness.ledger,
    async (targetIds) => {
      nominalQueryTargets.push([...targetIds]);
      return seoPoll;
    },
    async () => {}
  );
  const seoRecords = seoHarness.ledger.compileResourceRecords("persistent");
  const seoDocumentRecords = seoRecords.filter(({ kind }) => kind === "seo-document-entry");
  const seoEntryRecords = seoRecords.filter(({ kind }) =>
    ["entry-editable", "entry-related"].includes(kind)
  );
  const seoRecordByTargetId = new Map(
    seoDocumentRecords.map((record) => [record.identifier[2], record])
  );
  const seoEntryRecordByTargetId = new Map(
    seoEntryRecords.map((record) => [record.identifier[0], record])
  );
  const seoPlan = new ResourceCleanupPlanner().freezePersistent(seoRecords, []);
  invariant(
    discoveredSeo.length === 6 &&
      seoDocumentRecords.length === 6 &&
      seoEntryRecords.length === 6 &&
      nominalQueryTargets.length === 2 &&
      nominalQueryTargets.every((targetIds) => deepEqualJson(targetIds, seoHarness.targetIds)) &&
      new Set(discoveredSeo.map(({ resourceKey }) => resourceKey)).size === 6 &&
      seoHarness.targetIds.every((targetId) =>
        seoEntryRecordByTargetId
          .get(targetId)
          .dependsOn.includes(seoRecordByTargetId.get(targetId).resourceKey)
      ) &&
      deepEqualJson(
        seoPlan.resourceKeys.slice(0, 6),
        seoDocumentRecords.map(({ resourceKey }) => resourceKey)
      ) &&
      TASK_FIXTURE_ENTRY_SEMANTICS.every(
        (entrySemantic) =>
          seoHarness.state.resourceKeys.get(seoDocumentResourceSemantic(entrySemantic)) ===
          seoRecordByTargetId.get(seoHarness.state.fixtureIds.get(entrySemantic)).resourceKey
      ) &&
      RESOURCE_KIND_CONTRACTS["seo-document-entry"].cleanupPhase.success === 3 &&
      RESOURCE_KIND_CONTRACTS["seo-document-entry"].cleanupPhase.failure === 3,
    "SEO entry cleanup discovery/dependency order drift"
  );
  const seoStageState = { cleanupAbsenceKeys: new Set(), cleanupFailedKeys: new Set() };
  const seoStageCalls = [];
  const seoStageResult = await executeCleanupPlanStage(
    seoStageState,
    seoPlan,
    cleanupPlanView(seoRecords),
    new Set(["seo-document-entry", "entry-editable", "entry-related"]),
    3,
    async (_state, record, operationKind) => {
      seoStageCalls.push(record.resourceKey + ":" + operationKind);
      return deepFreezeExact({ operationKind, resourceKey: record.resourceKey });
    }
  );
  invariant(
    seoStageResult.failures.length === 0 &&
      seoDocumentRecords.every((seoRecord) => {
        const parentRecord = seoEntryRecordByTargetId.get(seoRecord.identifier[2]);
        const childAbsenceIndex = seoStageCalls.indexOf(seoRecord.resourceKey + ":absence");
        const parentProvenanceIndex = seoStageCalls.indexOf(
          parentRecord.resourceKey + ":provenance"
        );
        return (
          seoStageCalls.filter((call) => call === seoRecord.resourceKey + ":delete").length === 1 &&
          childAbsenceIndex >= 0 &&
          childAbsenceIndex < parentProvenanceIndex
        );
      }),
    "SEO children were not deleted/proved absent before their exact entry parents"
  );

  const emptySeoHarness = makeSeoDiscoveryHarness();
  const emptySeoResources = await discoverExactSeoEntryResources(
    emptySeoHarness.state,
    emptySeoHarness.ledger,
    async () => deepFreezeExact({ candidates: deepFreezeExact([]) }),
    async () => {}
  );
  invariant(
    emptySeoResources.length === 0 &&
      TASK_FIXTURE_ENTRY_SEMANTICS.every(
        (entrySemantic) =>
          !emptySeoHarness.state.resourceKeys.has(seoDocumentResourceSemantic(entrySemantic))
      ),
    "empty stable SEO discovery acquired a resource"
  );

  const missingSeoHarness = makeSeoDiscoveryHarness();
  const missingSeoCandidates = deepFreezeExact(seoCandidates.slice(0, 5));
  const missingSeoResources = await discoverExactSeoEntryResources(
    missingSeoHarness.state,
    missingSeoHarness.ledger,
    async (targetIds) => {
      invariant(
        deepEqualJson(targetIds, missingSeoHarness.targetIds),
        "missing SEO row narrowed the exact target inventory"
      );
      return deepFreezeExact({ candidates: missingSeoCandidates });
    },
    async () => {}
  );
  const missingTargetId = seoCandidates[5].targetId;
  const missingTargetSemantic = TASK_FIXTURE_ENTRY_SEMANTICS.find(
    (entrySemantic) => missingSeoHarness.state.fixtureIds.get(entrySemantic) === missingTargetId
  );
  invariant(
    missingSeoResources.length === 5 &&
      missingSeoHarness.ledger
        .compileResourceRecords("persistent")
        .filter(({ kind }) => kind === "seo-document-entry").length === 5 &&
      !missingSeoHarness.state.resourceKeys.has(seoDocumentResourceSemantic(missingTargetSemantic)),
    "missing exact SEO row did not preserve bounded authorized absence"
  );

  const seoDiscoveryDescriptor = BUN_BRIDGE_OPERATION_DESCRIPTORS["resource/seo-entry-discovery"];
  for (const [label, targetIds] of [
    ["missing SEO discovery input target", seoHarness.targetIds.slice(0, 5)],
    [
      "extra SEO discovery input target",
      [...seoHarness.targetIds, "54000000-0000-4000-8000-000000007699"],
    ],
    [
      "duplicate SEO discovery input target",
      [...seoHarness.targetIds.slice(0, 5), seoHarness.targetIds[0]],
    ],
  ]) {
    await expectAsyncFailure(
      async () =>
        validateBunBridgeInput(
          {},
          seoDiscoveryDescriptor,
          deepFreezeExact({ targetIds: deepFreezeExact(targetIds) })
        ),
      label
    );
  }

  const extraSeoCandidate = deepFreezeExact({
    id: "54000000-0000-4000-8000-000000007699",
    targetId: seoHarness.targetIds[0],
    targetType: "entry",
  });
  for (const [label, polls] of [
    [
      "extra SEO entry discovery",
      [deepFreezeExact({ candidates: deepFreezeExact([...seoCandidates, extraSeoCandidate]) })],
    ],
    [
      "unstable SEO entry discovery",
      [deepFreezeExact({ candidates: missingSeoCandidates }), seoPoll],
    ],
    [
      "foreign-target SEO entry discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([
            deepFreezeExact({
              ...seoCandidates[0],
              targetId: "54000000-0000-4000-8000-000000007698",
            }),
          ]),
        }),
      ],
    ],
    [
      "foreign targetType SEO entry discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([
            deepFreezeExact({ ...seoCandidates[0], targetType: "page" }),
          ]),
        }),
      ],
    ],
    [
      "duplicate SEO target discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([seoCandidates[0], extraSeoCandidate]),
        }),
      ],
    ],
    [
      "duplicate SEO document discovery",
      [
        deepFreezeExact({
          candidates: deepFreezeExact([
            seoCandidates[0],
            deepFreezeExact({ ...seoCandidates[1], id: seoCandidates[0].id }),
          ]),
        }),
      ],
    ],
    [
      "nondeterministic SEO discovery ordering",
      [deepFreezeExact({ candidates: deepFreezeExact([...seoCandidates].reverse()) })],
    ],
  ]) {
    const harness = makeSeoDiscoveryHarness();
    let pollIndex = 0;
    await expectAsyncFailure(
      async () =>
        discoverExactSeoEntryResources(
          harness.state,
          harness.ledger,
          async () => polls[Math.min(pollIndex++, polls.length - 1)],
          async () => {}
        ),
      label
    );
  }

  return Object.freeze({ explicitNegativeCases: 21 });
}
