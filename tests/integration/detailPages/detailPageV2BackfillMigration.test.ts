// TASK-580-03-L03: integration proof for the 0079 detail-page v2 backfill
// migration (core/db/migrations/0080_detail_page_v2_backfill.sql).
//
// This suite executes the migration's three CREATE FUNCTION chunks against a
// dedicated throwaway schema, seeds v1 fixture documents, and proves:
//   - byte-for-byte parity between the SQL conversion and the canonical TS
//     conversion (tests/fixtures/detailPageV2Conversion/*.json, TASK-580-03-L02),
//   - dropped navigation/footer/dangling bindings,
//   - byte-identical legacy-widget placeholder data,
//   - NULL published_document stays NULL and a pre-existing v2 document is
//     untouched by the WHERE guard (idempotent second run affects 0 rows),
//   - every converted document passes normalizeDetailPageDocumentForWrite.
//
// The migration UPDATE is exercised only against a temporary
// `detail_page_documents` table in the throwaway schema; the shared `public`
// schema and any real rows are never touched. The suite skips cleanly when
// DATABASE_URL / DATABASE_DIRECT_URL are unavailable.
//
// Fixture envelopes are read directly from disk by filename; no v1 JSON
// literals are pasted into this file.

import { afterAll, beforeAll, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";

import { normalizeDetailPageDocumentForWrite } from "../../../core/services/content/detailPageSchema";

const repoRoot = resolve(import.meta.dir, "../../..");
const fixtureDir = join(repoRoot, "tests/fixtures/detailPageV2Conversion");
const migrationPath = join(repoRoot, "core/db/migrations/0080_detail_page_v2_backfill.sql");

const dbUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
const testIfDb = dbUrl ? test : test.skip;

// Widget types the L02 map converts to typed V2 sections. Everything else
// becomes a `custom` section with one `legacy-widget` block, except
// navigation/footer which are dropped by the site-shell rule.
const MAPPED_TYPES = new Set([
  "hero",
  "timeline",
  "faq-accordion",
  "cta-banner",
  "feature-grid",
  "testimonials",
  "gallery-mosaic",
  "grid-columns",
  "rich-text-section",
  "divider",
  "spacer",
  "content-list",
  "posts-feed",
  "listing-filters",
  "entry-teaser",
  "form-embed",
  "contact",
  "newsletter",
]);
const DROPPED_TYPES = new Set(["navigation", "footer"]);

interface FixtureEnvelope {
  case: string;
  v1: Record<string, unknown>;
  expected: Record<string, unknown>;
  dropped: Array<{ bindingId: string; reason: string }>;
}

let sql: ReturnType<typeof postgres> | null = null;
let schemaName = "";

const readFixture = (name: string): FixtureEnvelope =>
  JSON.parse(readFileSync(join(fixtureDir, `${name}.json`), "utf8"));

const fixtureNames = (): string[] =>
  (
    JSON.parse(readFileSync(join(fixtureDir, "index.json"), "utf8")) as {
      cases: string[];
    }
  ).cases;

// Recursive key-sort so JSONB output (order-insensitive) and the JS fixture
// expected value compare structurally.
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record)
        .map(([k, v]) => [k, canonicalize(v)] as const)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
  }
  return value;
};

// postgres.js serializes JS objects to jsonb parameters directly; passing a
// pre-encoded string would double-encode it as a jsonb string. Fixture values
// are parsed JSON, so the cast to the helper's parameter contract is sound.
const asJsonB = (value: unknown): postgres.ParameterOrJSON<never> =>
  value as postgres.ParameterOrJSON<never>;

const convertFixture = async (v1: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const rows = await sql!.unsafe(`select "_coderso_detail_page_document_v2"($1::jsonb) as "out"`, [
    asJsonB(v1),
  ]);
  return rows[0].out as Record<string, unknown>;
};

