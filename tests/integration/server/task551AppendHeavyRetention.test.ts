// TASK-551-06-L01 — append-heavy retention registry coverage + family pruner
// integration legs (bun lane), in two registers:
//
// 1. Airtight registry coverage (doc L645-654): the closed 14-family policy
//    matrix, the 7 reviewed exemptions, fail-closed classification (every
//    doc-listed family resolvable, unknown names rejected, no unclassified
//    schema table), the batch-bound edges (499/500/501/2,000/2,001 framing),
//    and the TASK-551-01-L02 frozen `2036-01-01` retention clock consumed
//    verbatim from tests/perf/fixtures/task551DatabaseScale.ts. These legs
//    touch no database, so the suite is green under the airtight form.
//
// 2. Real-database legs (doc L646-649, L657): the family retention services
//    drive their TASK-551-05-L01 retention-indexed tables through bounded
//    batches — batch cap, oldest-first order, boundary-row retention,
//    per-user/per-status preservation, exact dry-run counts, idempotent
//    convergence. They register through `test.skipIf` on TASK-551-11's
//    owner-injected `task551-db-test` map and skip when it is absent: the
//    airtight run performs zero database contact, no `.env` is ever sourced,
//    and no ambient `DATABASE_URL` is probed.
//
// Shared-database discipline: every leg seeds rows carrying this run's unique
// marker and asserts ONLY on those marker rows (never table-wide counts).
// Cleanup is fixture-scoped marker deletes; the sweeps under test are the
// explicit production retention job, driven with hand-built small-batch
// policies so a leg can never exceed its own fixture. The scheduler-owned
// advisory lock (TASK-551-06-L03) is deliberately out of scope here.

import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { getTableName, inArray, is, like } from "drizzle-orm";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { db } from "../../../core/db/client";
import * as schema from "../../../core/db/schema";
import {
  assistantDocIngestRuns,
  emailDeliveryLogs,
  formActionRuns,
  formSubmissions,
  forms,
  integrationRequests,
  passwordResets,
  postPreviewTokens,
  posts,
  previewTokens,
  searchHistory,
  sessions,
  users,
  webhookDeliveries,
  webhooks,
} from "../../../core/db/schema";
import {
  APPEND_HEAVY_RETENTION_BATCH_BOUNDS,
  APPEND_HEAVY_RETENTION_ERROR_CODES,
  APPEND_HEAVY_RETENTION_EXEMPTIONS,
  APPEND_HEAVY_RETENTION_FAMILIES,
  classifyAppendHeavyTable,
  computeAppendHeavyRetentionRegistryDigest,
  resolveAppendHeavyRetentionFamily,
} from "../../../core/services/maintenance/appendHeavyRetentionRegistry";
import {
  RETENTION_FAMILY_ORDER,
  RETENTION_FAMILY_SPECS,
  SEARCH_HISTORY_KEEP_NEWEST_PER_USER,
} from "../../../core/services/maintenance/retentionPolicy";
import { pruneEmailDeliveryLogsBatch } from "../../../core/services/email/emailDeliveryRetentionService";
import { pruneAssistantIngestRunsBatch } from "../../../core/services/assistant/assistantRetentionService";
import { pruneFormSubmissionsBatch } from "../../../core/services/forms/submissionRetentionService";
import { pruneIntegrationRequestsBatch } from "../../../core/services/integrations/integrationRequestRetentionService";
import { prunePreviewTokensBatch } from "../../../core/services/pages/previewTokenRetentionService";
import {
  pruneSearchHistoryBatch,
  resolveSearchHistoryRetentionCutoff,
} from "../../../core/services/search/searchHistoryRetentionService";
import { pruneExpiredAuthArtifactsBatch } from "../../../core/services/auth/expiredAuthArtifactRetentionService";
import { pruneSessionsBatch } from "../../../core/services/auth/sessionRetentionService";
import { pruneWebhookDeliveriesBatch } from "../../../core/services/webhooks/webhookRetentionService";
import {
  TASK551_RETENTION_CLOCK_MS,
  retentionTs,
} from "../../../tests/perf/fixtures/task551DatabaseScale";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map
 * (exact-own child fixture map `TASK551_FIXTURE_DATABASE_URL`/`_NAME`/
 * `_SENTINEL` plus fixed OS keys, with no inherited environment). The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Canonical form of
 * tests/perf/database-pool-telemetry.test.ts and
 * tests/vitest/database/boundedReadContract.test.ts.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

// Named gate: exactly the real-database legs register through `test.skipIf`
// on the owner map above; every registry/policy proof is pure.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

// --- Shared frozen-scenario vocabulary -------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
/** TASK-551-01-L02's frozen retention clock, consumed verbatim (doc L651). */
const RETENTION_CLOCK = new Date(TASK551_RETENTION_CLOCK_MS);
/** `cutoff` means `column < now - age`: a row at exactly `cutoff` is retained. */
const cutoffFor = (now: Date, maxAgeDays: number): Date =>
  new Date(now.getTime() - maxAgeDays * DAY_MS);
const daysBefore = (instant: Date, days: number): Date =>
  new Date(instant.getTime() - days * DAY_MS);
const daysAfter = (instant: Date, days: number): Date =>
  new Date(instant.getTime() + days * DAY_MS);
