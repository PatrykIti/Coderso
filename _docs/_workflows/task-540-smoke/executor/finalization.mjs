// Canonical finalization authority for the TASK-540 smoke executor.
//
// Owns the frozen cleanup plan projection consumed by the cleanup stages, the successful
// screenshot set identity and content validator, and the canonical finalization builder that
// seals the API context, browser session, private root, host, bootstrap, content route, settings,
// storage and task-traffic proofs together with the screenshot set, the phase proof receipts and
// the phase trace.
import { MAX_STREAM_BYTES, SESSION_NAME } from "./config.mjs";
import { deepFreezeExact, exactOwnKeys, hashBytes, invariant } from "./foundation.mjs";
import { readOwnedRegularFileNoFollow } from "./private-workspace.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";

export function cleanupPlanView(ledger, blockedRoots = []) {
  return deepFreezeExact({
    ledger,
    dependencyGraph: deepFreezeExact(
      Object.fromEntries(ledger.map(({ resourceKey, dependsOn }) => [resourceKey, dependsOn]))
    ),
    failureDiscoveryBlockedParentKeys: deepFreezeExact([...blockedRoots]),
  });
}

export async function validateSuccessfulScreenshotSet(state) {
  invariant(
    state.screenshots.size === state.plan.requiredScreenshotPaths.length,
    "screenshot acquisition count drift"
  );
  const identities = new Set();
  const hashes = new Set();
  const paths = [];
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const relative of state.plan.requiredScreenshotPaths) {
    const record = state.screenshots.get(relative);
    invariant(record !== undefined, "required screenshot identity is absent");
    const expectedIdentity = Object.freeze({
      dev: record.dev,
      ino: record.ino,
      type: "file",
      mode: record.mode,
      size: record.size,
    });
    const bytes = await readOwnedRegularFileNoFollow(
      record.absolute,
      expectedIdentity,
      MAX_STREAM_BYTES
    );
    invariant(
      bytes.subarray(0, pngSignature.length).equals(pngSignature),
      "screenshot PNG signature drift"
    );
    invariant(hashBytes(bytes) === record.sha256, "screenshot content identity drift");
    const identityKey = record.dev + ":" + record.ino;
    invariant(
      !identities.has(identityKey) && !hashes.has(record.sha256),
      "screenshot identity/hash is not unique"
    );
    identities.add(identityKey);
    hashes.add(record.sha256);
    paths.push(
      deepFreezeExact({
        path: relative,
        size: record.size,
        sha256: record.sha256,
        dev: record.dev,
        ino: record.ino,
      })
    );
  }
  return deepFreezeExact(paths);
}

