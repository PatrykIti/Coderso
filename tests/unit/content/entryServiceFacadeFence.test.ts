import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../../${relativePath}`, import.meta.url), "utf8");

const facade = readSource("core/services/content/entryService.ts");
const duplication = readSource("core/services/content/entryDuplicationService.ts");
const reads = readSource("core/services/content/entryReadService.ts");

const functionBody = (source: string, name: string) => {
  const start = source.indexOf(`export async function ${name}(`);
  if (start < 0) throw new Error(`missing_function:${name}`);
  const next = source.indexOf("\nexport ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
};

test("entry facade preserves the public read, duplicate, and DTO export surface", () => {
  for (const name of [
    "duplicateEntry",
    "getEntry",
    "getEntryBySlug",
    "listEntries",
    "listEntriesForListing",
    "listEntriesWithContentTypes",
    "listEntryRevisions",
  ]) {
    expect(facade).toContain(name);
  }
  for (const name of [
    "CreateEntryInput",
    "EntryData",
    "EntryDetail",
    "EntryListItem",
    "EntrySeo",
    "EntryStatus",
    "EntryVisibility",
    "UpdateEntryInput",
    "UpdateEntryMetadataInput",
  ]) {
    expect(facade).toContain(name);
  }
  expect(reads).not.toContain(".insert(");
  expect(reads).not.toContain(".update(");
  expect(reads).not.toContain(".delete(");
});

test("every transaction-owning entry mutation acquires the shared fence first", () => {
  const directFencePattern =
    /(?:runEntryTransaction|entryMutationDeps\.transaction)\(async \(tx\) => \{\n\s+await (?:acquireNativeCmsWriterFence|entryMutationDeps\.acquireFence)\(tx\);/;
  for (const name of [
    "deleteEntry",
    "createEntry",
    "updateEntry",
    "publishEntry",
    "unpublishEntry",
    "createEntryRevision",
    "restoreEntryRevision",
    "createEntryPreview",
  ]) {
    expect(functionBody(facade, name), name).toMatch(directFencePattern);
  }
  expect(functionBody(facade, "coordinateEntryMetadataMutation")).toMatch(
    /deps\.transaction\(async \(tx\) => \{\n\s+await deps\.acquireFence\(tx\);/
  );
  expect(functionBody(duplication, "duplicateEntry")).toMatch(
    /db\.transaction\(\s*async \(tx\) => \{\s*await acquireNativeCmsWriterFence\(tx\);/
  );
  expect(facade).toContain('isolationLevel: "read committed"');
  expect(duplication).toContain('isolationLevel: "read committed"');
});

test("entry Tx helpers do not open nested transactions or fences", () => {
  const revisionTx = functionBody(facade, "createEntryRevisionTx");
  expect(revisionTx).not.toContain(".transaction(");
  expect(revisionTx).not.toContain("acquireNativeCmsWriterFence");
  expect(functionBody(facade, "updateEntryMetadataForRoute")).toContain(
    "coordinateEntryMetadataMutation(entryMutationDeps"
  );
  expect(functionBody(facade, "updateEntryMetadata")).toContain(
    "coordinateEntryMetadataMutation(entryMutationDeps"
  );
});

test("ordinary entry delete remains one fenced root delete so schema cascades stay authoritative", () => {
  const remove = functionBody(facade, "deleteEntry");
  expect(remove.match(/\.delete\(/g)).toHaveLength(1);
  expect(remove).toContain(".delete(contentEntries)");
  expect(remove).not.toContain("contentRevisions");
  expect(remove).not.toContain("contentTermAssignments");
});

test("restoreEntryRevision is one fenced transaction and never re-enters updateEntry", () => {
  const restore = functionBody(facade, "restoreEntryRevision");
  // The restore reads the entry FOR UPDATE, snapshots and writes inside the
  // same transaction; it must not delegate to the separate `updateEntry` flow
  // (that would reopen the lost-update window) or to `createEntryRevision`.
  expect(restore).toContain('.for("update")');
  expect(restore).toContain("createEntryRevisionTx(tx,");
  expect(restore).not.toContain("updateEntry(");
  expect(restore).not.toContain("createEntryRevision(");
  expect(restore).not.toContain("listEntryRevisions(");
  expect(restore).toContain("applyEntryPostCommitCache(entryMutationDeps");
  expect(restore).toContain("areRevisionSnapshotsEqual(");
});

test("revision list query selects no data payload columns", () => {
  const list = functionBody(reads, "listEntryRevisions");
  expect(list).toContain("contentRevisions.version");
  expect(list).not.toContain("contentRevisions.data");
  expect(list).not.toContain("data: contentRevisions.data");
  // The detail read is the ONLY revision query that loads the payload body.
  const detail = functionBody(reads, "getEntryRevisionData");
  expect(detail).toContain("contentRevisions.data");
});

test("revision version allocation is bounded by the unique constraint retry", () => {
  const revisionTx = functionBody(facade, "createEntryRevisionTx");
  expect(revisionTx).toContain("onConflictDoNothing");
  expect(revisionTx).toContain("MAX_REVISION_VERSION_ATTEMPTS");
  expect(revisionTx).toContain('throw new Error("revision_conflict")');
});
