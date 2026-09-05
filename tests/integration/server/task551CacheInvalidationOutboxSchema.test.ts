import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { cacheInvalidationOutbox } from "../../../core/db/schema";

/**
 * TASK-551-05-L01 durable cache-invalidation outbox schema.
 *
 * The outbox is the contract between the writers that enqueue invalidation
 * events and the TASK-551-08 runtime that drains them, so the checks and
 * indexes are pinned twice:
 *
 *   - statically, against the migration bytes and the newest snapshot, so no
 *     check can quietly lose a branch or an index can gain a predicate;
 *   - live (skipped without a database), by seeding 1,000 and 100,000 synthetic
 *     rows in the contract's four quarters — ready-unclaimed,
 *     backed-off-unclaimed, claimed, processed — and proving the bounded
 *     health/recovery statement `WHERE processed_at IS NULL ORDER BY
 *     created_at, id LIMIT 1` still returns the OLDEST unprocessed row even
 *     when that row is claimed or backed off. A predicate on `available_at` or
 *     `claim_token` in that statement would report healthy while work is
 *     outstanding, which is the correctness failure this suite exists to
 *     reject: `cache_outbox_unprocessed_age_idx` owns it and nothing else does.
 */

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../../../core/db/migrations");
const MIGRATION_TAG = "0081_task551_search_indexes_constraints_outbox";
const ONLINE_TAG = "0081_task551_online_indexes";

type Json = Record<string, unknown>;

const migrationSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${MIGRATION_TAG}.sql`), "utf8");

const companionSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${ONLINE_TAG}.sql`), "utf8");

const snapshotTable = (): Json => {
  const file = JSON.parse(
    readFileSync(
      path.join(MIGRATIONS_DIR, `meta/${MIGRATION_TAG.split("_")[0]}_snapshot.json`),
      "utf8"
    )
  ) as Json;
  return ((file.tables as Json)["public.cache_invalidation_outbox"] ?? {}) as Json;
};

process.env.DATABASE_URL ??= "postgres://localhost/nextless_test";
const canConnect = async (): Promise<boolean> => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};
const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const OUTBOX_COLUMNS: readonly [string, string][] = [
  ["id", "uuid"],
  ["event_key", "text"],
  ["tags", "jsonb"],
  ["created_at", "timestamp"],
  ["available_at", "timestamp"],
  ["attempts", "integer"],
  ["claim_token", "text"],
  ["claim_until", "timestamp"],
  ["processed_at", "timestamp"],
  ["last_error_code", "text"],
];

const OLDEST_AGE_INDEX = "cache_outbox_unprocessed_age_idx";
/**
 * The contract's bounded health/recovery statement (`WHERE processed_at IS NULL
 * ORDER BY created_at,id LIMIT 1`). The suite never asserts this constant
 * against itself: the oldest-age test derives the statement from the snapshot's
 * own index predicate and column order and compares it to these bytes.
 */
const CONTRACT_OLDEST_AGE_STATEMENT = "WHERE processed_at IS NULL ORDER BY created_at,id LIMIT 1";

test("the outbox table carries exactly the contract columns", () => {
  const table = snapshotTable();
  const columns = Object.entries((table.columns ?? {}) as Json).map(
    ([name, definition]) => [name, (definition as Json).type] as const
  );
  expect(columns.sort()).toEqual([...OUTBOX_COLUMNS].sort());
  const columnDefinitions = (table.columns ?? {}) as Json;
  expect((columnDefinitions.tags as Json).notNull).toBe(true);
  expect((columnDefinitions.attempts as Json).default).toBe(0);
  expect(Object.keys((table.indexes ?? {}) as Json)).toContain(
    "cache_invalidation_outbox_event_key_idx"
  );
});

test("every named check lands byte-for-byte with no lost branch", () => {
  const sqlText = migrationSql();
  expect(sqlText).toContain('"cache_invalidation_outbox"."attempts" >= 0');
  expect(sqlText).toContain(
    'jsonb_typeof("cache_invalidation_outbox"."tags") = \'array\' AND jsonb_array_length("cache_invalidation_outbox"."tags") BETWEEN 1 AND 32'
  );
  expect(sqlText).toContain(
    'octet_length("cache_invalidation_outbox"."event_key") BETWEEN 1 AND 128'
  );
  expect(sqlText).toContain(
    '(("cache_invalidation_outbox"."processed_at" IS NULL AND "cache_invalidation_outbox"."claim_token" IS NULL AND "cache_invalidation_outbox"."claim_until" IS NULL) OR ("cache_invalidation_outbox"."processed_at" IS NULL AND "cache_invalidation_outbox"."claim_token" IS NOT NULL AND "cache_invalidation_outbox"."claim_until" IS NOT NULL) OR ("cache_invalidation_outbox"."processed_at" IS NOT NULL AND "cache_invalidation_outbox"."claim_token" IS NULL AND "cache_invalidation_outbox"."claim_until" IS NULL))'
  );
  for (const name of [
    "cache_invalidation_outbox_attempts_chk",
    "cache_invalidation_outbox_tags_chk",
    "cache_invalidation_outbox_event_key_bytes_chk",
    "cache_invalidation_outbox_state_chk",
  ]) {
    expect(sqlText).toContain(`CONSTRAINT "${name}"`);
  }
});

