// Canonical finalization authority for the TASK-540 smoke executor.
//
// Owns the frozen cleanup plan projection consumed by the cleanup stages, the successful
// screenshot set identity and content validator, and the canonical finalization builder that
// seals the API context, browser session, private root, host, bootstrap, content route, settings,
// storage and task-traffic proofs together with the screenshot set, the phase proof receipts and
// the phase trace.
import { removeAcquiredScreenshots } from "./browser-output-authority.mjs";
import { MAX_STREAM_BYTES, SESSION_NAME } from "./config.mjs";
import { deepFreezeExact, exactOwnKeys, hashBytes, invariant } from "./foundation.mjs";
import {
  readOwnedRegularFileNoFollow,
  removePrivateWorkspaceLedger,
} from "./private-workspace.mjs";
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

// rc-033-stale-shot and rc-037-final-shot photograph the SAME visible state on purpose. The only
// actions between them release the held stale related-A response (rc-034) and unroute it (rc-036),
// and rc-035-stale-proof asserts that the released response must leave the visible state unchanged:
// the updated A1 title must stay absent while the B rows remain retained. Flow 5 never toggles the
// theme either - the "-dark" in the second file name is the theme flow 4 left behind, and flow 6's
// first theme action ("flow 6 dark -> light selected") records that flow 5 ended dark - so nothing
// between the two captures can change a pixel unless stale-response rejection BROKE. Two
// byte-identical PNGs are therefore the pixel-level corroboration that the product did the right
// thing, and requiring all 13 contents to differ required a repaint the product must not perform.
// Measured on run 1640c86416da: both files are 166583 bytes with sha256
// c2c0e994164c3ecdf0382812addbd1d29eb9cc6e099c725545338214367a74e9, on distinct inodes 7022820 and
// 7022821, written 4.53 s apart - so the acquisition genuinely happened twice and only the CONTENT
// coincided. The pair is declared here rather than the uniqueness check being deleted, so the claim
// stays narrow: two shots from unrelated flows that photograph the same view - the signature of a
// capture pointed at the wrong page - still fail, every PNG must still be its own file, and every
// PNG must still hash to the value its acquisition recorded. Identity is PERMITTED here, not
// required: a legitimate incidental repaint (a toast, a focus ring) must not fail a 35-minute run,
// and the authoritative proof that the stale response was rejected is rc-035's exact DOM assertion,
// not these bytes.
export const EXPECTED_IDENTICAL_SCREENSHOT_PATH_GROUPS = deepFreezeExact([
  [
    "_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png",
    "_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png",
  ],
]);

// Fails closed against the frozen contract: a declared path that is not a required screenshot, a
// group with fewer than two members, a repeated member or a path claimed by two groups all refuse,
// so the declaration can never silently stop covering the pair it was written for.
export function expectedIdenticalScreenshotGroupOrdinals(
  requiredScreenshotPaths,
  groups = EXPECTED_IDENTICAL_SCREENSHOT_PATH_GROUPS
) {
  const required = new Set(requiredScreenshotPaths);
  const ordinalByPath = new Map();
  invariant(Array.isArray(groups), "expected identical screenshot groups are absent");
  for (const [ordinal, group] of groups.entries()) {
    invariant(
      Array.isArray(group) &&
        group.length >= 2 &&
        new Set(group).size === group.length &&
        group.every((path) => required.has(path) && !ordinalByPath.has(path)),
      "expected identical screenshot group drift"
    );
    for (const path of group) ordinalByPath.set(path, ordinal);
  }
  return ordinalByPath;
}

