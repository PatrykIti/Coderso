import { readdir, rmdir } from "node:fs/promises";
import path from "node:path";

import { deepFreezeExact, invariant } from "../executor/foundation.mjs";
import { deepEqualJson } from "../executor/resource-contracts.mjs";

export function createMediaStorageOwnershipRuntime({
  assertNoSymlinkAncestors,
  readStableArtifactIdentity,
  requireMissingPath,
  responseLostStorageRoot,
  sameArtifactIdentity,
}) {
  async function captureCanonicalMediaStorageOwnership(state, storageKey) {
    invariant(
      typeof storageKey === "string" &&
        /^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/u.test(
          storageKey
        ),
      "media storage key is not the canonical yyyy/mm UUID PNG key"
    );
    const root = responseLostStorageRoot(state);
    const absolute = path.resolve(root, ...storageKey.split("/"));
    invariant(absolute.startsWith(root + path.sep), "media storage key escaped its canonical root");
    await assertNoSymlinkAncestors(absolute);
    const fileIdentity = await readStableArtifactIdentity(absolute, {
      expectedType: "file",
      expectedDev: state.storageRootIdentity.dev,
    });
    const baselineByKey = new Map(state.storageBaselineManifest.rows.map((row) => [row.key, row]));
    invariant(!baselineByKey.has(storageKey), "media storage key existed at the pre-write baseline");
    const [year, month] = storageKey.split("/");
    const ancestors = [];
    for (const relative of [year, year + "/" + month]) {
      const identity = await readStableArtifactIdentity(path.join(root, ...relative.split("/")), {
        expectedType: "directory",
        expectedDev: state.storageRootIdentity.dev,
      });
      const baseline = baselineByKey.get(relative);
      if (baseline !== undefined) {
        invariant(
          baseline.type === "directory" &&
            baseline.dev === identity.dev &&
            baseline.ino === identity.ino &&
            (baseline.mode & 0o777) === identity.mode,
          "pre-existing media ancestor identity drift"
        );
      }
      ancestors.push(
        deepFreezeExact({
          relative,
          identity,
          acquiredByUpload: baseline === undefined,
        })
      );
    }
    const ownership = deepFreezeExact({
      storageKey,
      fileIdentity,
      ancestors: deepFreezeExact(ancestors),
    });
    if (state.mediaStorageOwnership === null) {
      state.mediaStorageOwnership = ownership;
    } else {
      invariant(
        state.mediaStorageOwnership.storageKey === storageKey &&
          sameArtifactIdentity(state.mediaStorageOwnership.fileIdentity, fileIdentity, {
            includeSize: true,
          }) &&
          deepEqualJson(state.mediaStorageOwnership.ancestors, ancestors),
        "media storage ownership was reassigned"
      );
    }
    return fileIdentity;
  }

  async function restoreIdentitySafeMediaAncestorDirectories(state, storageKey) {
    const ownership = state.mediaStorageOwnership;
    invariant(
      ownership !== null && ownership.storageKey === storageKey,
      "media storage ownership proof is absent"
    );
    const root = responseLostStorageRoot(state);
    for (const ancestor of [...ownership.ancestors].reverse()) {
      const absolute = path.resolve(root, ...ancestor.relative.split("/"));
      invariant(absolute.startsWith(root + path.sep), "media ancestor escaped its canonical root");
      if (!ancestor.acquiredByUpload) {
        const current = await readStableArtifactIdentity(absolute, {
          expectedType: "directory",
          expectedDev: state.storageRootIdentity.dev,
        });
        invariant(
          sameArtifactIdentity(current, ancestor.identity),
          "pre-existing media ancestor identity changed"
        );
        continue;
      }
      let current;
      try {
        current = await readStableArtifactIdentity(absolute, {
          expectedType: "directory",
          expectedDev: state.storageRootIdentity.dev,
        });
      } catch (error) {
        invariant(error && error.code === "ENOENT", "acquired media ancestor could not be observed");
        continue;
      }
      invariant(
        sameArtifactIdentity(current, ancestor.identity),
        "acquired media ancestor identity changed"
      );
      const names = await readdir(absolute);
      invariant(names.length === 0, "acquired media ancestor is not empty");
      await rmdir(absolute);
      await requireMissingPath(absolute, "removed acquired media ancestor");
    }
  }

  return Object.freeze({
    captureCanonicalMediaStorageOwnership,
    restoreIdentitySafeMediaAncestorDirectories,
  });
}
