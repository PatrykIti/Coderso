import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { MAX_STREAM_BYTES } from "../executor/config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../executor/foundation.mjs";

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
            "storage manifest directory and depth bound exceeded"
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
      "storage manifest serialized size and time bound exceeded"
    );
    return deepFreezeExact({ rootIdentity, rows: deepFreezeExact(rows) });
  }

  // The scan above stays full fidelity - it is evidence. This is the projection the terminal
  // baseline comparison may assert on.
  //
  // POSIX advances a directory's mtime when an entry is created or removed inside it and nothing
  // can restore it. set-030-media-upload writes <root>/yyyy/mm/<uuid>.png into a PRE-EXISTING month
  // directory and cleanup phase 3 unlinks it, so that directory's mtimeNs necessarily differs
  // between the preflight snapshot and the final one; `size` is volatile for the same reason
  // (many filesystems grow a directory on insert and never shrink it on unlink). Run ec39365eafa6
  // failed on exactly one field of exactly one row - `2026/07` mtimeNs 1785119099059821850 ->
  // 1785120775605060711 - after correctly deleting its own media row and file (phase 3 proved the
  // file absent via requireMissingPath, and the row is gone from the live media table). The leak
  // signal lives in the ENTRY SET and in the FILE rows, both still compared exactly here. This is
  // the same notion of identity the programme's own ownership helpers already use for these
  // directories (private-workspace.mjs projectArtifactIdentity/sameArtifactIdentity carry no mtime;
  // media-storage-ownership.mjs compares ancestors on type/dev/ino/mode only; and the root check
  // above already passes includeSize:false).
  function projectLeakSensitiveStorageManifest(manifest) {
    exactOwnKeys(manifest, ["rootIdentity", "rows"], "storage manifest projection", {
      plain: true,
    });
    exactOwnKeys(
      manifest.rootIdentity,
      ["dev", "ino", "mode", "size", "type"],
      "storage manifest projection root identity",
      { plain: true }
    );
    const { dev, ino, mode, type } = manifest.rootIdentity;
    invariant(type === "directory", "storage manifest root is not a directory");
    invariant(Array.isArray(manifest.rows), "storage manifest rows are not an array");
    const rows = manifest.rows.map((row) => {
      exactOwnKeys(
        row,
        ["dev", "ino", "key", "mode", "mtimeNs", "size", "type"],
        "storage manifest projection row",
        { plain: true }
      );
      invariant(
        row.type === "directory" || row.type === "file",
        "storage manifest projection row type drift"
      );
      // A file row keeps every field, mtimeNs and size included: a rewritten, replaced or merely
      // touched file must still fail. Only a directory's POSIX-volatile pair is dropped.
      return row.type === "directory"
        ? deepFreezeExact({
            dev: row.dev,
            ino: row.ino,
            key: row.key,
            mode: row.mode,
            type: row.type,
          })
        : deepFreezeExact({ ...row });
    });
    return deepFreezeExact({
      rootIdentity: deepFreezeExact({ dev, ino, mode, type }),
      rows: deepFreezeExact(rows),
    });
  }

  // The row set alone, so a leaked or vanished entry names itself instead of arriving as an
  // anonymous field difference. The scan already sorts rows by key, so this ordering is canonical.
  function projectStorageManifestEntrySet(projection) {
    exactOwnKeys(projection, ["rootIdentity", "rows"], "storage manifest entry set", {
      plain: true,
    });
    invariant(Array.isArray(projection.rows), "storage manifest entry set rows are not an array");
    // NUL separator: the scan refuses a name containing a NUL byte, so no key/type pair can
    // collide with another. A space would not do - a filename may legitimately contain one.
    return deepFreezeExact(projection.rows.map((row) => row.key + "\u0000" + row.type));
  }

  return Object.freeze({
    projectLeakSensitiveStorageManifest,
    projectStorageManifestEntrySet,
    scanExactLocalStorageManifest,
  });
}
