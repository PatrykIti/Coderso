import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { and, asc, gt, inArray, sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "../../../core/db/client";
import {
  contentTaxonomies,
  contentTerms,
  contentTypes,
  pages,
  postPreviewTokens,
  postTermAssignments,
  posts,
  redirects,
} from "../../../core/db/schema";
import {
  ARCHIVE_ARTIFACT_VERSION,
  ARCHIVE_ENGINE_VERSION,
  ARCHIVE_SCHEMA_VERSION,
  ARCHIVE_TABLE_DESCRIPTORS,
  MANIFEST_MEMBER_NAME,
  TABLE_MEMBER_DIR,
  packDatabaseArchive,
  packBackupArchive,
  streamTableRows,
  type ArchiveManifest,
} from "../../../core/services/backups/backupArchive";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

// A runBatch seam scoped to the run's seeded ids: ANDs `inArray(cols[pk], ids)`
// onto the cursor `where` so ONLY the seeded rows are paged (the shared REMOTE DB
// holds ambient rows in every snapshot table — an exact count/call assertion
// must never page those). Preserves the engine's cursor semantics for both the
// single-column PK and the composite junction PKs.
const scopedRunBatch =
  (ids: string[]) =>
  async (
    desc: { key: string; table: PgTable; cursor: string[] },
    cols: Record<string, AnyColumn>,
    cursor: unknown[] | null,
    batchSize: number
  ) => {
    const pk = cols[desc.cursor[0]];
    const idFilter = inArray(pk, ids);
    let where: SQL | undefined;
    if (cursor !== null) {
      if (desc.cursor.length === 1) {
        where = gt(pk, cursor[0]);
      } else {
        const lhs = sql.join(
          desc.cursor.map((c) => sql`${cols[c]}`),
          sql`, `
        );
        const rhs = sql.join(
          cursor.map((v) => sql`${v}`),
          sql`, `
        );
        where = sql`(${lhs}) > (${rhs})`;
      }
    }
    where = where ? and(where, idFilter) : idFilter;
    const orderCols = desc.cursor.map((c) => asc(cols[c])) as never[];
    return db
      .select()
      .from(desc.table)
      .where(where)
      .orderBy(...orderCols)
      .limit(batchSize);
  };

// A pure in-memory runBatch (no DB): serves exactly `rows` in order, counting
// calls, so keyset math + streaming can be asserted deterministically.
const fakeRunBatch = (rows: Array<Record<string, unknown>>) => {
  const calls: number[] = [];
  const fn = async (
    _desc: unknown,
    _cols: unknown,
    cursor: unknown[] | null,
    batchSize: number
  ) => {
    calls.push(calls.length + 1);
    if (cursor === null) return rows.slice(0, batchSize);
    const last = cursor[0];
    const idx = rows.findIndex((r) => r.id === last);
    return rows.slice(idx + 1, idx + 1 + batchSize);
  };
  return { calls, fn };
};

async function drain(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

type TarEntry = { name: string; size: number; bytes: Buffer };

function readTar(data: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break; // EOF zero block
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    if (!name) break;
    const size = parseInt(header.subarray(124, 135).toString("utf8").trim(), 8) || 0;
    const bodyStart = offset + 512;
    const body = data.subarray(bodyStart, bodyStart + size);
    entries.push({ name, size, bytes: Buffer.from(body) });
    offset = bodyStart + size + ((512 - (size % 512)) % 512);
  }
  return entries;
}

function parseNdjson(bytes: Buffer): Array<Record<string, unknown>> {
  return bytes
    .toString("utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

// Recompute the ustar checksum over a header (zeroing the checksum field first)
// and compare with the recorded octal value (read from the ORIGINAL header).
function tarChecksumValid(header: Buffer): boolean {
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  let sum = 0;
  for (const b of copy) sum += b;
  const recordedField = header.subarray(148, 156).toString("utf8").replace(/\0.*$/, "").trim();
  const recorded = parseInt(recordedField, 8);
  return recorded === sum;
}

const tmpDirs: string[] = [];
const seededPages: string[] = [];
const seededRedirects: string[] = [];
const seededPosts: string[] = [];
const seededContentTypes: string[] = [];
const seededTaxonomies: string[] = [];
const seededTerms: string[] = [];
const seededPreviewTokens: string[] = [];
const seededPostTermAssignments: Array<{ postId: string; termId: string }> = [];

let tmpRoot: string;

beforeAll(async () => {
  tmpRoot = await mkdtemp(path.join(os.tmpdir(), "t511-01-"));
  process.env.BACKUP_TMP_DIR = tmpRoot;
});

afterAll(async () => {
  delete process.env.BACKUP_TMP_DIR;
  for (const dir of tmpDirs) await rm(dir, { recursive: true, force: true });
  await rm(tmpRoot, { recursive: true, force: true });
});

afterEach(async () => {
  for (const dir of tmpDirs) await rm(dir, { recursive: true, force: true });
  tmpDirs.length = 0;
  if (!hasDb) return;
  if (seededPostTermAssignments.length) {
    await db.delete(postTermAssignments).where(
      inArray(
        postTermAssignments.postId,
        seededPostTermAssignments.map((r) => r.postId)
      )
    );
  }
  if (seededPreviewTokens.length) {
    await db.delete(postPreviewTokens).where(inArray(postPreviewTokens.id, seededPreviewTokens));
  }
  if (seededTerms.length) {
    await db.delete(contentTerms).where(inArray(contentTerms.id, seededTerms));
  }
  if (seededTaxonomies.length) {
    await db.delete(contentTaxonomies).where(inArray(contentTaxonomies.id, seededTaxonomies));
  }
  if (seededContentTypes.length) {
    await db.delete(contentTypes).where(inArray(contentTypes.id, seededContentTypes));
  }
  if (seededPosts.length) {
    await db.delete(posts).where(inArray(posts.id, seededPosts));
  }
  if (seededRedirects.length) {
    await db.delete(redirects).where(inArray(redirects.id, seededRedirects));
  }
  if (seededPages.length) {
    await db.delete(pages).where(inArray(pages.id, seededPages));
  }
  seededPages.length = 0;
  seededRedirects.length = 0;
  seededPosts.length = 0;
  seededContentTypes.length = 0;
  seededTaxonomies.length = 0;
  seededTerms.length = 0;
  seededPreviewTokens.length = 0;
  seededPostTermAssignments.length = 0;
});

const marker = () => `t511-01-${randomUUID()}`;

// ---------------------------------------------------------------------------
// 1. Round-trip integrity (seeded rows → export → untar → verify)
// ---------------------------------------------------------------------------

testIfDb("round-trip integrity: manifest first, checksums, counts, rows", async () => {
  const run = marker();
  const [page] = await db
    .insert(pages)
    .values({ slug: `${run}-page`, title: "P", currentData: { blocks: [] } })
    .returning();
  seededPages.push(page.id);
  const [redir] = await db
    .insert(redirects)
    .values({ fromPath: `/${run}-from`, toPath: `/${run}-to`, statusCode: 302, enabled: false })
    .returning();
  seededRedirects.push(redir.id);
  const [post] = await db
    .insert(posts)
    .values({ slug: `${run}-post`, title: "Post", data: { body: "x" } })
    .returning();
  seededPosts.push(post.id);
  const [ctype] = await db
    .insert(contentTypes)
    .values({ name: `${run}-type`, slug: `${run}-type`, schema: { fields: [] } })
    .returning();
  seededContentTypes.push(ctype.id);
  const [tax] = await db
    .insert(contentTaxonomies)
    .values({ typeId: ctype.id, name: `${run}-tax`, slug: `${run}-tax`, kind: "tag" })
    .returning();
  seededTaxonomies.push(tax.id);
  const [term] = await db
    .insert(contentTerms)
    .values({ taxonomyId: tax.id, name: `${run}-term`, slug: `${run}-term` })
    .returning();
  seededTerms.push(term.id);
  const [assignment] = await db
    .insert(postTermAssignments)
    .values({ postId: post.id, termId: term.id })
    .returning();
  seededPostTermAssignments.push({ postId: post.id, termId: term.id });

  const ids = [...seededPages, ...seededRedirects, ...seededPosts, ...seededContentTypes];
  const tmpDir = path.join(tmpRoot, `roundtrip-${randomUUID()}`);
  const packed = await packDatabaseArchive({
    include: ["database"],
    tmpDir,
    runBatch: scopedRunBatch(ids),
  });
  const bytes = await drain(packed.stream);
  const entries = readTar(bytes);

  // manifest.json is the FIRST member
  expect(entries[0].name).toBe(MANIFEST_MEMBER_NAME);
  const manifest = JSON.parse(entries[0].bytes.toString("utf8")) as ArchiveManifest;
  expect(manifest.artifactVersion).toBe(2);
  expect(manifest.include).toEqual(["database"]);

  // per-seeded-table member checksums + counts match the manifest
  const byName = new Map(entries.map((e) => [e.name, e]));
  for (const t of manifest.tables) {
    const member = byName.get(t.member);
    expect(member, `member ${t.member}`).toBeDefined();
    const hash = createHash("sha256").update(member!.bytes).digest("hex");
    expect(hash).toBe(t.sha256);
    expect(member!.bytes.length).toBe(t.byteSize);
    expect(parseNdjson(member!.bytes).length).toBe(t.rowCount);
  }

  // seeded rows present + field-equal (Date→ISO tolerated via JSON round-trip)
  const pageRows = parseNdjson(byName.get(`${TABLE_MEMBER_DIR}/pages.ndjson`)!.bytes);
  expect(pageRows.find((r) => r.id === page.id)).toEqual(JSON.parse(JSON.stringify(page)));
  const redirRows = parseNdjson(byName.get(`${TABLE_MEMBER_DIR}/redirects.ndjson`)!.bytes);
  expect(redirRows.find((r) => r.id === redir.id)).toEqual(JSON.parse(JSON.stringify(redir)));
  const junctionRows = parseNdjson(
    byName.get(`${TABLE_MEMBER_DIR}/postTermAssignments.ndjson`)!.bytes
  );
  expect(junctionRows.find((r) => r.postId === post.id && r.termId === term.id)).toEqual(
    JSON.parse(JSON.stringify(assignment))
  );

  await packed.cleanup();
  await expect(stat(tmpDir)).rejects.toThrow();
});

// ---------------------------------------------------------------------------
// 2. Keyset across batch boundaries — every seeded id exactly once, no dupes
// ---------------------------------------------------------------------------

testIfDb(
  "keyset pagination visits every seeded row exactly once (single + composite cursor)",
  async () => {
    const run = marker();
    const redirectIds: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const [row] = await db
        .insert(redirects)
        .values({ fromPath: `/${run}-${i}`, toPath: `/${run}-dest` })
        .returning();
      redirectIds.push(row.id);
    }
    seededRedirects.push(...redirectIds);

    const termIds: string[] = [];
    const [ctype] = await db
      .insert(contentTypes)
      .values({ name: `${run}-t2`, slug: `${run}-t2`, schema: {} })
      .returning();
    seededContentTypes.push(ctype.id);
    const [tax] = await db
      .insert(contentTaxonomies)
      .values({ typeId: ctype.id, name: `${run}-tax2`, slug: `${run}-tax2`, kind: "tag" })
      .returning();
    seededTaxonomies.push(tax.id);
    for (let i = 0; i < 4; i += 1) {
      const [term] = await db
        .insert(contentTerms)
        .values({ taxonomyId: tax.id, name: `${run}-term-${i}`, slug: `${run}-term-${i}` })
        .returning();
      termIds.push(term.id);
    }
    seededTerms.push(...termIds);
    const [post] = await db
      .insert(posts)
      .values({ slug: `${run}-p`, title: "P" })
      .returning();
    seededPosts.push(post.id);
    const pairs: Array<{ postId: string; termId: string }> = [];
    for (const termId of termIds) {
      await db.insert(postTermAssignments).values({ postId: post.id, termId });
      pairs.push({ postId: post.id, termId });
    }
    seededPostTermAssignments.push(...pairs);

    const tmpDir = path.join(tmpRoot, `keyset-${randomUUID()}`);
    const packed = await packDatabaseArchive({
      include: ["database"],
      batchSize: 3,
      tmpDir,
      runBatch: scopedRunBatch([...redirectIds, post.id]),
    });
    const bytes = await drain(packed.stream);
    const entries = readTar(bytes);
    const byName = new Map(entries.map((e) => [e.name, e]));

    // single-column cursor: 7 rows, every id exactly once, ascending
    const redirectRows = parseNdjson(byName.get(`${TABLE_MEMBER_DIR}/redirects.ndjson`)!.bytes);
    expect(redirectRows.map((r) => r.id as string)).toEqual([...redirectIds].sort());
    const seen = new Set(redirectRows.map((r) => r.id as string));
    expect(seen.size).toBe(redirectIds.length);

    // composite junction crossing a batch boundary: every pair exactly once
    const junctionRows = parseNdjson(
      byName.get(`${TABLE_MEMBER_DIR}/postTermAssignments.ndjson`)!.bytes
    );
    const seenPairs = new Set(junctionRows.map((r) => `${r.postId}:${r.termId}`));
    expect(seenPairs.size).toBe(pairs.length);
    for (const p of pairs) expect(seenPairs.has(`${p.postId}:${p.termId}`)).toBe(true);

    await packed.cleanup();
  }
);

// ---------------------------------------------------------------------------
// 3. Empty member engine property (no DB) + real-DB member existence
// ---------------------------------------------------------------------------

test("empty runBatch still emits a member per descriptor (rowCount 0, sha256 of empty)", async () => {
  const tmpDir = path.join(tmpRoot, `empty-${randomUUID()}`);
  const packed = await packDatabaseArchive({
    include: ["database"],
    tmpDir,
    runBatch: async () => [],
  });
  const bytes = await drain(packed.stream);
  const entries = readTar(bytes);
  const manifest = JSON.parse(entries[0].bytes.toString("utf8")) as ArchiveManifest;
  expect(manifest.tables.length).toBe(ARCHIVE_TABLE_DESCRIPTORS.length);
  const emptyHash = createHash("sha256").digest("hex");
  for (const t of manifest.tables) {
    const member = entries.find((e) => e.name === t.member);
    expect(member, `member ${t.member}`).toBeDefined();
    expect(t.rowCount).toBe(0);
    expect(t.byteSize).toBe(0);
    expect(t.sha256).toBe(emptyHash);
  }
  await packed.cleanup();
});

testIfDb(
  "real DB: manifest lists a member for all 22 descriptors (member existence only)",
  async () => {
    const tmpDir = path.join(tmpRoot, `allmembers-${randomUUID()}`);
    // Scoped to a non-existent id so the run is fast, but every descriptor still
    // emits its member (empty or ambient-independent).
    const packed = await packDatabaseArchive({
      include: ["database"],
      tmpDir,
      runBatch: scopedRunBatch([randomUUID()]),
    });
    const bytes = await drain(packed.stream);
    const entries = readTar(bytes);
    const manifest = JSON.parse(entries[0].bytes.toString("utf8")) as ArchiveManifest;
    const keys = new Set(manifest.tables.map((t) => t.key));
    expect(keys.size).toBe(22);
    for (const desc of ARCHIVE_TABLE_DESCRIPTORS) expect(keys.has(desc.key)).toBe(true);
    await packed.cleanup();
  }
);

// ---------------------------------------------------------------------------
// 4. Streaming assertion — pure keyset math, no DB
// ---------------------------------------------------------------------------

test("streamTableRows pages in bounded batches (call-count formula, no DB)", async () => {
  const rows6 = Array.from({ length: 6 }, (_, i) => ({ id: `id-${i + 1}` }));
  const fake6 = fakeRunBatch(rows6);
  const collected6: Array<Record<string, unknown>> = [];
  for await (const row of streamTableRows(
    { key: "redirects", table: redirects, cursor: ["id"] },
    3,
    fake6.fn as never
  )) {
    collected6.push(row);
  }
  expect(collected6.length).toBe(6);
  expect(fake6.calls.length).toBe(6 / 3 + 1); // two full pages + one empty page

  const rows7 = Array.from({ length: 7 }, (_, i) => ({ id: `id-${i + 1}` }));
  const fake7 = fakeRunBatch(rows7);
  const collected7: Array<Record<string, unknown>> = [];
  for await (const row of streamTableRows(
    { key: "redirects", table: redirects, cursor: ["id"] },
    3,
    fake7.fn as never
  )) {
    collected7.push(row);
  }
  expect(collected7.length).toBe(7);
  expect(fake7.calls.length).toBe(Math.ceil(7 / 3));

  const fake0 = fakeRunBatch([]);
  const collected0: Array<Record<string, unknown>> = [];
  for await (const row of streamTableRows(
    { key: "redirects", table: redirects, cursor: ["id"] },
    3,
    fake0.fn as never
  )) {
    collected0.push(row);
  }
  expect(collected0.length).toBe(0);
  expect(fake0.calls.length).toBe(1);
});

// ---------------------------------------------------------------------------
// 5. Manifest contract
// ---------------------------------------------------------------------------

test("manifest contract: versions, include echo, member names", async () => {
  const tmpDir = path.join(tmpRoot, `manifest-${randomUUID()}`);
  const packed = await packBackupArchive({
    include: ["database"],
    tmpDir,
    runBatch: async () => [],
  });
  expect(packed.manifest.artifactVersion).toBe(ARCHIVE_ARTIFACT_VERSION);
  expect(packed.manifest.schemaVersion).toBe(ARCHIVE_SCHEMA_VERSION);
  expect(packed.manifest.engineVersion).toBe(ARCHIVE_ENGINE_VERSION);
  expect(packed.manifest.include).toEqual(["database"]);
  expect(packed.manifest.tables.every((t) => t.member.startsWith(`${TABLE_MEMBER_DIR}/`))).toBe(
    true
  );
  const bytes = await drain(packed.stream);
  const entries = readTar(bytes);
  const manifest = JSON.parse(entries[0].bytes.toString("utf8")) as ArchiveManifest;
  expect(manifest.artifactVersion).toBe(2);
  expect(manifest.schemaVersion).toBe(1);
  await packed.cleanup();
});

// ---------------------------------------------------------------------------
// 6. Drift guard — descriptors stay in lock-step with 484's snapshot set
// ---------------------------------------------------------------------------

test("drift guard: 22 descriptors, order matches snapshotTableOrder, composite cursors", () => {
  const expectedKeys = [
    "pages",
    "contentTypes",
    "media",
    "menus",
    "themeProfiles",
    "redirects",
    "contentEntries",
    "posts",
    "menuItems",
    "themeRoutes",
    "pageRevisions",
    "detailPageDocuments",
    "customScreens",
    "contentTaxonomies",
    "detailPageRevisions",
    "contentTerms",
    "contentRevisions",
    "customScreenEntryPresentationOverrides",
    "postRevisions",
    "postPreviewTokens",
    "contentTermAssignments",
    "postTermAssignments",
  ];
  expect(ARCHIVE_TABLE_DESCRIPTORS.length).toBe(22);
  expect(ARCHIVE_TABLE_DESCRIPTORS.map((d) => d.key)).toEqual(expectedKeys);
  const composite = ARCHIVE_TABLE_DESCRIPTORS.filter((d) => d.cursor.length > 1);
  expect(composite.map((d) => [d.key, d.cursor])).toEqual([
    ["customScreenEntryPresentationOverrides", ["screenId", "entryId", "blockId", "propPath"]],
    ["contentTermAssignments", ["entryId", "termId"]],
    ["postTermAssignments", ["postId", "termId"]],
  ]);
});

// ---------------------------------------------------------------------------
// 7. Cleanup — temp spool removed, idempotent
// ---------------------------------------------------------------------------

test("cleanup removes the spool dir and is idempotent", async () => {
  const tmpDir = path.join(tmpRoot, `cleanup-${randomUUID()}`);
  const packed = await packDatabaseArchive({
    include: ["database"],
    tmpDir,
    runBatch: async () => [],
  });
  await drain(packed.stream);
  await stat(tmpDir); // spool still present until cleanup
  await packed.cleanup();
  await expect(stat(tmpDir)).rejects.toThrow();
  await packed.cleanup(); // idempotent — no throw
});

// ---------------------------------------------------------------------------
// 8. Tar structural validity
// ---------------------------------------------------------------------------

test("tar structure: 512-byte headers, valid checksums, padded bodies, EOF zero blocks", async () => {
  const tmpDir = path.join(tmpRoot, `tar-${randomUUID()}`);
  const packed = await packBackupArchive({
    include: ["database"],
    tmpDir,
    runBatch: async () => [],
  });
  const bytes = await drain(packed.stream);
  // Header checksums valid for every member; bodies padded to 512 boundary.
  let offset = 0;
  let memberCount = 0;
  for (;;) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) {
      // EOF = two consecutive zero blocks
      expect(bytes.subarray(offset + 512, offset + 1024).every((b) => b === 0)).toBe(true);
      break;
    }
    expect(header.length).toBe(512);
    expect(tarChecksumValid(header)).toBe(true);
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const size = parseInt(header.subarray(124, 135).toString("utf8").trim(), 8) || 0;
    memberCount += 1;
    const bodyStart = offset + 512;
    const bodyEnd = bodyStart + size;
    const paddedEnd = bodyEnd + ((512 - (size % 512)) % 512);
    expect(paddedEnd % 512).toBe(0);
    // padding bytes are NUL
    for (const b of bytes.subarray(bodyEnd, paddedEnd)) expect(b).toBe(0);
    offset = paddedEnd;
  }
  expect(memberCount).toBe(ARCHIVE_TABLE_DESCRIPTORS.length + 1); // manifest + 22 tables
  await packed.cleanup();
});
