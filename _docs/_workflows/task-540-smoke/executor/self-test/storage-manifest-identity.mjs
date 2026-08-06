// Self-test for the storage-manifest identity the terminal cleanup phase asserts.
//
// Phase 9 step (c) `proveFinalStorageAndDatabaseBaselines` compared the FULL manifest of the live
// application media root against the snapshot frozen at set-001 preflight, byte for byte, including
// every directory row's mtimeNs and size. That assertion is unsatisfiable for any run whose upload
// lands in a yyyy/mm bucket that already existed at preflight: POSIX advances the parent
// directory's mtime when set-030 writes the file and again when cleanup phase 3 unlinks it, and
// nothing may restore it (writing the old timestamps back would falsify the very evidence this
// phase reads). Run ec39365eafa6 spent 34.7 minutes and a forensic session to establish that its
// single differing field was `2026/07` mtimeNs, after having correctly deleted its own media row
// and file. Nothing under executor/self-test/ referenced that assertion at all, which is how a
// physically unsatisfiable postcondition kept green self-test baselines.
//
// This module drives the REAL scanner over a private mkdtemp root - no fakes - performs exactly the
// round trip the smoke performs (write <root>/2026/07/<uuid>.png into a PRE-EXISTING month
// directory, then unlink it) and asserts the comparison phase 9 now uses accepts it, while every
// leak signal is still refused.
//
// MEASURED 2026-07-27, and the reason the real round trip is NOT asserted to move the raw manifest:
// on the overlayfs backing /tmp only 34 of 40 write-then-unlink round trips advanced the parent
// directory's mtimeNs - the timestamp is quantised, so both operations can fall inside one tick. On
// the filesystem carrying core/storage it was 40 of 40. Asserting "the raw manifests differ after a
// real round trip" would therefore be a ~15%-flaky gate, so the raw comparison's refusal is
// asserted on a synthetic single-field drift instead, which is exact and deterministic.
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { invariant } from "../foundation.mjs";
import { readStableArtifactIdentity, sameArtifactIdentity } from "../private-workspace.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { createStorageManifestRuntime } from "../../runtime/storage-manifest.mjs";

const MONTH_DIRECTORY_KEY = "2026/07";
const PRE_EXISTING_FILE_KEY = "2026/07/pre-existing.png";
// The canonical shape of a smoke upload key: yyyy/mm/<uuid>.png, written into the month bucket
// above, which already exists at the baseline.
const UPLOADED_FILE_KEY = "2026/07/11111111-2222-4333-8444-555555555555.png";
const CANONICAL_PNG_BYTES = 68;

function cloneManifest(manifest) {
  return {
    rootIdentity: { ...manifest.rootIdentity },
    rows: manifest.rows.map((row) => ({ ...row })),
  };
}

// Sorted exactly as the scanner sorts, so an added row is detected by its content and never by an
// ordering artefact.
function sortedRows(rows) {
  return [...rows].sort((left, right) => left.key.localeCompare(right.key));
}

function driftField(container, field) {
  const value = container[field];
  invariant(value !== undefined, "self-test manifest field is absent: " + field);
  container[field] = typeof value === "number" ? value + 1 : value + "0";
  return container;
}

function driftRow(key, expectedType, field) {
  return (manifest) => {
    const row = manifest.rows.find((candidate) => candidate.key === key);
    invariant(
      row !== undefined && row.type === expectedType,
      "self-test manifest row is absent: " + key
    );
    driftField(row, field);
    return manifest;
  };
}

function driftRoot(field) {
  return (manifest) => {
    driftField(manifest.rootIdentity, field);
    return manifest;
  };
}

function addRow(key, type) {
  return (manifest) => {
    const template = manifest.rows.find((candidate) => candidate.type === type);
    invariant(template !== undefined, "self-test manifest template row is absent: " + type);
    invariant(
      manifest.rows.every((candidate) => candidate.key !== key),
      "self-test manifest row already exists: " + key
    );
    manifest.rows = sortedRows([...manifest.rows, { ...template, key, ino: template.ino + "0" }]);
    return manifest;
  };
}

function removeRow(key) {
  return (manifest) => {
    const remaining = manifest.rows.filter((candidate) => candidate.key !== key);
    invariant(remaining.length === manifest.rows.length - 1, "self-test manifest row is absent");
    manifest.rows = remaining;
    return manifest;
  };
}