const legacyBlockData = (
  v1Blocks: Array<Record<string, unknown>>,
  expected: Record<string, unknown>
): Array<{ v1Data: string; legacyData: string }> => {
  const pairs: Array<{ v1Data: string; legacyData: string }> = [];
  const sections = expected.sections as Array<{
    id: string;
    type: string;
    blocks: Array<Record<string, unknown>>;
  }>;
  for (const block of v1Blocks) {
    const type = block.type as string;
    if (MAPPED_TYPES.has(type) || DROPPED_TYPES.has(type)) continue;
    // A custom section carries the original block id and one legacy-widget
    // block whose id is `<blockId>-legacy` with byte-identical `props.data`.
    const owner = sections.find((s) =>
      s.blocks.some((b) => b.type === "legacy-widget" && b.id === `${block.id}-legacy`)
    );
    if (!owner) continue;
    const legacy = owner.blocks.find(
      (b) => b.type === "legacy-widget" && b.id === `${block.id}-legacy`
    );
    if (!legacy) continue;
    const props = legacy.props as Record<string, unknown>;
    const data = props.data;
    if (data === undefined) continue;
    pairs.push({
      v1Data: JSON.stringify(block.data),
      legacyData: JSON.stringify(data),
    });
  }
  return pairs;
};

beforeAll(async () => {
  if (!dbUrl) return;
  sql = postgres(dbUrl, { max: 1 });
  schemaName = `l03_backfill_${Date.now()}`;
  await sql.unsafe(`create schema "${schemaName}"`);
  await sql.unsafe(`set search_path to "${schemaName}", public`);
  const migration = readFileSync(migrationPath, "utf8");
  const chunks = migration
    .split("--> statement-breakpoint")
    .map((c) => c.trim())
    .filter(Boolean);
  // Chunks 1-3 are the three CREATE FUNCTION statements; chunk 4 is the
  // UPDATE; chunks 5-7 are the DROPs (skipped so the functions stay alive).
  const functionChunks = chunks.slice(0, 3);
  for (const chunk of functionChunks) {
    await sql.unsafe(chunk);
  }
});

afterAll(async () => {
  if (!sql) return;
  await sql.unsafe(`drop schema if exists "${schemaName}" cascade`).catch(() => undefined);
  await sql.end().catch(() => undefined);
});

testIfDb(
  "SQL backfill converts every fixture byte-for-byte identically to the TS map",
  async () => {
    for (const name of fixtureNames()) {
      const fixture = readFixture(name);
      const out = await convertFixture(fixture.v1);
      expect(JSON.stringify(canonicalize(out)), `${name}: document parity`).toEqual(
        JSON.stringify(canonicalize(fixture.expected))
      );
    }
  }
);

testIfDb(
  "navigation/footer and dangling bindings are dropped, surviving bindings remap",
  async () => {
    for (const name of fixtureNames()) {
      const fixture = readFixture(name);
      const out = await convertFixture(fixture.v1);
      const outBindings = out.bindings as Array<Record<string, unknown>>;
      const outSections = out.sections as Array<Record<string, unknown>>;

      for (const dropped of fixture.dropped) {
        expect(
          outBindings.some((b) => b.id === dropped.bindingId),
          `${name}: dropped binding ${dropped.bindingId}`
        ).toBe(false);
      }

      const v1Blocks = fixture.v1.blocks as Array<Record<string, unknown>>;
      for (const block of v1Blocks) {
        const type = block.type as string;
        if (!DROPPED_TYPES.has(type)) continue;
        expect(
          outSections.some((s) => s.id === block.id),
          `${name}: dropped block ${block.id}`
        ).toBe(false);
        expect(
          outBindings.some((b) => b.blockId === block.id),
          `${name}: dropped block binding ${block.id}`
        ).toBe(false);
      }

      // Every surviving binding must resolve against a real section block id.
      const knownBlockIds = new Set<string>();
      const collectIds = (blocks: Array<Record<string, unknown>>) => {
        for (const block of blocks) {
          knownBlockIds.add(block.id as string);
          if (Array.isArray(block.slots)) collectIds(block.slots);
          if (Array.isArray(block.children)) collectIds(block.children);
        }
      };
      for (const section of outSections) {
        collectIds((section.blocks as Array<Record<string, unknown>>) ?? []);
      }
      for (const binding of outBindings) {
        expect(
          knownBlockIds.has(binding.blockId as string),
          `${name}: binding ${binding.id} resolves to ${binding.blockId}`
        ).toBe(true);
      }
    }
  }
);

