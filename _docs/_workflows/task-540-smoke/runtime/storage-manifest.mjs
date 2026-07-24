import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { MAX_STREAM_BYTES } from "../executor/config.mjs";
import { canonicalJson, deepFreezeExact, invariant } from "../executor/foundation.mjs";

export function createStorageManifestRuntime({
  readStableArtifactIdentity,
  responseLostStorageRoot,
  sameArtifactIdentity,
}) {
  async function scanExactLocalStorageManifest(state) {
    const root = responseLostStorageRoot(state);
    invariant(state.storageRootRealPath === root, "storage manifest canonical root drift");
    const startedAt = Date.now();
    const rootIdentity = await readStableArtifactIdentity(root, {
      expectedType: "directory",
      expectedDev: state.storageRootIdentity.dev,
    });
    invariant(
      sameArtifactIdentity(rootIdentity, state.storageRootIdentity, { includeSize: false }),
      "storage root identity drift"
    );
    const rows = [];
    let directoryCount = 0;
    const pending = [{ relative: "", depth: 0 }];
    while (pending.length > 0) {
      invariant(Date.now() - startedAt <= 30_000, "storage manifest walk exceeded its time bound");
      const { relative: relativeDirectory, depth } = pending.shift();
      invariant(depth <= 3, "storage manifest exceeded its depth bound");
      const absoluteDirectory =
        relativeDirectory === "" ? root : path.join(root, relativeDirectory);
      const names = (await readdir(absoluteDirectory)).sort();
      for (const name of names) {
        invariant(
          Date.now() - startedAt <= 30_000,
          "storage manifest walk exceeded its time bound"
        );
        invariant(
          name !== "." &&
            name !== ".." &&
            !name.includes("/") &&
            !name.includes("\\") &&
            !name.includes("\0"),
          "storage manifest name drift"
        );
        const relative = relativeDirectory === "" ? name : relativeDirectory + "/" + name;
        invariant(
          depth + 1 <= 3 &&
            Buffer.byteLength(relative) <= 512 &&
            !relative.startsWith("/") &&
            relative.split("/").every((part) => part.length > 0 && part !== "." && part !== ".."),
          "storage manifest relative key drift"
        );
        const absolute = path.join(root, ...relative.split("/"));
        const info = await lstat(absolute, { bigint: true });
        invariant(
          !info.isSymbolicLink() && (info.isFile() || info.isDirectory()),
          "storage manifest contains a symlink or special file"
        );
        invariant(
          info.dev.toString() === state.storageRootIdentity.dev,
          "storage manifest crossed a device boundary"
        );
        const canonicalChild = await realpath(absolute);
        invariant(
          canonicalChild === absolute && canonicalChild.startsWith(root + path.sep),
          "storage manifest child escaped its canonical root"
        );
        const size = Number(info.size);
        const mode = Number(info.mode);
        invariant(
          Number.isSafeInteger(size) && size >= 0 && Number.isSafeInteger(mode),
          "storage manifest metadata overflow"
        );
        rows.push(
          deepFreezeExact({
            key: relative,
            dev: info.dev.toString(),
            ino: info.ino.toString(),
            type: info.isDirectory() ? "directory" : "file",
            size,
            mode,
            mtimeNs: info.mtimeNs.toString(),
          })
        );
        invariant(rows.length <= 10_000, "storage manifest entry bound exceeded");
        if (info.isDirectory()) {
          directoryCount += 1;
          invariant(
            directoryCount <= 2_000 && depth + 1 <= 3,
            "storage manifest directory/depth bound exceeded"
          );
          pending.push({ relative, depth: depth + 1 });
        }
      }
    }
    rows.sort((left, right) => left.key.localeCompare(right.key));
    invariant(
      new Set(rows.map(({ key }) => key)).size === rows.length,
      "storage manifest contains duplicate keys"
    );
    invariant(
      Buffer.byteLength(canonicalJson(rows)) <= MAX_STREAM_BYTES &&
        Date.now() - startedAt <= 30_000,
      "storage manifest serialized/time bound exceeded"
    );
    return deepFreezeExact({ rootIdentity, rows: deepFreezeExact(rows) });
  }

  return Object.freeze({ scanExactLocalStorageManifest });
}