test("the three cutoff indexes and the event key index are online members with exact shapes", () => {
  const members: readonly [string, string][] = [
    [
      "cache_invalidation_outbox_pending_idx",
      'CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_pending_idx" ON "cache_invalidation_outbox" USING btree ("available_at","id") WHERE processed_at IS NULL AND claim_token IS NULL;',
    ],
    [
      "cache_invalidation_outbox_expired_claim_idx",
      'CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_expired_claim_idx" ON "cache_invalidation_outbox" USING btree ("claim_until","id") WHERE processed_at IS NULL AND claim_token IS NOT NULL;',
    ],
    [
      "cache_invalidation_outbox_processed_idx",
      'CREATE INDEX CONCURRENTLY "cache_invalidation_outbox_processed_idx" ON "cache_invalidation_outbox" USING btree ("processed_at","id") WHERE processed_at IS NOT NULL;',
    ],
    [
      "cache_invalidation_outbox_event_key_idx",
      'CREATE UNIQUE INDEX CONCURRENTLY "cache_invalidation_outbox_event_key_idx" ON "cache_invalidation_outbox" USING btree ("event_key");',
    ],
  ];
  const lines = companionSql().split("\n");
  for (const [name, expected] of members) {
    expect(lines).toContain(expected);
    expect(migrationSql().includes(`"${name}"`)).toBe(false);
  }
});

test("the oldest-unprocessed index is partial on processed_at alone, never on availability or claim", () => {
  const index = ((snapshotTable().indexes ?? {}) as Json)[OLDEST_AGE_INDEX] as Json;
  expect(index.where).toBe("processed_at IS NULL");
  expect(index.method).toBe("btree");
  const indexColumns = (index.columns as { expression: string }[]).map(
    (column) => column.expression
  );
  expect(indexColumns).toEqual(["created_at", "id"]);
  const companionLine = companionSql()
    .split("\n")
    .find((line) => line.includes(`"${OLDEST_AGE_INDEX}"`));
  expect(companionLine).toBe(
    `CREATE INDEX CONCURRENTLY "${OLDEST_AGE_INDEX}" ON "cache_invalidation_outbox" USING btree ("created_at","id") WHERE processed_at IS NULL;`
  );
  // The bounded health/recovery statement is not asserted against itself: it is
  // re-derived from the snapshot's own index predicate and column order and only
  // then compared to the contract's bytes, so a changed index or a rewritten
  // statement cannot silently keep passing. No availability, claim or
  // claim-expiry filter may enter the derived statement.
  const derived = `WHERE ${index.where} ORDER BY ${indexColumns.join(",")} LIMIT 1`;
  expect(derived).toBe(CONTRACT_OLDEST_AGE_STATEMENT);
  expect(derived.includes("available_at")).toBe(false);
  expect(derived.includes("claim_token")).toBe(false);
  expect(derived.includes("claim_until")).toBe(false);
});

test("the health statement and its index cannot accept a claim predicate at all", () => {
  // Any rewrite that narrows the oldest-age predicate to claimed rows, to
  // available rows, or to unclaimed rows fails these guards. The guard is
  // scoped to the `cache_outbox_unprocessed_age_idx` companion line and the
  // health statement: the sibling claim indexes legitimately carry claim
  // predicates (contract :706-707), so the whole companion file may.
  const oldestAgeLine = companionSql()
    .split("\n")
    .find((line) => line.includes(`"${OLDEST_AGE_INDEX}"`));
  expect(oldestAgeLine).toBeDefined();
  for (const forbidden of [
    "AND claim_token IS NULL",
    "AND available_at <= now()",
    "AND claim_until < now()",
  ]) {
    expect(oldestAgeLine?.includes(forbidden) ?? false).toBe(false);
  }
});

/**
 * Rendered clock minute of each quarter's first row. The contract requires the
 * two oldest unprocessed rows to be the CLAIMED quarter first and the
 * BACKED-OFF quarter second (`_docs/_TASKS/TASK-551-05-L01…:908-910`), so a
 * claim- or availability-filtered index would return a later row and report
 * healthy while the oldest work is still outstanding. The four windows stay
 * below one hour and never overlap at the 1,000-row scale (250 rows/quarter),
 * which is the scale the ordering assertion runs at.
 */
