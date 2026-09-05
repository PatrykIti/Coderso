import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../core/db/client";
import { TASK551_ONLINE_INDEX_MEMBERS } from "../perf/fixtures/task551OnlineIndexManifest";

/**
 * TASK-551-05-L01 write-overhead benchmark.
 *
 * Measures what the evidence-driven indexes cost the writers, per index group,
 * instead of hiding them in one aggregate: every group is built twice on its
 * own scope-local shadow table — once without the index, once with the exact
 * manifest bytes — and the insert/update p95 deltas are reported and gated
 * separately. The same is done for `cache_outbox_unprocessed_age_idx` across
 * the three outbox write paths (insert, claim/retry, completion update).
 *
 * Gates: a group whose p95 delta exceeds 20% fails, as does an incremental
 * storage total above the L01 budget. Without a database URL the suite
 * fail-closes at import (database_url_missing); with a URL set but unreachable
 * the gated measurements skip; the measured runs are live-PostgreSQL by
 * contract, never simulated.
 */

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../../core/db/migrations");
const ONLINE_TAG = "0081_task551_online_indexes";

const P95_REGRESSION_CEILING = 1.2;
const REPRESENTATIVE_ROWS = 5_000;
const STORAGE_BUDGET_BYTES = 512 * 1024 * 1024;
const SHADOW_SCHEMA = "task551_overhead";

const companionSql = (): string =>
  readFileSync(path.join(MIGRATIONS_DIR, `${ONLINE_TAG}.sql`), "utf8");

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

/** One measured group: the shadow table, its write path, and the index bytes. */
interface OverheadGroup {
  readonly name: string;
  readonly member: string;
  readonly createTable: string;
  readonly insertRow: (index: number) => string;
  readonly updateStatement: string;
}

const GROUPS: readonly OverheadGroup[] = [
  {
    name: "page-entry-typed-entry-post-author composites",
    member: "pages_author_list_updated_id_idx",
    createTable: `create table if not exists ${SHADOW_SCHEMA}.overhead_author_lists (
      id bigserial primary key, author_id uuid not null, type_id uuid not null,
      updated_at timestamptz not null default now())`,
    insertRow: (index) =>
      `insert into ${SHADOW_SCHEMA}.overhead_author_lists (author_id, type_id, updated_at)
       values ('00000000-0000-0000-0000-${String(index).padStart(12, "0")}',
               '00000000-0000-0000-0001-${String(index).padStart(12, "0")}', now())`,
    updateStatement: `update ${SHADOW_SCHEMA}.overhead_author_lists set updated_at = now() where author_id = '00000000-0000-0000-0000-000000000001'`,
  },
  {
    name: "role-leading user_roles",
    member: "user_roles_role_user_idx",
    createTable: `create table if not exists ${SHADOW_SCHEMA}.overhead_user_roles (
      id bigserial primary key, role_id uuid not null, user_id uuid not null)`,
    insertRow: (index) =>
      `insert into ${SHADOW_SCHEMA}.overhead_user_roles (role_id, user_id)
       values ('00000000-0000-0000-0002-${String(index).padStart(12, "0")}',
               '00000000-0000-0000-0003-${String(index).padStart(12, "0")}')`,
    updateStatement: `update ${SHADOW_SCHEMA}.overhead_user_roles set user_id = user_id where role_id = '00000000-0000-0000-0002-000000000001'`,
  },
  {
    name: "post/media tag containment",
    member: "posts_tags_gin_idx",
    createTable: `create table if not exists ${SHADOW_SCHEMA}.overhead_tags (
      id bigserial primary key, tags jsonb not null)`,
    insertRow: (index) =>
      `insert into ${SHADOW_SCHEMA}.overhead_tags (tags) values ('["tag-${index % 64}", "shared"]'::jsonb)`,
    updateStatement: `update ${SHADOW_SCHEMA}.overhead_tags set tags = tags || '["touched"]'::jsonb where id in (select id from ${SHADOW_SCHEMA}.overhead_tags limit 10)`,
  },
  {
    name: "webhook list/event traversal",
    member: "webhooks_events_gin_idx",
    createTable: `create table if not exists ${SHADOW_SCHEMA}.overhead_webhooks (
      id bigserial primary key, events jsonb not null, created_at timestamptz not null default now())`,
    insertRow: (index) =>
      `insert into ${SHADOW_SCHEMA}.overhead_webhooks (events) values ('{"k-${index % 128}": true}'::jsonb)`,
    updateStatement: `update ${SHADOW_SCHEMA}.overhead_webhooks set created_at = now() where id in (select id from ${SHADOW_SCHEMA}.overhead_webhooks limit 10)`,
  },
  {
    name: "cache outbox oldest-unprocessed age",
    member: "cache_outbox_unprocessed_age_idx",
    createTable: `create table if not exists ${SHADOW_SCHEMA}.overhead_outbox (
      id bigserial primary key, created_at timestamptz not null default now(),
      processed_at timestamptz, claim_token text, claim_until timestamptz, attempts integer not null default 0)`,
    insertRow: (index) =>
      `insert into ${SHADOW_SCHEMA}.overhead_outbox (processed_at, claim_token, claim_until)
       values (${index % 4 === 3 ? "now()" : "null"}, ${index % 4 === 1 ? `'claim-${index}'` : "null"},
               ${index % 4 === 1 ? "now() + interval '5 minutes'" : "null"})`,
    updateStatement:
      `update ${SHADOW_SCHEMA}.overhead_outbox set attempts = attempts + 1 where processed_at is null and claim_token is null limit 1`.replace(
        " limit 1",
        ""
      ) +
      " and id in (select id from " +
      SHADOW_SCHEMA +
      ".overhead_outbox where processed_at is null and claim_token is null order by created_at, id limit 1)",
  },
];