export async function validateSuccessfulScreenshotSet(state) {
  invariant(
    state.screenshots.size === state.plan.requiredScreenshotPaths.length,
    "screenshot acquisition count drift"
  );
  const identicalGroupOrdinals = expectedIdenticalScreenshotGroupOrdinals(
    state.plan.requiredScreenshotPaths
  );
  const identities = new Set();
  const hashOwners = new Map();
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
    invariant(!identities.has(identityKey), "screenshot file identity is not unique");
    const sameContentAs = hashOwners.get(record.sha256);
    invariant(
      sameContentAs === undefined ||
        (identicalGroupOrdinals.has(relative) &&
          identicalGroupOrdinals.get(relative) === identicalGroupOrdinals.get(sameContentAs)),
      "undeclared duplicate screenshot content hash"
    );
    identities.add(identityKey);
    if (sameContentAs === undefined) hashOwners.set(record.sha256, relative);
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
      baselineManifestEntriesIdentical: baselineProof.storageManifestEntriesIdentical,
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

export function createConstructionStateCleanup(dependencies) {
  // The browser teardown proofs, the API request context registries and their disposal proofs and
  // the owned host stopper belong to authorities the facade composes, so they arrive as injected
  // dependencies and the declaration below closes over those exact values instead of a rebindable
  // module slot.
  exactOwnKeys(
    dependencies,
    [
      "closeBrowserIfPresent",
      "disposeApiRequestContextAndProveAbsent",
      "disposeOwnedApiRequestContextAndProveAbsent",
      "privateApiContextRegistry",
      "privateEphemeralApiContextRegistry",
      "proveBrowserSessionAbsent",
      "releaseFailureRoutesIfPresent",
      "retainedApiLifecycleFailure",
      "stopOwnedHost",
    ],
    "construction state cleanup dependencies",
    { plain: true }
  );
  invariant(
    Object.values(dependencies).every((dependency) => typeof dependency === "function"),
    "construction state cleanup dependencies are not callable"
  );
  const {
    closeBrowserIfPresent,
    disposeApiRequestContextAndProveAbsent,
    disposeOwnedApiRequestContextAndProveAbsent,
    privateApiContextRegistry,
    privateEphemeralApiContextRegistry,
    proveBrowserSessionAbsent,
    releaseFailureRoutesIfPresent,
    retainedApiLifecycleFailure,
    stopOwnedHost,
  } = dependencies;

  async function cleanupConstructionStateOnce(state) {
    if (state.cleanupPromise) return state.cleanupPromise;
    state.cleanupPromise = (async () => {
      const failures = [];
      const attempt = async (callback) => {
        try {
          await callback();
        } catch (error) {
          failures.push(error);
        }
      };
      if (state.browserMayExist) {
        await attempt(() => releaseFailureRoutesIfPresent(state));
        await attempt(() => closeBrowserIfPresent(state));
        await attempt(() => proveBrowserSessionAbsent(state));
      }
      const ephemeralContexts = privateEphemeralApiContextRegistry(state);
      for (const [key, record] of [...ephemeralContexts.entries()].sort(([left], [right]) =>
        left.localeCompare(right)
      )) {
        await attempt(async () => {
          await disposeOwnedApiRequestContextAndProveAbsent(record, key);
          const lifecycleError = retainedApiLifecycleFailure(record, key);
          if (lifecycleError !== null) throw lifecycleError;
        });
        if (record.disposeProof !== null) ephemeralContexts.delete(key);
      }
      const privateContexts = privateApiContextRegistry(state);
      for (const [key, record] of [...privateContexts.entries()].sort(([left], [right]) =>
        left.localeCompare(right)
      )) {
        await attempt(async () => {
          await disposeApiRequestContextAndProveAbsent(state, record.capability, key);
          const lifecycleError = retainedApiLifecycleFailure(record, key);
          if (lifecycleError !== null) throw lifecycleError;
        });
        if (record.disposeProof !== null) {
          privateContexts.delete(key);
          state.sessions.delete(key);
        }
      }
      await attempt(() => removeAcquiredScreenshots(state));
      await attempt(() => removePrivateWorkspaceLedger(state.browserWorkspace.ledger));
      await attempt(() => stopOwnedHost(state));
      state.cleanupFailures = failures.length;
      return deepFreezeExact({ absenceProven: failures.length === 0 });
    })();
    return state.cleanupPromise;
  }

  return Object.freeze({
    cleanupConstructionStateOnce,
  });
}
