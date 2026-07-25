import { PROVEN_RESOURCE_ACTIONS } from "../action-resources.mjs";
import { TASK_FIXTURE_ENTRY_SEMANTICS } from "../config.mjs";
import { canonicalJson, deepFreezeExact, hashBytes, invariant } from "../foundation.mjs";
import { assertOrderedManifestCallsExact } from "../json-schema.mjs";
import {
  CLEANUP_OPERATION_KINDS,
  TERMINAL_RESOURCE_KINDS,
  deepEqualJson,
} from "../resource-contracts.mjs";

export async function runNominalEvidenceSelfTest({
  adminApiRequest,
  API_SESSION_OBSERVATION_BRIDGE_SOURCE,
  assertCanonicalFinalization,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  buildFakeCapabilities,
  BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
  captureAllResponseLostNaturalBaselinesBeforeFirstWrite,
  disposeOwnedApiRequestContextAndProveAbsent,
  executeSmokePlanCore,
  expectAsyncFailure,
  fixtureCaptureValue,
  parseMediaRaceAuthoritativeAdminEvidence,
  plan,
  readPublicApiExactlyOnce,
  RESPONSE_LOST_CREATE_ACTION_IDS,
  RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
  sourceCaptures,
  USER_PROVISION_BRIDGE_SOURCE,
  validateBoundedNaturalCandidateResult,
}) {
  const successCapabilities = buildFakeCapabilities();
  const evidence = await executeSmokePlanCore(plan, successCapabilities);
  invariant(evidence.pass === true, "fake success evidence failed");
  const expectedManifestCallIds = plan.actionManifest.map(({ id }) => id);
  const observedManifestCallIds = successCapabilities.calls.slice(0, 496);
  invariant(
    assertOrderedManifestCallsExact(observedManifestCallIds, expectedManifestCallIds) === true,
    "one exact ordered action call per manifest row drift"
  );
  for (const [label, mutate] of [
    ["manifest call omission", (calls) => calls.splice(124, 1)],
    ["manifest call duplicate", (calls) => calls.splice(124, 0, calls[124])],
    [
      "manifest call reorder",
      (calls) => {
        [calls[124], calls[125]] = [calls[125], calls[124]];
      },
    ],
  ]) {
    await expectAsyncFailure(async () => {
      const calls = [...observedManifestCallIds];
      mutate(calls);
      assertOrderedManifestCallsExact(calls, expectedManifestCallIds);
    }, label);
  }
  invariant(
    deepEqualJson(
      successCapabilities.calls.slice(496, -1),
      successCapabilities.lastFinalPlan.actionTuples.map(
        ([resourceKey, operationKind]) => operationKind + ":" + resourceKey
      )
    ) && successCapabilities.calls.at(-1) === "finalize",
    "fake cleanup execution trace/order drift"
  );
  invariant(
    plan.requiredFixtureSubjectKeys.length * CLEANUP_OPERATION_KINDS.length === 45,
    "contract fixture cleanup cardinality drift"
  );
  invariant(
    evidence.cleanupReceipts.length === 72 &&
      evidence.cleanupReceipts.length ===
        evidence.resources.filter(
          ({ class: className, kind }) =>
            className === "delete" && !TERMINAL_RESOURCE_KINDS.has(kind)
        ).length *
          3,
    "ledger-derived persistent cleanup cardinality drift"
  );
  const lifecycleSeoRecords = successCapabilities.lastFinalPlan.ledger.filter(
    ({ kind }) => kind === "seo-document-entry"
  );
  const lifecycleSeoTargetIds = TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic) =>
    fixtureCaptureValue(plan.fixtureSubjectCapture[entrySemantic], plan)
  ).sort();
  invariant(
    lifecycleSeoRecords.length === 6 &&
      deepEqualJson(
        lifecycleSeoRecords.map(({ identifier }) => identifier[2]).sort(),
        lifecycleSeoTargetIds
      ) &&
      evidence.resources.filter(({ kind }) => kind === "seo-document-entry").length === 6 &&
      evidence.cleanupReceipts.filter(({ subjectKind }) => subjectKind === "seo-document-entry")
        .length === 18,
    "full cleanup lifecycle did not cover all six exact SEO entry documents"
  );
  invariant(
    deepEqualJson(
      evidence.captureProjection.map(({ name }) => name),
      [...plan.requiredCaptureNames, ...plan.requiredRuntimeBlockCaptures]
    ) &&
      evidence.captureProjection.every(
        (row) =>
          deepEqualJson(Object.keys(row), ["name", "value"]) &&
          typeof row.name === "string" &&
          row.name.length > 0 &&
          typeof row.value === "string" &&
          row.value.length > 0
      ),
    "fake captures incomplete"
  );
  invariant(
    !canonicalJson(evidence).includes("private fake failure detail"),
    "private value leaked"
  );
  const nestedUnknownFinalization = structuredClone(successCapabilities.lastFinalization);
  nestedUnknownFinalization.host.children[0].unexpected = true;
  deepFreezeExact(nestedUnknownFinalization);
  await expectAsyncFailure(
    async () => assertCanonicalFinalization(nestedUnknownFinalization, plan),
    "nested finalization unknown property"
  );
  const rawMediaIds = {
    screen: fixtureCaptureValue("screen.id", plan),
    retryScreen: fixtureCaptureValue("retry-screen.id", plan),
    entry: fixtureCaptureValue("entry.id", plan),
    media: fixtureCaptureValue("media.id", plan),
  };
  const rawMediaKey = "2026/07/54000000-0000-4000-8000-000000000777.png";
  const rawMediaValues = [
    {
      id: rawMediaIds.screen,
      definition: {
        editorView: {
          document: {
            sections: [
              {
                blocks: [
                  { id: plan.fixtureBlueprint.screen.blockIds.raceImage, type: "image", slots: {} },
                ],
              },
            ],
          },
          bindings: [
            {
              blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
              propPath: "src",
              source: "entry",
              mode: "read",
              field: "raceImageId",
            },
          ],
        },
      },
    },
    {
      id: rawMediaIds.entry,
      data: { raceImageId: plan.fixtureBlueprint.media.missingBoundMediaId },
    },
    { id: rawMediaIds.media, key: rawMediaKey, url: "/media/" + rawMediaKey },
    {
      overrides: [
        {
          screenId: rawMediaIds.screen,
          entryId: rawMediaIds.entry,
          blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
          propPath: "mediaAssetId",
          value: rawMediaIds.media,
        },
      ],
    },
    { overrides: [] },
  ];
  const makeRawMediaState = (values = rawMediaValues) => ({
    plan,
    currentCaptures: sourceCaptures,
    mediaRecord: { id: rawMediaIds.media },
    mediaCanonicalSafeUrl: "/media/" + rawMediaKey,
    mediaRaceAdminEvidence: {
      screen: Buffer.from(JSON.stringify(values[0])),
      entry: Buffer.from(JSON.stringify(values[1])),
      media: Buffer.from(JSON.stringify(values[2])),
      override: Buffer.from(JSON.stringify(values[3])),
      retryOverride: Buffer.from(JSON.stringify(values[4])),
    },
  });
  const rawMediaState = makeRawMediaState();
  const rawMediaProof = parseMediaRaceAuthoritativeAdminEvidence(rawMediaState);
  const rawMediaFrames = [];
  for (const bytes of Object.values(rawMediaState.mediaRaceAdminEvidence)) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    rawMediaFrames.push(length, bytes);
  }
  invariant(
    rawMediaProof.evidenceSha256 === hashBytes(Buffer.concat(rawMediaFrames)) &&
      rawMediaProof.evidenceSha256 !==
        hashBytes(Buffer.from(canonicalJson(rawMediaProof.projection))),
    "media-race proof was not hashed from retained authoritative Admin bytes"
  );
  for (const [label, mutate] of [
    [
      "media raw duplicate binding",
      (values) =>
        values[0].definition.editorView.bindings.push({
          ...values[0].definition.editorView.bindings[0],
        }),
    ],
    [
      "media raw entry mismatch",
      (values) => {
        values[1].data.raceImageId = rawMediaIds.media;
      },
    ],
    [
      "media raw unsafe URL",
      (values) => {
        values[2].url += "?private=1";
      },
    ],
    [
      "media raw override scope",
      (values) => {
        values[3].overrides[0].screenId = rawMediaIds.retryScreen;
      },
    ],
    [
      "media raw retry override",
      (values) => values[4].overrides.push({ ...values[3].overrides[0] }),
    ],
  ]) {
    const values = structuredClone(rawMediaValues);
    mutate(values);
    await expectAsyncFailure(
      async () => parseMediaRaceAuthoritativeAdminEvidence(makeRawMediaState(values)),
      label
    );
  }
  const unparseableMediaState = makeRawMediaState();
  unparseableMediaState.mediaRaceAdminEvidence.entry = Buffer.from("{");
  await expectAsyncFailure(
    async () => parseMediaRaceAuthoritativeAdminEvidence(unparseableMediaState),
    "media raw unparseable response"
  );
  invariant(
    RESPONSE_LOST_CREATE_ACTION_IDS.length === 18 &&
      deepEqualJson(
        RESPONSE_LOST_CREATE_ACTION_IDS,
        [...new Set(Object.values(PROVEN_RESOURCE_ACTIONS).map(({ origin }) => origin))].sort()
      ),
    "response-lost create action registry drift"
  );
  const baselineProbeState = {
    plan,
    responseLostBaselines: new Map(),
    responseLostIntents: new Map(),
  };
  const baselineProbeCalls = [];
  await captureAllResponseLostNaturalBaselinesBeforeFirstWrite(
    baselineProbeState,
    async (operationId, input) => {
      baselineProbeCalls.push(
        deepFreezeExact({ operationId, input: deepFreezeExact({ ...input }) })
      );
      return deepFreezeExact({ candidates: deepFreezeExact([]), overflow: false });
    }
  );
  invariant(
    baselineProbeCalls.length === 18 &&
      baselineProbeState.responseLostBaselines.size === 18 &&
      RESPONSE_LOST_CREATE_ACTION_IDS.every((actionId) =>
        baselineProbeState.responseLostBaselines.has(actionId)
      ) &&
      baselineProbeCalls.every(
        ({ operationId }) =>
          BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS[operationId]?.operationId === operationId
      ) &&
      new Set(baselineProbeCalls.map(({ operationId }) => operationId)).size === 18,
    "all response-lost natural baselines were not captured before the first write"
  );
  await expectAsyncFailure(
    () =>
      Promise.resolve(
        validateBoundedNaturalCandidateResult(
          deepFreezeExact({ candidates: deepFreezeExact([]), overflow: true }),
          "response-lost overflow self-test"
        )
      ),
    "response-lost DB-side overflow sentinel"
  );
  invariant(
    RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE.includes("roles.permissions") &&
      RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE.includes('row.roleName === "admin"') &&
      RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE.includes("adminRoleTupleCount") &&
      USER_PROVISION_BRIDGE_SOURCE.includes("wf540_user_password_exact_id") &&
      USER_PROVISION_BRIDGE_SOURCE.includes("normalizedEmailMatches:true") &&
      RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE.includes(
        "assertCanonicalStorageKey(candidate.key)"
      ) &&
      RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE.includes(
        'candidate.url !== "/media/" + candidate.key'
      ),
    "response-lost user/media provenance source drift"
  );
  invariant(
    API_SESSION_OBSERVATION_BRIDGE_SOURCE.includes(".limit(2)") &&
      API_SESSION_OBSERVATION_BRIDGE_SOURCE.includes("csrfTokenHash:sessions.csrfTokenHash") &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.includes("IS NOT DISTINCT FROM") &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.includes("const inTransactionRows = await tx.select()") &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.includes("const afterRows = await db.select()") &&
      !adminApiRequest.toString().includes("session.csrf") &&
      !adminApiRequest.toString().includes("session.context") &&
      disposeOwnedApiRequestContextAndProveAbsent.toString().includes("disposeAttemptPromise") &&
      disposeOwnedApiRequestContextAndProveAbsent.toString().includes("storageState") &&
      readPublicApiExactlyOnce.toString().indexOf("privateEphemeralApiContextRegistry") <
        readPublicApiExactlyOnce.toString().indexOf("await state.playwrightRequest.newContext") &&
      readPublicApiExactlyOnce.toString().indexOf("ephemeralRegistry.has") <
        readPublicApiExactlyOnce.toString().indexOf("await state.playwrightRequest.newContext"),
    "private API lifecycle or bootstrap CAS source drift"
  );
  return { successCapabilities, evidence };
}