const memberBytes = (member: string): string => {
  const found = TASK551_ONLINE_INDEX_MEMBERS.find((entry) => entry.name === member);
  if (found === undefined) throw new Error(`member ${member} is not in the closed manifest`);
  return `${found.createSql
    .replace(/ ON /, ` ON ${SHADOW_SCHEMA}.`)
    .replace(/ CONCURRENTLY/, "")
    .replace(/ ON ([a-z_.]+) \(/, " ON $1 (")}`;
};

const p95 = (samples: readonly number[]): number => {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)];
};

const timedRuns = async (statement: string, runs: number): Promise<number[]> => {
  const samples: number[] = [];
  for (let index = 0; index < runs; index += 1) {
    const startedAt = performance.now();
    await db.execute(sql.raw(statement));
    samples.push(performance.now() - startedAt);
  }
  return samples;
};

const relationBytes = async (table: string): Promise<number> => {
  const result = await db.execute<{ bytes: string }>(
    sql`select pg_total_relation_size(${`${SHADOW_SCHEMA}.${table}`}) as bytes`
  );
  return Number(
    ((result as unknown as { rows: { bytes: string }[] }).rows[0] ?? { bytes: 0 }).bytes
  );
};

const dropShadow = async (): Promise<void> => {
  await db.execute(sql.raw(`drop schema if exists ${SHADOW_SCHEMA} cascade`));
};

/** Builds the paired tables, returns the per-group measured deltas. */
const measureGroup = async (
  group: OverheadGroup
): Promise<{ table: string; insertDelta: number; updateDelta: number; storageDelta: number }> => {
  const baseTable = `${group.member.replace(/_idx$/, "")}_baseline`;
  const indexedTable = `${group.member.replace(/_idx$/, "")}_indexed`;
  const tableName = (suffix: string): string => `${SHADOW_SCHEMA}.${suffix}`;
  for (const suffix of [baseTable, indexedTable]) {
    await db.execute(sql.raw(group.createTable.replace(/overhead_[a-z_]+/, suffix)));
    if (suffix === indexedTable) {
      await db.execute(
        sql.raw(memberBytes(group.member).replace(group.member, `${group.member}_${suffix}`))
      );
    }
  }
  const insertWarm = group.insertRow(0);
  const measure = async (
    suffix: string
  ): Promise<{ insert: number; update: number; bytes: number }> => {
    await timedRuns(
      insertWarm.replace(/00000000-0000-0000-0000-0{12}/, "00000000-0000-0000-0000-000000000000"),
      3
    );
    const insertSamples = await timedRuns(
      Array.from({ length: REPRESENTATIVE_ROWS }, (_, index) => group.insertRow(index + 1))
        .map((statement) => `${statement};`)
        .join("\n"),
      1
    );
    const updateSamples = await timedRuns(group.updateStatement, 25);
    return {
      insert: p95(insertSamples),
      update: p95(updateSamples),
      bytes: await relationBytes(suffix),
    };
  };
  const plain = await measure(tableName(baseTable));
  const indexed = await measure(tableName(indexedTable));
  return {
    table: group.member,
    insertDelta: indexed.insert / Math.max(plain.insert, 0.001),
    updateDelta: indexed.update / Math.max(plain.update, 0.001),
    storageDelta: indexed.bytes - plain.bytes,
  };
};

describe("database index write overhead (TASK-551-05-L01)", () => {
  type MeasuredGroup = {
    table: string;
    insertDelta: number;
    updateDelta: number;
    storageDelta: number;
  };

  /** Runs the whole paired measurement itself, so no test ever reads another test's leftovers. */
  const measureAllGroups = async (): Promise<MeasuredGroup[]> => {
    const measured: MeasuredGroup[] = [];
    await dropShadow();
    await db.execute(sql.raw(`create schema if not exists ${SHADOW_SCHEMA}`));
    try {
      for (const group of GROUPS) measured.push(await measureGroup(group));
    } finally {
      await dropShadow();
    }
    return measured;
  };

  test("the benchmarked members are the manifest's bytes, not a paraphrase", () => {
    const companion = companionSql();
    for (const group of GROUPS) {
      const member = TASK551_ONLINE_INDEX_MEMBERS.find((entry) => entry.name === group.member);
      expect(member).toBeDefined();
      expect(companion.includes(member?.createSql ?? "absent")).toBe(true);
    }
  });

  testIfDb(
    "every reported group stays inside the 20% write ceiling",
    async () => {
      for (const measured of await measureAllGroups()) {
        const group = GROUPS.find((entry) => entry.member === measured.table);
        expect(
          measured.insertDelta,
          `${group?.name ?? measured.table} insert p95`
        ).toBeLessThanOrEqual(P95_REGRESSION_CEILING);
        expect(
          measured.updateDelta,
          `${group?.name ?? measured.table} update p95`
        ).toBeLessThanOrEqual(P95_REGRESSION_CEILING);
      }
    },
    600_000
  );

  testIfDb(
    "the incremental storage total stays inside the L01 budget",
    async () => {
      const measured = await measureAllGroups();
      expect(measured.map((entry) => entry.table)).toEqual(GROUPS.map((group) => group.member));
      const total = measured.reduce((sum, entry) => sum + Math.max(entry.storageDelta, 0), 0);
      expect(total).toBeLessThanOrEqual(STORAGE_BUDGET_BYTES);
    },
    600_000
  );

  afterAll(async () => {
    if (hasDb) await dropShadow();
  });
});