/** Sub-day offsets, for the millisecond boundary probes. */
const msBefore = (instant: Date, ms: number): Date => new Date(instant.getTime() - ms);

/** Unique per-run marker prefixing every seeded marker column of this suite. */
const RUN = `task551-06l01-${randomUUID()}`;
const marked = (slug: string): string => `${RUN}-${slug}`;
const slugOf = (value: string): string => value.slice(RUN.length + 1);

/** The exact closed batch-ledger shape every family pruner returns. */
const batchLedger = (family: string, matched: number, deleted: number, dryRun: boolean) => ({
  family,
  matched,
  deleted,
  dryRun,
});

/**
 * Asserts one bounded batch invocation against the exact closed ledger shape
 * (`batchLedger`); every family leg funnels its batch assertions through here.
 */
async function expectLedger(
  batch: Promise<{ family: string; matched: number; deleted: number; dryRun: boolean }>,
  family: string,
  matched: number,
  deleted: number,
  dryRun: boolean
): Promise<void> {
  expect(await batch).toEqual(batchLedger(family, matched, deleted, dryRun));
}

/** Hand-built family policy: direct callers never mutate the process env. */
const familyPolicy = <Family extends string>(
  family: Family,
  maxAgeDays: number,
  batchSize: number
) => ({
  family,
  enabled: true,
  dryRun: false,
  maxAgeDays,
  batchSize,
  maxBatchesPerRun: 10,
});

/** Throwaway user fixture, uniquely emailed/named through this run's marker. */
const fixtureUser = (email: string, name: string) => ({
  email,
  passwordHash: "hash",
  name,
  status: "active",
});

/** Marker-scoped survivors of one family table, as sorted fixture slugs. */
async function survivorSlugs(column: PgColumn, table: PgTable): Promise<string[]> {
  const rows = await db
    .select({ value: column })
    .from(table)
    .where(like(column, `${RUN}-%`));
  return rows.map((row) => slugOf(String(row.value))).sort();
}

// --- Airtight register: the closed registry (doc L486-488, L645-649) -------

/**
 * The policy matrix of the leaf, transcribed row by row (doc L480-488) as one
 * pipe-delimited string per family:
 * `key|family|tables|enabled|age|min|max|cutoffMode|cutoffColumns` where
 * `tables`/`cutoffColumns` are `;`-joined (empty means none) and `enabled` is
 * 1/0. `key` is the registry key and policy-owner lookup; the env prefix is
 * the registry's uniform `RETENTION_<FAMILY>_` frame, so it is derived.
 */
const DOC_FAMILY_MATRIX = [
  "accessLogs|access_logs|access_logs|1|90|7|365|age|created_at",
  "auditLogs|audit_logs|audit_logs|1|365|30|2555|age|created_at",
  "emailDeliveryLogs|email_delivery_logs|email_delivery_logs|1|90|7|365|age|created_at",
  "searchHistory|search_history|search_history|1|90|7|365|age_then_newest_per_user|created_at",
  "integrationRequests|integration_requests|integration_requests|1|90|7|365|age|created_at",
  "passwordResets|password_resets|password_resets|1|7|1|30|expired_only|expires_at",
  "previewTokens|preview_tokens|preview_tokens;post_preview_tokens|1|1|1|30|expired_only|expires_at",
  "assistantDocIngestRuns|assistant_ingest_runs|assistant_doc_ingest_runs|1|90|7|365" +
    "|preserve_newest_successful|started_at",
  "assistantActions|assistant_actions|assistant_action_undo_items" +
    ";assistant_action_executions|1|180|30|730|child_first|created_at",
  "analytics|analytics|analytics_pageviews;analytics_sessions|1|365|30|1095|child_first" +
    "|created_at;last_seen_at",
  "formSubmissions|form_submissions|form_action_runs;form_submissions|0|365|1|3650" +
    "|child_first|created_at",
  "webhookDeliveries|webhook_deliveries|webhook_deliveries|1|30|1|365|terminal_only|created_at",
  "sessions|sessions|sessions|1|30|1|365|expired_or_revoked|expires_at;revoked_at",
  "solutionKitRuns|solution_kit_runs|solution_kit_legacy_rollback_progress" +
    ";solution_kit_starter_apply_owners;solution_kit_legacy_template_evidence" +
    ";solution_kit_install_items;solution_kit_install_runs|0|365|30|3650|graph_predicate|",
].map((row) => {
  const [key, family, tables, enabled, age, min, max, cutoffMode, cutoffColumns] = row.split("|");
  return {
    key,
    family,
    tables: tables.split(";"),
    prefix: `RETENTION_${family.toUpperCase()}_`,
    enabled: enabled === "1",
    age: Number(age),
    min: Number(min),
    max: Number(max),
    cutoffMode,
    cutoffColumns: cutoffColumns === "" ? [] : cutoffColumns.split(";"),
  };
});

/** The seven reviewed exemptions with their deciding owners (doc L480-488). */
const DOC_EXEMPTION_OWNERS: Readonly<Record<string, string>> = Object.freeze({
  revisions: "TASK-551-06-L02",
  backups: "TASK-511",
  cacheInvalidationOutbox: "TASK-551-08",
  assistantDomainRecords: "assistant content lifecycle",
  identityDomainRecords: "identity lifecycle",
  engagementDomainRecords: "booking/review lifecycle",
  authoredDomainRecords: "domain record lifecycle",
});