testIfDb("legacy-widget placeholder data survives byte-identically", async () => {
  const fixture = readFixture("one-of-each-placeholder");
  const out = await convertFixture(fixture.v1);
  const pairs = legacyBlockData(fixture.v1.blocks as Array<Record<string, unknown>>, out);
  expect(pairs.length).toBeGreaterThan(0);
  for (const pair of pairs) {
    expect(pair.legacyData).toEqual(pair.v1Data);
  }
});

testIfDb("UPDATE converts v1 rows, keeps NULL published_document, and is idempotent", async () => {
  const migration = readFileSync(migrationPath, "utf8");
  const chunks = migration
    .split("--> statement-breakpoint")
    .map((c) => c.trim())
    .filter(Boolean);
  const updateChunk = chunks[3];

  await sql!.unsafe(`
      create table "detail_page_documents" (
        "id" uuid primary key default gen_random_uuid(),
        "current_document" jsonb not null,
        "published_document" jsonb
      )
    `);

  const project = readFixture("project-detail");
  const navFooter = readFixture("navigation-footer-drop");

  // Row 1: v1 current + NULL published (must stay NULL).
  // Row 2: v1 current + v1 published (both must convert).
  // Row 3: already-v2 current + NULL published (guard must skip it).
  await sql!.unsafe(
    `insert into "detail_page_documents" ("current_document", "published_document")
       values ($1::jsonb, null), ($2::jsonb, $2::jsonb), ($3::jsonb, null)`,
    [asJsonB(project.v1), asJsonB(navFooter.v1), asJsonB(project.expected)]
  );

  const rows = await sql!.unsafe(
    `select "id", "current_document", "published_document"
       from "detail_page_documents" order by "id"`
  );
  const publishedBefore: Record<string, unknown> = {};
  const currentBefore: Record<string, unknown> = {};
  for (const row of rows) {
    publishedBefore[row.id as string] = row.published_document;
    currentBefore[row.id as string] = row.current_document;
  }

  const first = await sql!.unsafe(updateChunk);
  // Row 3 is already v2, so the WHERE guard skips it: only rows 1-2 convert.
  expect(first.count).toBe(2);

  const afterFirst = await sql!.unsafe(
    `select "id", "current_document", "published_document"
       from "detail_page_documents" order by "id"`
  );
  for (const row of afterFirst) {
    const beforePublished = publishedBefore[row.id as string];
    const beforeCurrent = currentBefore[row.id as string];
    if (beforeCurrent && String((beforeCurrent as any)?.schemaVersion) === "2") {
      // Guard-skipped v2 row: byte-identical, published stays NULL.
      expect(JSON.stringify(row.current_document)).toEqual(JSON.stringify(beforeCurrent));
      expect(row.published_document).toBeNull();
      continue;
    }
    expect(JSON.stringify(canonicalize(row.current_document))).toEqual(
      JSON.stringify(canonicalize(fixtureFor(beforeCurrent).expected))
    );
    if (beforePublished === null) {
      expect(row.published_document).toBeNull();
    } else {
      expect(JSON.stringify(canonicalize(row.published_document))).toEqual(
        JSON.stringify(canonicalize(fixtureFor(beforePublished).expected))
      );
    }
  }

  // Second run is a no-op: every row now has schemaVersion 2.
  const second = await sql!.unsafe(updateChunk);
  expect(second.count).toBe(0);
});

// Maps a seeded v1 current/published document back to the fixture whose v1
// envelope it matches, so the UPDATE assertions can use the same corpus.
const fixtureFor = (doc: unknown): FixtureEnvelope => {
  const needle = canonicalize(doc);
  for (const name of fixtureNames()) {
    const fixture = readFixture(name);
    if (JSON.stringify(canonicalize(fixture.v1)) === JSON.stringify(needle)) {
      return fixture;
    }
  }
  throw new Error(`no fixture matches seeded document`);
};

testIfDb("every converted document passes normalizeDetailPageDocumentForWrite", async () => {
  for (const name of fixtureNames()) {
    const fixture = readFixture(name);
    const out = await convertFixture(fixture.v1);
    expect(() => normalizeDetailPageDocumentForWrite(out), name).not.toThrow();
  }
});
