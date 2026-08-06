import path from "node:path";

import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../executor/foundation.mjs";
import { deepEqualJson } from "../executor/resource-contracts.mjs";

export function createMissingMediaProofRuntime({
  PROCESS_ABSENCE_STABILITY_MS,
  delayMilliseconds,
  runBunBridgeOperation,
  runtimeSafeProjection,
  scanExactLocalStorageManifest,
}) {
  async function proveMissingMediaDbAndStorageAbsence(
    state,
    phase,
    operationId = "resource/missing-media-db-absence"
  ) {
    invariant(phase === "setup" || phase === "cleanup", "missing media proof phase drift");
    const mediaId = state.plan.fixtureBlueprint.media.missingBoundMediaId;
    const before = await runBunBridgeOperation(state, operationId, { mediaId });
    exactOwnKeys(before, ["rowCount"], "missing media DB-before proof", { plain: true });
    const scan1 = await scanExactLocalStorageManifest(state);
    await delayMilliseconds(PROCESS_ABSENCE_STABILITY_MS);
    const scan2 = await scanExactLocalStorageManifest(state);
    const after = await runBunBridgeOperation(state, operationId, { mediaId });
    exactOwnKeys(after, ["rowCount"], "missing media DB-after proof", { plain: true });
    invariant(before.rowCount === 0 && after.rowCount === 0, "missing media DB row exists");
    invariant(deepEqualJson(scan1, scan2), "missing media storage scan is unstable");
    const storageMatches = scan2.rows.filter(
      ({ key, type }) => type === "file" && path.posix.parse(key).name === mediaId
    ).length;
    invariant(storageMatches === 0, "missing media storage basename exists");
    const authoritativeBytes = Buffer.from(
      canonicalJson({ before, scan1, scan2, after, mediaId, phase }) + "\n"
    );
    const projection = deepFreezeExact({ rowCount: 0, storageMatches: 0 });
    const proof = deepFreezeExact({
      evidenceSha256: hashBytes(authoritativeBytes),
      projection,
    });
    if (phase === "setup") {
      invariant(
        state.missingMediaSetupProof === null,
        "missing media setup proof was assigned twice"
      );
      state.missingMediaSetupProof = proof;
    } else {
      invariant(
        state.missingMediaCleanupProof === null,
        "missing media cleanup proof was assigned twice"
      );
      state.missingMediaCleanupProof = proof;
    }
    return proof;
  }

  async function runtimeStoragePostSetup({ state }) {
    const proof = await proveMissingMediaDbAndStorageAbsence(
      state,
      "setup",
      "runtime/set-032-storage-post-setup"
    );
    return runtimeSafeProjection(proof.projection);
  }

  return Object.freeze({
    proveMissingMediaDbAndStorageAbsence,
    runtimeStoragePostSetup,
  });
}