export async function runStorageManifestIdentitySelfTest({ assertNegative }) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "wf540-manifest-")));
  try {
    const {
      projectLeakSensitiveStorageManifest,
      projectStorageManifestEntrySet,
      scanExactLocalStorageManifest,
    } = createStorageManifestRuntime({
      readStableArtifactIdentity,
      // The scanner only needs the canonical storage root; the production resolver reads the same
      // field off the state (runtime/response-lost-registry.mjs responseLostStorageRoot).
      responseLostStorageRoot: (state) => state.storageRootBaseline,
      sameArtifactIdentity,
    });
    const monthDirectory = path.join(root, ...MONTH_DIRECTORY_KEY.split("/"));
    await mkdir(monthDirectory, { recursive: true });
    await writeFile(
      path.join(root, ...PRE_EXISTING_FILE_KEY.split("/")),
      Buffer.alloc(CANONICAL_PNG_BYTES)
    );
    const state = {
      storageRootBaseline: root,
      storageRootRealPath: root,
      storageRootIdentity: await readStableArtifactIdentity(root, { expectedType: "directory" }),
    };
    const baselineManifest = await scanExactLocalStorageManifest(state);
    const baselineProjection = projectLeakSensitiveStorageManifest(baselineManifest);
    const baselineEntrySet = projectStorageManifestEntrySet(baselineProjection);

    // The exact comparison cleanup/final-baselines.mjs performs, in the same order.
    const phase9ComparisonAccepts = (manifest) => {
      const projection = projectLeakSensitiveStorageManifest(manifest);
      return (
        deepEqualJson(projection.rootIdentity, baselineProjection.rootIdentity) &&
        deepEqualJson(projectStorageManifestEntrySet(projection), baselineEntrySet) &&
        deepEqualJson(projection, baselineProjection)
      );
    };
    const refusesBaselineDrift = (mutate) =>
      !phase9ComparisonAccepts(mutate(cloneManifest(baselineManifest)));

    // The round trip set-030-media-upload plus cleanup phase 3 perform, into a PRE-EXISTING month
    // directory - the case the byte-identity assertion could never satisfy.
    const uploaded = path.join(root, ...UPLOADED_FILE_KEY.split("/"));
    await writeFile(uploaded, Buffer.alloc(CANONICAL_PNG_BYTES));
    const leakedManifest = await scanExactLocalStorageManifest(state);
    // A real, on-disk leak of the smoke's own upload: refused, and by the entry-set conjunct, so it
    // names itself. This is the signal the assertion exists for.
    assertNegative(!phase9ComparisonAccepts(leakedManifest), "leaked upload on disk");
    assertNegative(
      !deepEqualJson(
        projectStorageManifestEntrySet(projectLeakSensitiveStorageManifest(leakedManifest)),
        baselineEntrySet
      ),
      "leaked upload entry set"
    );
    await rm(uploaded);
    const finalManifest = await scanExactLocalStorageManifest(state);
    invariant(
      finalManifest.rows.filter((row) => row.type === "file").length === 1 &&
        finalManifest.rows.some((row) => row.key === PRE_EXISTING_FILE_KEY) &&
        finalManifest.rows.every((row) => row.key !== UPLOADED_FILE_KEY),
      "self-test upload round trip did not restore the entry set"
    );
    // THE REGRESSION ASSERTION: before the fix this pair was compared with a raw deepEqualJson over
    // the full manifest and failed on the month directory's mtimeNs alone.
    invariant(
      phase9ComparisonAccepts(finalManifest),
      "clean upload round trip was reported as storage drift"
    );

    // The two POSIX-volatile directory fields are tolerated ON PURPOSE, and the raw comparison the
    // fix replaced provably refused each of them on its own - a single field of a single
    // pre-existing directory row, with nothing else changed.
    for (const field of ["mtimeNs", "size"]) {
      const drifted = driftRow(MONTH_DIRECTORY_KEY, "directory", field)(
        cloneManifest(baselineManifest)
      );
      invariant(
        !deepEqualJson(drifted, baselineManifest),
        "raw storage manifest comparison tolerated a directory " + field + " drift"
      );
      invariant(
        phase9ComparisonAccepts(drifted),
        "directory " + field + " is still asserted by the phase 9 comparison"
      );
    }

    // Every leak class stays refused. A file row keeps all seven fields, so a rewritten, replaced or
    // merely touched file still fails; a directory keeps its identity and mode; the row set stays
    // exact in both directions; and the storage root's own identity stays exact.
    assertNegative(refusesBaselineDrift(addRow("2026/07/leaked.png", "file")), "leaked file row");
    assertNegative(refusesBaselineDrift(removeRow(PRE_EXISTING_FILE_KEY)), "missing file row");
    assertNegative(
      refusesBaselineDrift(driftRow(PRE_EXISTING_FILE_KEY, "file", "mtimeNs")),
      "touched file"
    );
    assertNegative(
      refusesBaselineDrift(driftRow(PRE_EXISTING_FILE_KEY, "file", "size")),
      "rewritten file"
    );
    assertNegative(
      refusesBaselineDrift(driftRow(PRE_EXISTING_FILE_KEY, "file", "ino")),
      "replaced file inode"
    );
    assertNegative(
      refusesBaselineDrift(driftRow(PRE_EXISTING_FILE_KEY, "file", "mode")),
      "rechmodded file"
    );
    assertNegative(
      refusesBaselineDrift(driftRow(MONTH_DIRECTORY_KEY, "directory", "ino")),
      "replaced directory inode"
    );
    assertNegative(
      refusesBaselineDrift(driftRow(MONTH_DIRECTORY_KEY, "directory", "mode")),
      "rechmodded directory"
    );
    assertNegative(refusesBaselineDrift(addRow("2026/08", "directory")), "leaked directory row");
    assertNegative(refusesBaselineDrift(driftRoot("ino")), "replaced storage root");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
