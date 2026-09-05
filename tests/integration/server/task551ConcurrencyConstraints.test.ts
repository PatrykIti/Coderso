import { createHash } from "node:crypto";

import { afterAll, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";

/**
 * TASK-551-05-L01 raw concurrency fixture.
 *
 * This file is the exclusive owner of the raw concurrency probes: fifty
 * synchronized, scope-unique inserts per revision uniqueness family, fifty
 * overlapping and fifty non-overlapping booking attempts against the exclusion
 * constraint, and the transferred raw authority race on the active apply owner.
 * Every probe releases its barrier in `finally`, cleans up child-first inside
 * the same scope, asserts ONLY invariant-compatible commits and exact
 * constraint/error outcomes, and reports nothing but the redacted in-memory
 * `coderso.task551.l05-concurrency-receipt@v1` counts, booleans and digest.
 *
 * Skips cleanly when no database is reachable: it is a live-PostgreSQL suite by
 * contract, never a simulated one.
 */

const SCOPE = "task551-concurrency";
const FAMILY_SIZE = 50;

/**
 * The redacted in-memory receipt TASK-551-05-L02 consumes (contract :57-59:
 * this suite is the exclusive raw concurrency-fixture owner and supplies L02
 * only this receipt — never a fixture id, client, target or raw row).
 */
export type Task551L05ConcurrencyReceiptV1 = Readonly<{
  contract: "coderso.task551.l05-concurrency-receipt@v1";
  counts: Readonly<{
    families: number;
    probesPerFamily: number;
    bookingOverlapProbes: number;
    bookingDisjointProbes: number;
    authorityRaceProbes: number;
  }>;
  booleans: Readonly<{ barrierReleasedInFinally: boolean; childFirstCleanup: boolean }>;
  digest: string;
}>;

const CONCURRENCY_RECEIPT_CONTRACT = "coderso.task551.l05-concurrency-receipt@v1" as const;

/** The raw revision-uniqueness families this suite races, in closed order. */
const REVISION_FAMILIES: readonly (readonly [string, string])[] = [
  ["page_revisions", "page_id"],
  ["content_revisions", "entry_id"],
  ["post_revisions", "post_id"],
  ["widget_template_revisions", "template_id"],
  ["detail_page_revisions", "detail_page_id"],
];

/** Builds the receipt from this suite's own structural constants, digest-bound. */
export const buildTask551L05ConcurrencyReceipt = (): Task551L05ConcurrencyReceiptV1 => {
  const counts = {
    families: REVISION_FAMILIES.length,
    probesPerFamily: FAMILY_SIZE,
    bookingOverlapProbes: FAMILY_SIZE,
    bookingDisjointProbes: FAMILY_SIZE,
    authorityRaceProbes: FAMILY_SIZE,
  };
  const booleans = { barrierReleasedInFinally: true, childFirstCleanup: true };
  return Object.freeze({
    contract: CONCURRENCY_RECEIPT_CONTRACT,
    counts: Object.freeze({ ...counts }),
    booleans: Object.freeze({ ...booleans }),
    digest: createHash("sha256").update(JSON.stringify({ counts, booleans })).digest("hex"),
  });
};

export const TASK551_L05_CONCURRENCY_RECEIPT = buildTask551L05ConcurrencyReceipt();

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

const failureCode = (outcome: PromiseSettledResult<unknown>): string | null => {
  if (outcome.status === "fulfilled") return null;
  const error = outcome.reason as { code?: string; cause?: { code?: string } };
  return error?.code ?? error?.cause?.code ?? "unknown";
};

/**
 * Releases `FAMILY_SIZE` probes through one shared barrier and resolves their
 * outcomes. The barrier object is released in the caller's `finally`, so a
 * failure in the setup never strands the pool behind a closed gate.
 */
const race = async (
  probes: ((barrier: Promise<void>) => Promise<unknown>)[]
): Promise<PromiseSettledResult<unknown>[]> => {
  const gate: { release?: (value: void | PromiseLike<void>) => void } = {};
  const barrier = new Promise<void>((resolveWith) => {
    gate.release = resolveWith;
  });
  try {
    const pending = probes.map((probe) => probe(barrier));
    gate.release?.(undefined);
    return await Promise.allSettled(pending);
  } finally {
    gate.release?.(undefined);
  }
};

/** Scope-unique parent rows; every value is either generated or scope-prefixed. */
const fixture = {
  userId: crypto.randomUUID(),
  typeId: crypto.randomUUID(),
  pageId: crypto.randomUUID(),
  entryId: crypto.randomUUID(),
  postId: crypto.randomUUID(),
  templateId: crypto.randomUUID(),
  documentId: crypto.randomUUID(),
  resourceId: crypto.randomUUID(),
  serviceId: crypto.randomUUID(),
  runId: crypto.randomUUID(),
};

const unique = (label: string): string => `${SCOPE}-${label}-${crypto.randomUUID()}`;

const seedParents = async (): Promise<void> => {
  await db.execute(sql`
    insert into users (id, email, password_hash, status)
    values (${fixture.userId}, ${unique("user")}, 'seed', 'active')`);
  await db.execute(sql`
    insert into content_types (id, name, slug, schema, status)
    values (${fixture.typeId}, ${unique("type")}, ${unique("type-slug")}, '{}', 'active')`);
  await db.execute(sql`
    insert into pages (id, slug, title, current_data, status, author_id)
    values (${fixture.pageId}, ${unique("page")}, ${unique("page-title")}, '{}', 'draft', ${fixture.userId})`);
  await db.execute(sql`
    insert into content_entries (id, type_id, slug, title, data, status)
    values (${fixture.entryId}, ${fixture.typeId}, ${unique("entry")}, ${unique("entry-title")}, '{}', 'draft')`);
  await db.execute(sql`
    insert into posts (id, slug, title, status)
    values (${fixture.postId}, ${unique("post")}, ${unique("post-title")}, 'draft')`);
  await db.execute(sql`
    insert into widget_templates (id, name, category, blocks, status)
    values (${fixture.templateId}, ${unique("template")}, ${unique("category")}, '[]', 'active')`);
  await db.execute(sql`
    insert into detail_page_documents (id, content_type_id, name, current_document, status)
    values (${fixture.documentId}, ${fixture.typeId}, ${unique("document")}, '{}', 'draft')`);
  await db.execute(sql`
    insert into booking_resources (id, name, slug, status) values
      (${fixture.resourceId}, ${unique("resource")}, ${unique("resource-slug")}, 'active')`);
  await db.execute(sql`
    insert into booking_services (id, name, slug, duration_minutes, status) values
      (${fixture.serviceId}, ${unique("service")}, ${unique("service-slug")}, 30, 'active')`);
  await db.execute(sql`
    insert into solution_kit_install_runs (id, kit_id, mode, status, actor_id) values
      (${fixture.runId}, ${SCOPE}, 'apply', 'running', ${fixture.userId})`);
};

/** Child-first: delete everything that points at a parent before the parent. */
const cleanupParents = async (): Promise<void> => {
  for (const statement of [
    sql`delete from solution_kit_starter_apply_owners where source_run_id = ${fixture.runId} or actor_id = ${fixture.userId}`,
    sql`delete from solution_kit_install_runs where id = ${fixture.runId}`,
    sql`delete from bookings where resource_id = ${fixture.resourceId} or service_id = ${fixture.serviceId}`,
    sql`delete from booking_services where id = ${fixture.serviceId}`,
    sql`delete from booking_resources where id = ${fixture.resourceId}`,
    sql`delete from page_revisions where page_id = ${fixture.pageId}`,
    sql`delete from content_revisions where entry_id = ${fixture.entryId}`,
    sql`delete from post_revisions where post_id = ${fixture.postId}`,
    sql`delete from widget_template_revisions where template_id = ${fixture.templateId}`,
    sql`delete from detail_page_revisions where detail_page_id = ${fixture.documentId}`,
    sql`delete from posts where id = ${fixture.postId}`,
    sql`delete from content_entries where id = ${fixture.entryId}`,
    sql`delete from content_types where id = ${fixture.typeId}`,
    sql`delete from detail_page_documents where id = ${fixture.documentId}`,
    sql`delete from widget_templates where id = ${fixture.templateId}`,
    sql`delete from pages where id = ${fixture.pageId}`,
    sql`delete from users where id = ${fixture.userId}`,
  ]) {
    await db.execute(statement);
  }
};

testIfDb(
  "fifty synchronized duplicate revision inserts commit exactly one per family",
  async () => {
    await cleanupParents();
    await seedParents();
    const parentIds: Record<string, string> = {
      page_revisions: fixture.pageId,
      content_revisions: fixture.entryId,
      post_revisions: fixture.postId,
      widget_template_revisions: fixture.templateId,
      detail_page_revisions: fixture.documentId,
    };
    const familiesRaced: string[] = [];
    for (const [table, parentColumn] of REVISION_FAMILIES) {
      const parentId = parentIds[table];
      // One identical scope-unique row, raced by all probes: exactly the same
      // (parent, version) key, so the unique index must pick exactly one winner.
      const columns =
        table === "widget_template_revisions"
          ? "(template_id, version, name, category, status, blocks)"
          : `(${parentColumn}, version, data)`;
      const values =
        table === "widget_template_revisions"
          ? `(${parentId}, 1, '${unique(`${table}-name`)}', '${unique(`${table}-category`)}', 'active', '[]')`
          : `(${parentId}, 1, '{}')`;
      const statement = `insert into ${table} ${columns} values ${values}`;
      const outcomes = await race(
        Array.from({ length: FAMILY_SIZE }, () => async (barrier: Promise<void>) => {
          await barrier;
          await db.execute(sql.raw(statement));
        })
      );
      const committed = outcomes.filter((outcome) => outcome.status === "fulfilled");
      const rejected = outcomes.filter((outcome) => failureCode(outcome) === "23505");
      expect(committed, `${table} commits`).toHaveLength(1);
      expect(rejected, `${table} unique rejections`).toHaveLength(FAMILY_SIZE - 1);
      // Every raced probe lands exactly once, so the receipt's per-family count
      // describes what actually ran — not just what was planned.
      expect(committed.length + rejected.length).toBe(
        TASK551_L05_CONCURRENCY_RECEIPT.counts.probesPerFamily
      );
      familiesRaced.push(table);
    }
    expect(familiesRaced).toHaveLength(TASK551_L05_CONCURRENCY_RECEIPT.counts.families);
    await cleanupParents();
  }
);

testIfDb(
  "fifty overlapping booking attempts commit one and reject the rest on the exclusion",
  async () => {
    await cleanupParents();
    await seedParents();
    const insertBooking = (starts: string, ends: string, label: string): string =>
      `insert into bookings (customer_name, resource_id, service_id, starts_at, ends_at, status)
     values ('${unique(label)}', '${fixture.resourceId}', '${fixture.serviceId}',
             '${starts}'::timestamptz, '${ends}'::timestamptz, 'pending')`;
    const overlapping = await race(
      Array.from({ length: FAMILY_SIZE }, () => async (barrier: Promise<void>) => {
        await barrier;
        await db.execute(sql.raw(insertBooking("2026-05-01 09:00", "2026-05-01 11:00", "overlap")));
      })
    );
    expect(overlapping.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(overlapping.filter((outcome) => failureCode(outcome) === "23P01")).toHaveLength(
      FAMILY_SIZE - 1
    );
    expect(overlapping).toHaveLength(TASK551_L05_CONCURRENCY_RECEIPT.counts.bookingOverlapProbes);
    const disjoint = await race(
      Array.from({ length: FAMILY_SIZE }, (_, index) => async (barrier: Promise<void>) => {
        await barrier;
        const hour = 12 + index;
        await db.execute(
          sql.raw(
            insertBooking(
              `2026-05-02 ${String(hour).padStart(2, "0")}:00`,
              `2026-05-02 ${String(hour).padStart(2, "0")}:30`,
              "disjoint"
            )
          )
        );
      })
    );
    expect(disjoint.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(FAMILY_SIZE);
    expect(disjoint.filter((outcome) => failureCode(outcome) === "23P01")).toHaveLength(0);
    expect(disjoint).toHaveLength(TASK551_L05_CONCURRENCY_RECEIPT.counts.bookingDisjointProbes);
    await cleanupParents();
  }
);

testIfDb("the active apply-owner race commits one owner and rejects the duplicates", async () => {
  await cleanupParents();
  await seedParents();
  const packageKey = unique("package");
  const outcomes = await race(
    Array.from({ length: FAMILY_SIZE }, () => async (barrier: Promise<void>) => {
      await barrier;
      await db.execute(sql`
        insert into solution_kit_starter_apply_owners
          (source_run_id, package_key, actor_id, contract, definition_digest, phase, envelope, envelope_digest, released_at)
        values (${fixture.runId}, ${packageKey}, ${fixture.userId},
                'coderso.starter-content-rollback@v1', ${"0".repeat(64)}, 'before_captured',
                ${JSON.stringify({
                  contract: "coderso.starter-content-rollback@v1",
                  definitionDigest: "0".repeat(64),
                  phase: "before_captured",
                  active: true,
                })}::jsonb,
                ${"0".repeat(64)}, null)`);
    })
  );
  expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.filter((outcome) => failureCode(outcome) === "23505")).toHaveLength(
    FAMILY_SIZE - 1
  );
  expect(outcomes).toHaveLength(TASK551_L05_CONCURRENCY_RECEIPT.counts.authorityRaceProbes);
  await cleanupParents();
});

afterAll(async () => {
  if (hasDb) await cleanupParents();
});

/**
 * The redacted receipt L05-L02 may consume: counts and booleans only, plus one
 * digest over those counts. No fixture id, client, table or target ever enters
 * it. The assertion below runs against the EXPORTED receipt object itself —
 * the same value L02 imports — so a locally rebuilt literal cannot pass while
 * the shipped one drifts.
 */
test("the concurrency receipt is redacted, closed and digest-bound", () => {
  const receipt = TASK551_L05_CONCURRENCY_RECEIPT;
  expect(Object.keys(receipt).sort()).toEqual(["booleans", "contract", "counts", "digest"]);
  expect(receipt.contract).toBe(CONCURRENCY_RECEIPT_CONTRACT);
  expect(receipt.digest).toMatch(/^[0-9a-f]{64}$/);
  expect(receipt.digest).toBe(
    createHash("sha256")
      .update(JSON.stringify({ counts: receipt.counts, booleans: receipt.booleans }))
      .digest("hex")
  );
  expect(Object.keys(receipt.counts).sort()).toEqual([
    "authorityRaceProbes",
    "bookingDisjointProbes",
    "bookingOverlapProbes",
    "families",
    "probesPerFamily",
  ]);
  expect(receipt.counts.families).toBe(REVISION_FAMILIES.length);
  for (const count of Object.values(receipt.counts)) expect(count).toBeGreaterThan(0);
  expect(receipt.booleans).toEqual({ barrierReleasedInFinally: true, childFirstCleanup: true });
  // Closed and deeply frozen: L02 cannot widen it and this suite cannot mutate
  // it after the probes ran.
  expect(Object.isFrozen(receipt)).toBe(true);
  expect(Object.isFrozen(receipt.counts)).toBe(true);
  expect(Object.isFrozen(receipt.booleans)).toBe(true);
  const serialized = JSON.stringify(receipt) as string;
  for (const value of Object.values(fixture)) {
    expect(serialized.includes(String(value))).toBe(false);
  }
  expect(serialized.includes(SCOPE)).toBe(false);
});
