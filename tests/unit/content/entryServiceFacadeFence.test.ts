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