/** The one schema table deliberately outside the registry (05-L01's ledger). */
const UNCLASSIFIED_SCHEMA_TABLES: readonly string[] = ["task551_migration_operations"];

/** Every physical table the registry classifies (families plus exemptions). */
function classifiedRegistryTables(): Set<string> {
  const tables = new Set<string>();
  for (const definition of Object.values(APPEND_HEAVY_RETENTION_FAMILIES)) {
    for (const table of definition.tables) tables.add(table);
  }
  for (const exemption of Object.values(APPEND_HEAVY_RETENTION_EXEMPTIONS)) {
    for (const table of exemption.tables) tables.add(table);
  }
  return tables;
}

describe("append-heavy retention registry (airtight, no database)", () => {
  test("enumerates exactly the closed 14-family policy matrix", () => {
    expect(Object.keys(APPEND_HEAVY_RETENTION_FAMILIES)).toEqual(
      DOC_FAMILY_MATRIX.map((row) => row.key)
    );
    expect(RETENTION_FAMILY_ORDER).toHaveLength(DOC_FAMILY_MATRIX.length);
  });

  test("matches the leaf policy matrix row by row", () => {
    for (const row of DOC_FAMILY_MATRIX) {
      const definition = resolveAppendHeavyRetentionFamily(row.key);
      expect(definition.family).toBe(row.key);
      expect([...definition.tables]).toEqual([...row.tables]);
      expect(definition.envPrefix).toBe(row.prefix);
      expect(definition.enabledByDefault).toBe(row.enabled);
      expect(definition.defaultMaxAgeDays).toBe(row.age);
      expect(definition.minMaxAgeDays).toBe(row.min);
      expect(definition.maxMaxAgeDays).toBe(row.max);
      expect(definition.cutoffMode).toBe(row.cutoffMode);
      expect([...definition.cutoffColumns]).toEqual([...row.cutoffColumns]);
      // Ordered families end with the immutable `id ASC` tie-breaker; the
      // graph-predicate family's order is the child-first phrase instead.
      const finalOrder = definition.deleteOrder[definition.deleteOrder.length - 1];
      if (row.cutoffMode !== "graph_predicate") {
        expect(finalOrder.endsWith("id ASC")).toBe(true);
      }
      // Only the analytics family separates enablement from its legacy age key.
      const isAnalytics = row.key === "analytics";
      expect(definition.ageEnvKey === undefined).toBe(!isAnalytics);
      expect(definition.enabledEnvKey === undefined).toBe(!isAnalytics);
      if (isAnalytics) {
        expect(definition.ageEnvKey).toBe("ANALYTICS_RETENTION_DAYS");
        expect(definition.enabledEnvKey).toBe("RETENTION_ANALYTICS_ENABLED");
      }
    }
  });

  test("agrees with the policy owner's family specs", () => {
    expect([...RETENTION_FAMILY_ORDER]).toEqual(DOC_FAMILY_MATRIX.map((row) => row.family));
    for (const row of DOC_FAMILY_MATRIX) {
      const spec = RETENTION_FAMILY_SPECS[row.family as (typeof RETENTION_FAMILY_ORDER)[number]];
      expect(spec.envPrefix).toBe(
        row.cutoffMode && row.prefix === "RETENTION_ANALYTICS_" ? null : row.prefix
      );
      expect(spec.defaultEnabled).toBe(row.enabled);
      expect(spec.defaultAgeDays).toBe(row.age);
      expect(spec.minAgeDays).toBe(row.min);
      expect(spec.maxAgeDays).toBe(row.max);
      // Same physical table set; the graph family's child order is a pruner
      // property, so the two owners are compared as sets here.
      expect(spec.tables.map((entry) => entry.table).sort()).toEqual([...row.tables].sort());
      for (const entry of spec.tables) {
        expect(entry.orderBy[entry.orderBy.length - 1]).toEqual({
          column: "id",
          direction: "asc",
        });
      }
      if (row.key === "searchHistory") {
        expect(spec.keepNewestPerUser).toBe(SEARCH_HISTORY_KEEP_NEWEST_PER_USER);
        expect(SEARCH_HISTORY_KEEP_NEWEST_PER_USER).toBe(10);
      } else {
        expect(spec.keepNewestPerUser).toBeNull();
      }
      expect(spec.preserveNewestSuccessfulPerSource).toBe(
        row.key === "assistantDocIngestRuns" ? 1 : null
      );
    }
  });

  test("enumerates exactly the seven reviewed exemptions with deciding owners", () => {
    expect(Object.keys(APPEND_HEAVY_RETENTION_EXEMPTIONS)).toEqual(
      Object.keys(DOC_EXEMPTION_OWNERS)
    );
    for (const [name, owner] of Object.entries(DOC_EXEMPTION_OWNERS)) {
      expect(APPEND_HEAVY_RETENTION_EXEMPTIONS[name]?.owner).toBe(owner);
      expect(APPEND_HEAVY_RETENTION_EXEMPTIONS[name]?.tables.length ?? 0).toBeGreaterThan(0);
      // Classification is the fail-closed authority for exemption rows too.
      for (const table of APPEND_HEAVY_RETENTION_EXEMPTIONS[name]?.tables ?? []) {
        expect(classifyAppendHeavyTable(table)).toEqual({ kind: "exempt", name });
      }
    }
    // Revisions stay L02's separate count-plus-age policy and the outbox
    // TASK-551-08's, so this leaf never prunes either.
    expect([...APPEND_HEAVY_RETENTION_EXEMPTIONS.revisions.tables]).toContain("page_revisions");
    expect([...APPEND_HEAVY_RETENTION_EXEMPTIONS.cacheInvalidationOutbox.tables]).toEqual([
      "cache_invalidation_outbox",
    ]);
  });

  test("classifies every family table fail-closed and rejects unknown names", () => {
    for (const row of DOC_FAMILY_MATRIX) {
      for (const table of row.tables) {
        expect(classifyAppendHeavyTable(table)).toEqual({ kind: "family", name: row.key });
      }
      // The registry key and the policy-owner family string are distinct
      // namespaces: a snake_case family string is not a registry key and
      // never defaults (only `analytics`/`sessions` coincide verbatim).
      if (row.family !== row.key) {
        expect(() => resolveAppendHeavyRetentionFamily(row.family)).toThrowError(
          `${APPEND_HEAVY_RETENTION_ERROR_CODES.unknownFamily}: ${row.family}`
        );
      }
    }
    const unknownFamily = (family: string): void =>
      expect(() => resolveAppendHeavyRetentionFamily(family)).toThrowError(
        `${APPEND_HEAVY_RETENTION_ERROR_CODES.unknownFamily}: ${family}`
      );
    unknownFamily("AccessLogs");
    unknownFamily("retentionScheduler");
    unknownFamily("");
    const unknownTable = (table: string): void =>
      expect(() => classifyAppendHeavyTable(table)).toThrowError(
        `${APPEND_HEAVY_RETENTION_ERROR_CODES.unclassifiedTable}: ${table}`
      );
    unknownTable("accesslogs");
    unknownTable("retention_prune_state");
    unknownTable("");
  });

  test("covers every schema table except the pinned 05-L01 migration ledger", () => {
    const schemaTables = new Set<string>();
    for (const value of Object.values(schema as Record<string, unknown>)) {
      if (is(value, PgTable)) schemaTables.add(getTableName(value));
    }
    expect(schemaTables.size).toBeGreaterThan(0);
    // No phantom registry entry: every classified table exists in the schema.
    for (const table of classifiedRegistryTables()) {
      expect(schemaTables.has(table)).toBe(true);
    }
    // Every schema table is classified except the reviewed exception list, so
    // a future append-heavy table fails here unless the registry gains a
    // policy or a reviewed exemption in the same change (doc L486-488).
    const unclassified = [...schemaTables]
      .filter((table) => !classifiedRegistryTables().has(table))
      .sort();
    expect(unclassified).toEqual([...UNCLASSIFIED_SCHEMA_TABLES].sort());
    for (const table of UNCLASSIFIED_SCHEMA_TABLES) {
      expect(() => classifyAppendHeavyTable(table)).toThrowError(
        APPEND_HEAVY_RETENTION_ERROR_CODES.unclassifiedTable
      );
    }
  });

  test("pins the batch-bound edges and the deterministic registry digest", () => {
    expect({ ...APPEND_HEAVY_RETENTION_BATCH_BOUNDS }).toEqual({
      defaultBatchSize: 500,
      minBatchSize: 1,
      maxBatchSize: 2000,
      defaultMaxBatchesPerRun: 10,
      minMaxBatchesPerRun: 1,
      maxMaxBatchesPerRun: 100,
    });
    // The candidate edges the DB and perf legs replay: one batch never exceeds
    // 500 by default and 2,000 ever, over at most 10 and 100 batches.
    for (const edge of [499, 500, 501, 2000, 2001]) {
      expect(edge <= APPEND_HEAVY_RETENTION_BATCH_BOUNDS.maxBatchSize).toBe(edge <= 2000);
    }
    const digest = computeAppendHeavyRetentionRegistryDigest();
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(computeAppendHeavyRetentionRegistryDigest()).toBe(digest);
  });

  test("consumes the 01-L02 frozen 2036 clock and bucket rule verbatim", () => {
    expect(TASK551_RETENTION_CLOCK_MS).toBe(Date.parse("2036-01-01T00:00:00.000Z"));
    expect(RETENTION_CLOCK.toISOString()).toBe("2036-01-01T00:00:00.000Z");
    // The fixture's bucket rule: old/boundary/recent straddle the frozen clock
    // by exactly one millisecond.
    expect(retentionTs(0).getTime()).toBe(TASK551_RETENTION_CLOCK_MS - 1);
    expect(retentionTs(60).getTime()).toBe(TASK551_RETENTION_CLOCK_MS);
    expect(retentionTs(80).getTime()).toBe(TASK551_RETENTION_CLOCK_MS + 1);
    // `cutoff` is `column < now - age`, so the boundary row is always retained.
    expect(resolveSearchHistoryRetentionCutoff(RETENTION_CLOCK, 90).getTime()).toBe(
      TASK551_RETENTION_CLOCK_MS - 90 * DAY_MS
    );
    expect(cutoffFor(RETENTION_CLOCK, 90).toISOString()).toBe("2035-10-03T00:00:00.000Z");
    expect(cutoffFor(RETENTION_CLOCK, 30).toISOString()).toBe("2035-12-02T00:00:00.000Z");
    expect(cutoffFor(RETENTION_CLOCK, 7).toISOString()).toBe("2035-12-25T00:00:00.000Z");
  });
});