const QUARTER_FIRST_MINUTE: readonly [number, number, number, number] = [600, 300, 0, 900];

/** The keys the ordered health statement must return, oldest first. */
const OLDEST_TWO_UNPROCESSED_KEYS = ["seed-2-0", "seed-1-0"];

const seedQuarters = async (rows: number): Promise<void> => {
  const perQuarter = Math.floor(rows / 4);
  const stamps: readonly string[] = ["ready", "backoff", "claimed", "processed"];
  for (const [quarterIndex, _kind] of stamps.entries()) {
    for (let position = 0; position < perQuarter; position += 1) {
      // The claimed quarter (2) holds the OLDEST rows and the backed-off
      // quarter (1) the second-oldest; the ready-unclaimed (0) and processed
      // (3) quarters follow, so only an unfiltered `processed_at IS NULL`
      // statement can return the true oldest row.
      const minute = QUARTER_FIRST_MINUTE[quarterIndex] + position;
      const createdAt = `2026-01-01 00:${String(Math.floor(minute / 60) % 60).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      await db.execute(sql`
        insert into cache_invalidation_outbox
          (event_key, tags, created_at, available_at, attempts, claim_token, claim_until, processed_at)
        values (
          ${`seed-${quarterIndex}-${position}`},
          ${JSON.stringify(["seed"])}::jsonb,
          ${createdAt}::timestamp,
          ${quarterIndex === 1 ? "2030-01-01" : "2026-01-01"}::timestamp,
          0,
          ${quarterIndex === 2 ? `claim-${position}` : null},
          ${quarterIndex === 2 ? "2026-06-01" : null}::timestamp,
          ${quarterIndex === 3 ? "2026-01-02" : null}::timestamp
        )`);
    }
  }
};

const clearSeeded = async (): Promise<void> => {
  await db.execute(sql`delete from cache_invalidation_outbox where event_key like 'seed-%'`);
};

testIfDb("the health statement returns the oldest unprocessed row even when claimed", async () => {
  await clearSeeded();
  try {
    await seedQuarters(1_000);
    const result = await db.execute<{ event_key: string }>(sql`
      select event_key from cache_invalidation_outbox
      where processed_at is null
      order by created_at asc, id asc
      limit 2`);
    const rows = (result as unknown as { rows: { event_key: string }[] }).rows;
    expect(rows).toHaveLength(2);
    // The two oldest unprocessed rows are exactly the claimed and the backed
    // off quarter's first rows, in that order: a claim-filtered index would
    // have skipped seed-2-0, and an availability-filtered one seed-1-0.
    expect(rows.map((row) => row.event_key)).toEqual(OLDEST_TWO_UNPROCESSED_KEYS);
    expect(rows[0].event_key.startsWith("seed-")).toBe(true);
    expect(rows[0].event_key.startsWith("seed-2-")).toBe(true);
    expect(rows[0].event_key.startsWith("seed-1-")).toBe(false);
  } finally {
    await clearSeeded();
  }
});

testIfDb(
  "100,000 quartered rows still plan through the oldest-age index with bounded work",
  async () => {
    await clearSeeded();
    try {
      await seedQuarters(100_000);
      const result = await db.execute<{ plan: string }>(sql`
      explain (analyze off, costs off, timing off, summary off)
      select event_key from cache_invalidation_outbox
      where processed_at is null
      order by created_at asc, id asc
      limit 1`);
      const plan = ((result as unknown as { rows: { plan: string }[] }).rows ?? [])
        .map((row) => row.plan)
        .join("\n");
      expect(plan).toContain(OLDEST_AGE_INDEX);
      expect(plan).toContain("Limit");
    } finally {
      await clearSeeded();
    }
  },
  300_000
);

test("the schema module keeps the bounded tag array contract the checks enforce", () => {
  // Exact column descriptors, not presence probes: the tags column must stay a
  // non-null jsonb (the `jsonb_typeof(...) = 'array'` check is meaningless over
  // any other type) and the event key a non-null text key of the exact byte
  // bound the `octet_length` check enforces.
  const tags = cacheInvalidationOutbox.tags as unknown as {
    name: string;
    columnType: string;
    dataType: string;
    notNull: boolean;
    getSQLType: () => string;
  };
  const eventKey = cacheInvalidationOutbox.eventKey as unknown as {
    name: string;
    columnType: string;
    dataType: string;
    notNull: boolean;
    getSQLType: () => string;
  };
  expect(tags.name).toBe("tags");
  expect(tags.columnType).toBe("PgJsonb");
  expect(tags.getSQLType()).toBe("jsonb");
  expect(tags.notNull).toBe(true);
  expect(eventKey.name).toBe("event_key");
  expect(eventKey.columnType).toBe("PgText");
  expect(eventKey.getSQLType()).toBe("text");
  expect(eventKey.notNull).toBe(true);
});
