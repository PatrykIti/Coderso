import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../executor/foundation.mjs";
import { deepEqualJson } from "../executor/resource-contracts.mjs";

export function createFinalBaselinesRuntime({
  PROCESS_ABSENCE_STABILITY_MS,
  delayMilliseconds,
  runBunBridgeOperation,
  scanExactLocalStorageManifest,
  taskUserAgents,
}) {
  function assertFinalStorageDatabaseBaseline(state, proof, secondProof) {
    invariant(
      deepEqualJson(proof, secondProof) &&
        proof.local === true &&
        proof.setupComplete === true &&
        proof.storageRoot === state.storageRootBaseline &&
        deepEqualJson(proof.bootstrap, state.bootstrapBaseline) &&
        deepEqualJson(proof.contentRoutes, state.contentRoutesBaseline) &&
        deepEqualJson(proof.requiredSettings, state.requiredSettingsBaseline) &&
        deepEqualJson(proof.taskTrafficBaseline, state.taskTrafficBaseline),
      // Phrased without a slash on purpose. RUNTIME_INVARIANT_PHRASE_PATTERN accepts letters,
      // spaces and hyphens only, so a "/" made the projection abstain and this phase - which
      // re-asserts the same bootstrap byte identity phase 8 restores - could only ever surface as a
      // bare cleanupPhase 9 with no stated reason. Every invariant phrase in this file is now
      // projectable.
      "final storage and database baseline drift"
    );
  }

  async function proveFinalStorageAndDatabaseBaselines(state, onPoll = null) {
    invariant(
      onPoll === null || typeof onPoll === "function",
      "post-delete task traffic poll authority drift"
    );
    const input = {
      userAgents: taskUserAgents(state),
    };
    const proof = await runBunBridgeOperation(
      state,
      "resource/storage-final-preflight",
      input
    );
    exactOwnKeys(
      proof,
      [
        "bootstrap",
        "contentRoutes",
        "local",
        "requiredSettings",
        "setupComplete",
        "storageRoot",
        "taskTrafficBaseline",
      ],
      "final storage/database proof poll 1",
      { plain: true }
    );
    exactOwnKeys(
      proof.taskTrafficBaseline,
      ["accessIds", "auditIds", "sessionIds"],
      "final task traffic poll 1",
      { plain: true }
    );
    if (onPoll !== null) {
      await onPoll(1, {
        audit: proof.taskTrafficBaseline.auditIds,
        access: proof.taskTrafficBaseline.accessIds,
        session: proof.taskTrafficBaseline.sessionIds,
      });
    }
    await delayMilliseconds(PROCESS_ABSENCE_STABILITY_MS);
    const secondProof = await runBunBridgeOperation(
      state,
      "resource/storage-final-preflight",
      input
    );
    exactOwnKeys(
      secondProof,
      [
        "bootstrap",
        "contentRoutes",
        "local",
        "requiredSettings",
        "setupComplete",
        "storageRoot",
        "taskTrafficBaseline",
      ],
      "final storage/database proof poll 2",
      { plain: true }
    );
    exactOwnKeys(
      secondProof.taskTrafficBaseline,
      ["accessIds", "auditIds", "sessionIds"],
      "final task traffic poll 2",
      { plain: true }
    );
    if (onPoll !== null) {
      await onPoll(2, {
        audit: secondProof.taskTrafficBaseline.auditIds,
        access: secondProof.taskTrafficBaseline.accessIds,
        session: secondProof.taskTrafficBaseline.sessionIds,
      });
    }
    assertFinalStorageDatabaseBaseline(state, proof, secondProof);
    const contentRoutesAfterCleanup = await runBunBridgeOperation(
      state,
      "resource/content-routes-exact",
      {}
    );
    invariant(
      deepEqualJson(contentRoutesAfterCleanup, state.contentRoutesBaseline),
      "final content routes baseline drift"
    );
    invariant(
      !canonicalJson(contentRoutesAfterCleanup).includes(state.plan.prefix),
      "final content routes contains a task slug"
    );
    const finalStorageManifest = await scanExactLocalStorageManifest(state);
    invariant(
      deepEqualJson(finalStorageManifest, state.storageBaselineManifest),
      "final storage manifest differs from preflight"
    );
    const persistentLedger =
      state.coreCleanupContext.resourceLedger.compileResourceRecords("persistent");
    const settingRecords = persistentLedger.filter(
      ({ kind }) => kind === "setting-user-a" || kind === "setting-user-b"
    );
    const mediaRecord = persistentLedger.find(({ kind }) => kind === "media-row-key");
    invariant(
      settingRecords.length === 2 &&
        settingRecords.every(({ resourceKey }) => state.cleanupAbsenceKeys.has(resourceKey)) &&
        mediaRecord !== undefined &&
        state.cleanupAbsenceKeys.has(mediaRecord.resourceKey),
      "final setting and media absence proof drift"
    );
    invariant(
      state.contentRoutesDeleteProofs === 4,
      "content routes was not proved before every content-type delete"
    );
    invariant(state.taskTrafficDeltaCounts !== null, "task traffic delta counts are absent");
    const deletedCounts = {
      audit: state.terminalDeletedCounts["audit-log-task-ua"],
      access: state.terminalDeletedCounts["access-log-task-ua"],
      session: state.terminalDeletedCounts["session-task"],
    };
    invariant(
      deepEqualJson(deletedCounts, state.taskTrafficDeltaCounts),
      "task traffic deleted and delta count drift"
    );
    return deepFreezeExact({
      bootstrapByteIdentical: true,
      contentRoutesByteIdentical: true,
      storageRootByteIdentical: true,
      storageManifestByteIdentical: true,
      taskTrafficByteIdentical: true,
      settingsAbsent: true,
      acquiredMediaAbsent: true,
      postDeleteStablePolls: 2,
    });
  }

  return Object.freeze({
    assertFinalStorageDatabaseBaseline,
    proveFinalStorageAndDatabaseBaselines,
  });
}