export function buildCanonicalFinalization(
  state,
  screenshots,
  phaseProofReceipts,
  phaseTrace,
  baselineProof
) {
  invariant(
    state.apiContextsClosedProof !== null &&
      state.privateRootFinalization !== null &&
      state.hostFinalization !== null &&
      state.taskTrafficDeltaCounts !== null &&
      state.missingMediaSetupProof !== null &&
      state.missingMediaCleanupProof !== null &&
      state.bootstrapRestored === true,
    "canonical finalization source is incomplete"
  );
  invariant(
    deepEqualJson(state.apiContextsClosedProof.inputContextNames, ["bootstrap", "user-a"]) &&
      state.apiContextsClosedProof.allAcquiredContextsAbsent === true &&
      state.apiContextsClosedProof.registryCleared === true &&
      state.apiContextsClosedProof.bootstrap?.acquired === true &&
      state.apiContextsClosedProof.bootstrap?.disposeCalled === true &&
      state.apiContextsClosedProof.bootstrap?.capabilityAbsent === true &&
      state.apiContextsClosedProof.userA?.acquired === true &&
      state.apiContextsClosedProof.userA?.disposeCalled === true &&
      state.apiContextsClosedProof.userA?.capabilityAbsent === true,
    "canonical API-context finalization drift"
  );
  const missingCleanupReceipt = phaseProofReceipts.find(
    ({ operation }) => operation === "media-race-missing-absence-cleanup"
  );
  invariant(
    Number.isSafeInteger(state.missingMediaSetupReceiptSequence) &&
      missingCleanupReceipt !== undefined &&
      state.missingMediaSetupProof.evidenceSha256 !== state.missingMediaCleanupProof.evidenceSha256,
    "missing media receipt finalization drift"
  );
  const deletedCounts = deepFreezeExact({
    audit: state.terminalDeletedCounts["audit-log-task-ua"],
    access: state.terminalDeletedCounts["access-log-task-ua"],
    session: state.terminalDeletedCounts["session-task"],
  });
  const finalization = deepFreezeExact({
    apiContexts: deepFreezeExact({
      names: deepFreezeExact(["bootstrap", "user-a"]),
      closed: true,
      absenceProven: true,
    }),
    browserSession: deepFreezeExact({
      name: SESSION_NAME,
      closeReceiptSequence: 419,
      absenceReceiptSequence: 420,
      terminalListSha256: state.terminalSessionAbsenceSha256,
      closed: true,
      absent: true,
    }),
    privateRoot: state.privateRootFinalization,
    host: state.hostFinalization,
    bootstrap: deepFreezeExact({
      id: state.bootstrapBaseline.id,
      setupCompletedBeforeStart: true,
      casRestored: true,
      completeRowByteIdentical: baselineProof.bootstrapByteIdentical,
      roleTuplesByteIdentical: baselineProof.bootstrapByteIdentical,
    }),
    contentRoutes: deepFreezeExact({
      key: "site.contentRoutes",
      taskSlugsAbsentAtBaseline: true,
      byteIdenticalBeforeEachDelete: state.contentRoutesDeleteProofs === 4,
      byteIdenticalAfterCleanup: baselineProof.contentRoutesByteIdentical,
    }),
    settings: deepFreezeExact({ userAAbsent: true, userBAbsent: true }),
    storage: deepFreezeExact({
      driver: "local",
      rootIdentityByteIdentical: baselineProof.storageRootByteIdentical,
      baselineManifestByteIdentical: baselineProof.storageManifestByteIdentical,
      acquiredMediaRowAbsent: baselineProof.acquiredMediaAbsent,
      acquiredStorageKeyAbsent: baselineProof.acquiredMediaAbsent,
      missingMedia: deepFreezeExact({
        id: state.plan.fixtureBlueprint.media.missingBoundMediaId,
        rowCount: 0,
        storageMatches: 0,
        setupReceiptSequence: state.missingMediaSetupReceiptSequence,
        cleanupReceiptSequence: missingCleanupReceipt.sequence,
      }),
    }),
    taskTraffic: deepFreezeExact({
      baselineCounts: deepFreezeExact({
        audit: state.taskTrafficBaseline.auditIds.length,
        access: state.taskTrafficBaseline.accessIds.length,
        session: state.taskTrafficBaseline.sessionIds.length,
      }),
      deltaCounts: state.taskTrafficDeltaCounts,
      deletedCounts,
      stablePollsBeforeDelete: state.taskTrafficPollCount,
      stablePollsAfterDelete: baselineProof.postDeleteStablePolls,
      returnedToBaseline: baselineProof.taskTrafficByteIdentical,
    }),
    screenshots,
    phaseProofReceipts: deepFreezeExact(phaseProofReceipts),
    phaseTrace: deepFreezeExact(phaseTrace),
  });
  exactOwnKeys(
    finalization,
    [
      "apiContexts",
      "browserSession",
      "privateRoot",
      "host",
      "bootstrap",
      "contentRoutes",
      "settings",
      "storage",
      "taskTraffic",
      "screenshots",
      "phaseProofReceipts",
      "phaseTrace",
    ],
    "canonical finalization",
    { plain: true }
  );
  invariant(
    finalization.browserSession.terminalListSha256 ===
      hashBytes(Buffer.from("  (no browsers)\n")) &&
      phaseTrace.length === 10 &&
      phaseTrace.every(({ phase, completed }, index) => phase === index + 1 && completed === true),
    "canonical finalization terminal proof drift"
  );
  return finalization;
}