// --- Real-database register: family pruners over the 05-L01 tables ----------

describe("append-heavy family pruners on the 05-L01 tables (owner-injected fixture database)", () => {
  testIfDb(
    "email_delivery_logs: bounded oldest-first batch, boundary retention, exact dry-run, convergence",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 90);
      const sent = (slug: string, createdAt: Date) => ({
        recipient: marked(slug),
        subject: marked("subject"),
        status: "sent",
        createdAt,
      });
      const oldRows: readonly (readonly [string, Date])[] = [
        ["old-5d", daysBefore(cutoff, 5)],
        ["old-4d", daysBefore(cutoff, 4)],
        ["old-3d", daysBefore(cutoff, 3)],
        ["old-2d", daysBefore(cutoff, 2)],
        ["old-1d", daysBefore(cutoff, 1)],
        ["old-500ms", msBefore(cutoff, 500)],
      ];
      await db
        .insert(emailDeliveryLogs)
        .values([
          ...oldRows.map(([slug, createdAt]) => sent(slug, createdAt)),
          sent("boundary", cutoff),
          sent("new", daysAfter(cutoff, 1)),
        ]);
      const survivors = () => survivorSlugs(emailDeliveryLogs.recipient, emailDeliveryLogs);
      expect(await survivors()).toEqual(
        [...oldRows.map(([slug]) => slug), "boundary", "new"].sort()
      );

      const policy = familyPolicy("email_delivery_logs", 90, 4);
      const prune = (dryRun: boolean) =>
        pruneEmailDeliveryLogsBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "email_delivery_logs", matched, deleted, dryRun);

      // Dry-run: the identical bounded candidate read, zero deletes.
      await expectBatch(true, 6, 0);
      expect(await survivors()).toHaveLength(8);
      // Batch 1 deletes exactly the four oldest aged rows.
      await expectBatch(false, 4, 4);
      expect(await survivors()).toEqual(["boundary", "new", "old-1d", "old-500ms"].sort());
      // Batch 2 drains the remainder; batch 3 converges to zero.
      await expectBatch(false, 2, 2);
      await expectBatch(false, 0, 0);
      expect(await survivors()).toEqual(["boundary", "new"]);
      // A completed rerun deletes zero (idempotent convergence).
      expect(await prune(false).then((r) => r.deleted)).toBe(0);
      expect(await survivors()).toEqual(["boundary", "new"]);
    }
  );

  testIfDb(
    "integration_requests: one invocation deletes at most batchSize and converges",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 90);
      const pending = (slug: string, createdAt: Date) => ({
        name: marked(slug),
        status: "pending",
        createdAt,
      });
      await db
        .insert(integrationRequests)
        .values([
          pending("old-3d", daysBefore(cutoff, 3)),
          pending("old-2d", daysBefore(cutoff, 2)),
          pending("old-1d", daysBefore(cutoff, 1)),
          pending("old-500ms", msBefore(cutoff, 500)),
          pending("boundary", cutoff),
          pending("new", daysAfter(cutoff, 1)),
        ]);
      const survivors = () => survivorSlugs(integrationRequests.name, integrationRequests);
      const policy = familyPolicy("integration_requests", 90, 3);
      const prune = (dryRun: boolean) =>
        pruneIntegrationRequestsBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "integration_requests", matched, deleted, dryRun);

      const dryRun = await prune(true);
      expect(dryRun.deleted).toBe(0);
      expect(dryRun.matched).toBe(4);
      expect(await survivors()).toHaveLength(6);
      await expectBatch(false, 3, 3);
      expect(await survivors()).toEqual(["boundary", "new", "old-500ms"].sort());
      await expectBatch(false, 1, 1);
      await expectBatch(false, 0, 0);
      expect(await survivors()).toEqual(["boundary", "new"]);
    }
  );

  testIfDb(
    "search_history: age cutoff then newest-10-per-user preservation, transactionally",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 90);
      const insertedUsers = await db
        .insert(users)
        .values([
          fixtureUser(`${RUN}@example.com`, marked("search-user")),
          fixtureUser(`${RUN}-few@example.com`, marked("search-few")),
        ])
        .returning({ id: users.id });
      const [user, fewUser] = insertedUsers;

      // Twelve rows older than the cutoff plus three newer rows: the newest
      // ten of the fifteen survive, so exactly the five oldest age out.
      const oldSlugs = Array.from(
        { length: 12 },
        (_, index) => `q-${String(index + 1).padStart(2, "0")}`
      );
      await db.insert(searchHistory).values([
        ...oldSlugs.map((slug, index) => ({
          userId: user.id,
          query: marked(slug),
          createdAt: new Date(cutoff.getTime() - (13 - index) * 60 * 60 * 1000),
        })),
        { userId: user.id, query: marked("q-boundary"), createdAt: cutoff },
        { userId: user.id, query: marked("q-new-1"), createdAt: daysAfter(cutoff, 1 / 24) },
        { userId: user.id, query: marked("q-new-2"), createdAt: daysAfter(cutoff, 2 / 24) },
        // A user below the keep-newest watermark keeps even aged rows.
        ...[1, 2, 3].map((hours) => ({
          userId: fewUser.id,
          query: marked(`few-${hours}h`),
          createdAt: new Date(cutoff.getTime() - hours * 60 * 60 * 1000),
        })),
      ]);
      const survivors = () => survivorSlugs(searchHistory.query, searchHistory);
      expect(await survivors()).toHaveLength(18);

      const policy = familyPolicy("search_history", 90, 500);
      const runBatch = async (dryRun: boolean) =>
        db.transaction(async (tx) =>
          pruneSearchHistoryBatch({ ...policy, dryRun }, tx, RETENTION_CLOCK)
        );

      expect(await runBatch(true)).toEqual({ matched: 5, deleted: 0, dryRun: true });
      expect(await survivors()).toHaveLength(18);

      expect(await runBatch(false)).toEqual({ matched: 5, deleted: 5, dryRun: false });
      // The five oldest age out; the kept rows are the newest seven of the
      // aged dozen (q-06..q-12), the boundary row, the two newer rows, and
      // the below-watermark user's three.
      expect(await survivors()).toEqual(
        [
          ...oldSlugs.slice(5),
          "q-boundary",
          "q-new-1",
          "q-new-2",
          "few-1h",
          "few-2h",
          "few-3h",
        ].sort()
      );
      // Converged: the second transactional batch matches nothing.
      expect(await runBatch(false)).toEqual({ matched: 0, deleted: 0, dryRun: false });
    }
  );

  testIfDb(
    "password_resets: only rows already past expiry age out; the boundary row is retained",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 7);
      const [user] = await db
        .insert(users)
        .values(fixtureUser(`${RUN}-resets@example.com`, marked("resets-user")))
        .returning({ id: users.id });
      const reset = (slug: string, expiresAt: Date) => ({
        userId: user.id,
        tokenHash: marked(slug),
        expiresAt,
      });
      await db
        .insert(passwordResets)
        .values([
          reset("expired-3d", daysBefore(cutoff, 3)),
          reset("expired-2d", daysBefore(cutoff, 2)),
          reset("expired-1d", daysBefore(cutoff, 1)),
          reset("boundary", cutoff),
          reset("unexpired-1d", daysAfter(cutoff, 1)),
          reset("unexpired-30d", daysAfter(cutoff, 30)),
        ]);
      const survivors = () => survivorSlugs(passwordResets.tokenHash, passwordResets);
      expect(await survivors()).toHaveLength(6);

      const policy = familyPolicy("password_resets", 7, 500);
      const prune = (dryRun: boolean) =>
        pruneExpiredAuthArtifactsBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "password_resets", matched, deleted, dryRun);

      await expectBatch(true, 3, 0);
      expect(await survivors()).toHaveLength(6);
      await expectBatch(false, 3, 3);
      expect(await survivors()).toEqual(["boundary", "unexpired-1d", "unexpired-30d"].sort());
      expect(await prune(false).then((r) => r.deleted)).toBe(0);
    }
  );

  testIfDb(
    "sessions: expired and revoked sweeps delete while live and boundary sessions survive",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 30);
      const [user] = await db
        .insert(users)
        .values(fixtureUser(`${RUN}-sessions@example.com`, marked("sessions-user")))
        .returning({ id: users.id });
      const session = (slug: string, expiresAt: Date, revokedAt?: Date) => ({
        userId: user.id,
        tokenHash: marked(slug),
        expiresAt,
        ...(revokedAt === undefined ? {} : { revokedAt }),
      });
      await db
        .insert(sessions)
        .values([
          session("expired-2d", daysBefore(cutoff, 2)),
          session("expired-1d", daysBefore(cutoff, 1)),
          session("boundary", cutoff),
          session("revoked-2d", daysAfter(cutoff, 10), daysBefore(cutoff, 2)),
          session("revoked-1d", daysAfter(cutoff, 20), daysBefore(cutoff, 1)),
          session("live", daysAfter(cutoff, 30)),
        ]);
      const survivors = () => survivorSlugs(sessions.tokenHash, sessions);
      expect(await survivors()).toHaveLength(6);

      const policy = familyPolicy("sessions", 30, 500);
      const prune = (dryRun: boolean) =>
        pruneSessionsBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "sessions", matched, deleted, dryRun);

      await expectBatch(true, 4, 0);
      await expectBatch(false, 4, 4);
      expect(await survivors()).toEqual(["boundary", "live"].sort());
      expect(await prune(false).then((r) => r.deleted)).toBe(0);
    }
  );

  testIfDb(
    "webhook_deliveries: terminal deliveries only; pending and boundary rows survive",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 30);
      const [hook] = await db
        .insert(webhooks)
        .values({
          name: marked("webhook"),
          url: `https://fixture.invalid/${RUN}`,
          events: ["retention.fixture"],
        })
        .returning({ id: webhooks.id });
      const delivery = (status: string, createdAt: Date) => ({
        webhookId: hook.id,
        event: "retention.fixture",
        status,
        createdAt,
      });
      await db
        .insert(webhookDeliveries)
        .values([
          delivery("success", msBefore(cutoff, 3 * DAY_MS)),
          delivery("success", msBefore(cutoff, 2 * DAY_MS)),
          delivery("success", msBefore(cutoff, DAY_MS)),
          delivery("failed", msBefore(cutoff, 500)),
          delivery("success", cutoff),
          delivery("pending", msBefore(cutoff, 3 * DAY_MS)),
          delivery("pending", msBefore(cutoff, 2 * DAY_MS)),
        ]);
      const survivors = async () =>
        (
          await db
            .select({ status: webhookDeliveries.status, createdAt: webhookDeliveries.createdAt })
            .from(webhookDeliveries)
            .where(inArray(webhookDeliveries.webhookId, [hook.id]))
        )
          .map((row) => `${row.status}@${row.createdAt.getTime()}`)
          .sort();
      expect(await survivors()).toHaveLength(7);

      const policy = familyPolicy("webhook_deliveries", 30, 500);
      const prune = (dryRun: boolean) =>
        pruneWebhookDeliveriesBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "webhook_deliveries", matched, deleted, dryRun);

      await expectBatch(true, 4, 0);
      await expectBatch(false, 4, 4);
      // Only the boundary terminal row and the two pending rows survive, so a
      // delivery still eligible for another attempt is never swept.
      expect(await survivors()).toEqual(
        [
          `pending@${msBefore(cutoff, 3 * DAY_MS).getTime()}`,
          `pending@${msBefore(cutoff, 2 * DAY_MS).getTime()}`,
          `success@${cutoff.getTime()}`,
        ].sort()
      );
      expect(await prune(false).then((r) => r.deleted)).toBe(0);
    }
  );

  testIfDb(
    "preview_tokens: page-then-post budget split, boundary retention, dry-run, convergence",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 1);
      const [post] = await db
        .insert(posts)
        .values({ slug: marked("post"), title: marked("post-title") })
        .returning({ id: posts.id });
      // `preview_tokens` demands the 05-L01 target pair (no FK); the post table has none.
      const token = (slug: string, expiresAt: Date) => ({
        targetType: "page",
        targetId: randomUUID(),
        tokenHash: marked(slug),
        expiresAt,
      });
      await db
        .insert(previewTokens)
        .values([
          token("page-old-2", daysBefore(cutoff, 2)),
          token("page-old-1", daysBefore(cutoff, 1)),
          token("page-boundary", cutoff),
          token("page-new", daysAfter(cutoff, 1)),
        ]);
      await db.insert(postPreviewTokens).values([
        { postId: post.id, tokenHash: marked("post-old-2"), expiresAt: daysBefore(cutoff, 2) },
        { postId: post.id, tokenHash: marked("post-old-1"), expiresAt: daysBefore(cutoff, 1) },
        { postId: post.id, tokenHash: marked("post-boundary"), expiresAt: cutoff },
      ]);
      const page = () => survivorSlugs(previewTokens.tokenHash, previewTokens);
      const postTokens = () => survivorSlugs(postPreviewTokens.tokenHash, postPreviewTokens);
      const policy = familyPolicy("preview_tokens", 1, 2);
      const prune = (dryRun: boolean) =>
        prunePreviewTokensBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "preview_tokens", matched, deleted, dryRun);
      // Dry-run: only the page tokens fit the batch, nothing is deleted.
      await expectBatch(true, 2, 0);
      expect(await page()).toHaveLength(4);
      expect(await postTokens()).toHaveLength(3);
      // Batch 1 spends the whole budget on the oldest page tokens.
      await expectBatch(false, 2, 2);
      expect(await page()).toEqual(["page-boundary", "page-new"]);
      // Batch 2: the drained page table frees the budget for the post tokens.
      await expectBatch(false, 2, 2);
      expect(await postTokens()).toEqual(["post-boundary"]);
      // Batch 3 converges; every boundary token on both tables is retained.
      await expectBatch(false, 0, 0);
      expect(await page()).toEqual(["page-boundary", "page-new"]);
      expect(await postTokens()).toEqual(["post-boundary"]);
    }
  );

  testIfDb(
    "form_submissions: runs die before the submission they serve, boundary retained",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 365);
      const [form] = await db
        .insert(forms)
        .values({ name: marked("form"), slug: marked("form-slug") })
        .returning({ id: forms.id });
      const run = (slug: string, createdAt: Date, submissionId: string | null) => ({
        formId: form.id,
        submissionId,
        actionType: "webhook",
        actionLabel: marked(slug),
        status: "success",
        actionCondition: {},
        actionConfig: {},
        submissionPayload: {},
        createdAt,
      });
      const [parent] = await db
        .insert(formSubmissions)
        .values({
          formId: form.id,
          payload: {},
          ip: marked("sub-old"),
          createdAt: daysBefore(cutoff, 3),
        })
        .returning({ id: formSubmissions.id });
      await db
        .insert(formActionRuns)
        .values([
          run("child-4d", daysBefore(cutoff, 4), parent.id),
          run("child-3d", daysBefore(cutoff, 3), parent.id),
          run("standalone-2d", daysBefore(cutoff, 2), null),
          run("child-1d", daysBefore(cutoff, 1), parent.id),
          run("child-boundary", cutoff, parent.id),
        ]);
      await db.insert(formSubmissions).values([
        { formId: form.id, payload: {}, ip: marked("sub-boundary"), createdAt: cutoff },
        { formId: form.id, payload: {}, ip: marked("sub-new"), createdAt: daysAfter(cutoff, 1) },
      ]);
      const runs = () => survivorSlugs(formActionRuns.actionLabel, formActionRuns);
      const subs = () => survivorSlugs(formSubmissions.ip, formSubmissions);
      const policy = familyPolicy("form_submissions", 365, 3);
      const prune = (dryRun: boolean) =>
        pruneFormSubmissionsBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "form_submissions", matched, deleted, dryRun);
      expect(await runs()).toHaveLength(5);
      expect(await subs()).toHaveLength(3);
      // Dry-run: the three oldest aged runs are the whole first batch.
      await expectBatch(true, 3, 0);
      // Batch 1: those runs; the aged submission behind them waits.
      await expectBatch(false, 3, 3);
      expect(await runs()).toEqual(["child-1d", "child-boundary"]);
      expect(await subs()).toEqual(["sub-boundary", "sub-new", "sub-old"]);
      // Batch 2: the last aged run first, then child-first its submission.
      await expectBatch(false, 2, 2);
      expect(await runs()).toEqual(["child-boundary"]);
      expect(await subs()).toEqual(["sub-boundary", "sub-new"]);
      // Batch 3 converges; the boundary run and submission are retained.
      await expectBatch(false, 0, 0);
      expect(await runs()).toEqual(["child-boundary"]);
      expect(await subs()).toEqual(["sub-boundary", "sub-new"]);
    }
  );

  testIfDb(
    "assistant_doc_ingest_runs: newest success per source anchors; failed runs age out",
    async () => {
      const cutoff = cutoffFor(RETENTION_CLOCK, 90);
      const run = (source: string, status: string, startedAt: Date) => ({
        sourceRoot: marked(source),
        status,
        startedAt,
      });
      await db
        .insert(assistantDocIngestRuns)
        .values([
          run("src-a", "success", daysBefore(cutoff, 3)),
          run("src-a", "success", daysBefore(cutoff, 5)),
          run("src-b", "failed", daysBefore(cutoff, 2)),
          run("src-b", "failed", cutoff),
          run("src-c", "success", daysBefore(cutoff, 3)),
          run("src-c", "success", daysAfter(cutoff, 1)),
        ]);
      const stamp = (days: number) => daysBefore(cutoff, days).getTime();
      const survivors = async () =>
        (
          await db
            .select({
              root: assistantDocIngestRuns.sourceRoot,
              at: assistantDocIngestRuns.startedAt,
            })
            .from(assistantDocIngestRuns)
            .where(like(assistantDocIngestRuns.sourceRoot, `${RUN}-%`))
        )
          .map((row) => `${slugOf(row.root)}@${row.at.getTime()}`)
          .sort();
      const policy = familyPolicy("assistant_ingest_runs", 90, 500);
      const prune = (dryRun: boolean) =>
        pruneAssistantIngestRunsBatch({ ...policy, dryRun }, RETENTION_CLOCK, db);
      const expectBatch = (dryRun: boolean, matched: number, deleted: number) =>
        expectLedger(prune(dryRun), "assistant_ingest_runs", matched, deleted, dryRun);
      expect(await survivors()).toHaveLength(6);
      await expectBatch(true, 3, 0);
      // One batch drains every aged non-anchor row: the oldest success of src-a
      // anchors however old it is, src-c's older success has a newer successor,
      // and src-b's failed run is never an anchor.
      await expectBatch(false, 3, 3);
      expect(await survivors()).toEqual([
        `src-a@${stamp(3)}`,
        `src-b@${cutoff.getTime()}`,
        `src-c@${daysAfter(cutoff, 1).getTime()}`,
      ]);
      // Converged: the second batch matches nothing.
      await expectBatch(false, 0, 0);
    }
  );

  afterAll(async () => {
    if (!OWNER_DB_TEST_MAP_PRESENT) return;
    // Fixture-scoped cleanup only: marker deletes plus the parent rows whose
    // cascades own the child fixtures. No truncate, no global sweep.
    await db.delete(emailDeliveryLogs).where(like(emailDeliveryLogs.recipient, `${RUN}-%`));
    await db.delete(integrationRequests).where(like(integrationRequests.name, `${RUN}-%`));
    await db.delete(searchHistory).where(like(searchHistory.query, `${RUN}-%`));
    await db.delete(passwordResets).where(like(passwordResets.tokenHash, `${RUN}-%`));
    await db.delete(sessions).where(like(sessions.tokenHash, `${RUN}-%`));
    await db.delete(webhooks).where(like(webhooks.url, `https://fixture.invalid/${RUN}`));
    await db.delete(previewTokens).where(like(previewTokens.tokenHash, `${RUN}-%`));
    await db.delete(postPreviewTokens).where(like(postPreviewTokens.tokenHash, `${RUN}-%`));
    await db.delete(posts).where(like(posts.slug, `${RUN}-%`));
    await db.delete(formActionRuns).where(like(formActionRuns.actionLabel, `${RUN}-%`));
    await db.delete(formSubmissions).where(like(formSubmissions.ip, `${RUN}-%`));
    await db.delete(forms).where(like(forms.slug, `${RUN}-%`));
    await db
      .delete(assistantDocIngestRuns)
      .where(like(assistantDocIngestRuns.sourceRoot, `${RUN}-%`));
    await db.delete(users).where(like(users.email, `${RUN}%`));
  });
});
