import { realpath } from "node:fs/promises";

import { validateBootstrapPrivateBaseline } from "../executor/bootstrap-contracts.mjs";
import {
  MAX_COMPLETE_SESSION_ROWS,
  MAX_TASK_TRAFFIC_ROWS,
} from "../executor/config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../executor/foundation.mjs";
import { deepEqualJson } from "../executor/resource-contracts.mjs";

export function createStoragePreflightRuntime({
  assertNoSymlinkAncestors,
  assertRecordIdentity,
  captureAllResponseLostNaturalBaselinesBeforeFirstWrite,
  initializeBootstrapLoginAuthority,
  readStableArtifactIdentity,
  responseLostStorageRoot,
  runBunBridgeOperation,
  runtimeSafeProjection,
  scanExactLocalStorageManifest,
}) {
  async function runtimeStoragePreflight({ state, plan }) {
    const proof = await runBunBridgeOperation(state, "runtime/set-001-storage-preflight", {
      userAgents: [
        plan.fixtureBlueprint.userAgents.browser,
        plan.fixtureBlueprint.userAgents.publicPreflight,
        plan.fixtureBlueprint.userAgents.apiBootstrap,
        plan.fixtureBlueprint.userAgents.apiUserA,
      ],
    });
    assertRecordIdentity(proof, { local: true, setupComplete: true }, "storage preflight");
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
      "storage preflight proof",
      { plain: true }
    );
    exactOwnKeys(
      proof.taskTrafficBaseline,
      ["accessIds", "auditIds", "sessionIds"],
      "task traffic baseline",
      { plain: true }
    );
    validateBootstrapPrivateBaseline(proof.bootstrap);
    for (const [kind, ids, bound] of [
      ["access", proof.taskTrafficBaseline.accessIds, MAX_TASK_TRAFFIC_ROWS],
      ["audit", proof.taskTrafficBaseline.auditIds, MAX_TASK_TRAFFIC_ROWS],
      ["session", proof.taskTrafficBaseline.sessionIds, MAX_COMPLETE_SESSION_ROWS],
    ]) {
      invariant(
        Array.isArray(ids) &&
          ids.length <= bound &&
          new Set(ids).size === ids.length &&
          ids.every((id) => /^[0-9a-f-]{36}$/u.test(id)) &&
          deepEqualJson(ids, [...ids].sort()),
        kind + " preflight baseline inventory drift"
      );
    }
    state.bootstrapBaseline = deepFreezeExact(proof.bootstrap);
    initializeBootstrapLoginAuthority(state, state.bootstrapBaseline);
    state.contentRoutesBaseline = deepFreezeExact(proof.contentRoutes);
    state.requiredSettingsBaseline = deepFreezeExact(proof.requiredSettings);
    state.storageRootBaseline = proof.storageRoot;
    state.taskTrafficBaseline = deepFreezeExact(proof.taskTrafficBaseline);
    const storageRoot = responseLostStorageRoot(state);
    await assertNoSymlinkAncestors(storageRoot);
    state.storageRootRealPath = await realpath(storageRoot);
    invariant(
      state.storageRootRealPath === storageRoot,
      "storage root is not its canonical real path"
    );
    state.storageRootIdentity = await readStableArtifactIdentity(storageRoot, {
      expectedType: "directory",
    });
    state.storageBaselineManifest = await scanExactLocalStorageManifest(state);
    invariant(
      !canonicalJson(proof.contentRoutes).includes(plan.prefix),
      "content routes baseline already contains a task slug"
    );
    await captureAllResponseLostNaturalBaselinesBeforeFirstWrite(state);
    return runtimeSafeProjection({
      bootstrapId: proof.bootstrap.id,
      contentRoutesExists: proof.contentRoutes.exists,
      local: true,
      setupComplete: true,
      taskTrafficBaselineCounts: {
        access: proof.taskTrafficBaseline.accessIds.length,
        audit: proof.taskTrafficBaseline.auditIds.length,
        sessions: proof.taskTrafficBaseline.sessionIds.length,
      },
    });
  }

  return Object.freeze({ runtimeStoragePreflight });
}
