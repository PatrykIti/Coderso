// TASK-551-06-L01 — bounded traffic retention batches (apply + dry-run).
//
// The scheduled retention service drives BOUNDED oldest-first batch deletes
// (pageviews by created_at ASC, id ASC, then sessions by last_seen_at ASC, id
// ASC), plus a dry-run path that runs the identical candidate query with ZERO
// deletes. Shared remote test DB: this suite must NEVER fire an unscoped
// delete-by-cutoff against the shared Postgres — that would delete aged rows the
// suite did NOT create (483's own trafficAggregation fixtures, the TASK-482/484
// streams, the owner). pruneExpiredTraffic is therefore exercised ONLY via its
// injected repository seam: pure stubs for policy/ordering/limits, and
// fixture-SCOPED batch deletes for the real FK cascade. Assert ONLY on this
// suite's own fixtures; never assert global delete counts or table-wide state;
// clean up only rows this suite created.
//
// Real-DB legs register through `test.skipIf` on TASK-551-11's owner-injected
// `task551-db-test` map (presence-only gate below) and skip when it is absent —
// the airtight local run performs zero database contact, and no `.env` is ever
// sourced and no ambient `DATABASE_URL` is probed.

import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, asc, eq, getTableColumns, inArray, lt } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { analyticsPageviews, analyticsSessions } from "../../../core/db/schema";
import {
  countExpiredPageviewsBatch,
  countExpiredSessionsBatch,
  deleteOldestPageviewsBatch,
  deleteOldestSessionsBatch,
  type Exec,
} from "../../../core/services/analytics/trafficRepository";
import {
  pruneExpiredTraffic,
  resolveRetentionDays,
  type TrafficBatchLimits,
  type TrafficBatchPruners,
} from "../../../core/services/analytics/trafficRetentionService";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map:
 * the exact-own child fixture map (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`,
 * `_SENTINEL`) plus fixed OS keys, with no inherited environment. The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Under the airtight local run no key
 * is set, so the real-DB legs skip by name instead of dialing an ambient URL.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

// Named gate: exactly the real-DB legs register through `test.skipIf` on the
// owner map above; every policy/ordering/limit proof below is pure.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

// Local date helper mirroring the service (assert the cutoff without importing a
// private const).
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const daysAgo = (days: number): Date => addDays(new Date(), -days);

// Every fixture is scoped by a unique marker written into BOTH the session's
// entry_path/exit_path AND the pageview's path, so every delete/count below is
// ANDed with that marker and can only ever touch this run's own rows.
const createdFixtureIds = new Set<string>();

async function seedSessionWithPageview(args: { startedAt: Date; fixture: string }): Promise<void> {
  createdFixtureIds.add(args.fixture);
  const [created] = await db
    .insert(analyticsSessions)
    .values({
      visitorHash: `${args.fixture}:${randomUUID()}`,
      sourceKind: "direct",
      referrerHost: null,
      deviceClass: "desktop",
      lang: "en",
      entryPath: args.fixture,
      exitPath: args.fixture,
      startedAt: args.startedAt,
      lastSeenAt: args.startedAt,
    })
    .returning({ id: analyticsSessions.id });
  await db.insert(analyticsPageviews).values({
    sessionId: created.id,
    path: args.fixture,
    referrerHost: null,
    sourceKind: "direct",
    deviceClass: "desktop",
    createdAt: args.startedAt,
  });
}

// Seeds `count` distinct sessions one minute apart so the oldest-first batch
// order is deterministic without depending on UUID sort order.
async function seedSessionsSpacedByMinute(
  fixture: string,
  count: number,
  newestDaysAgo: number
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const minutes = newestDaysAgo * 24 * 60 + (count - 1 - index);
    await seedSessionWithPageview({
      startedAt: new Date(Date.now() - minutes * 60 * 1000),
      fixture,
    });
  }
}

function deletedCountOf(result: unknown): number {
  // Driver-accurate: drizzle's postgres-js delete Result carries `count` (plus
  // `command`/`state`/`columns`/`statement`) and NEVER libpq's `rowCount`.
  if (result && typeof result === "object" && "count" in result) {
    const count = (result as { count: unknown }).count;
    return typeof count === "number" ? count : 0;
  }
  return 0;
}

// Fixture-scoped bounded batch pruners: the age predicate is ANDed with the
// fixture marker and each call mirrors the production batch primitive (select at
// most `limit` oldest owned IDs, then delete exactly those IDs), so the real
// delete cascade runs on OWNED rows ONLY — never table-wide.
async function deleteOwnedPageviewBatch(
  fixture: string,
  cutoff: Date,
  limit: number
): Promise<number> {
  const aged = await db
    .select({ id: analyticsPageviews.id })
    .from(analyticsPageviews)
    .where(and(eq(analyticsPageviews.path, fixture), lt(analyticsPageviews.createdAt, cutoff)))
    .orderBy(asc(analyticsPageviews.createdAt), asc(analyticsPageviews.id))
    .limit(limit);
  if (aged.length === 0) return 0;
  const result = await db.delete(analyticsPageviews).where(
    inArray(
      analyticsPageviews.id,
      aged.map((row) => row.id)
    )
  );
  return deletedCountOf(result);
}

async function deleteOwnedSessionBatch(
  fixture: string,
  cutoff: Date,
  limit: number
): Promise<number> {
  const aged = await db
    .select({ id: analyticsSessions.id })
    .from(analyticsSessions)
    .where(and(eq(analyticsSessions.entryPath, fixture), lt(analyticsSessions.lastSeenAt, cutoff)))
    .orderBy(asc(analyticsSessions.lastSeenAt), asc(analyticsSessions.id))
    .limit(limit);
  if (aged.length === 0) return 0;
  const result = await db.delete(analyticsSessions).where(
    inArray(
      analyticsSessions.id,
      aged.map((row) => row.id)
    )
  );
  return deletedCountOf(result);
}

// Dry-run twins of the fixture-scoped batch deletes: the identical owned
// candidate read with zero deletes (observational only).
async function countOwnedPageviews(fixture: string, cutoff: Date, limit: number): Promise<number> {
  const aged = await db
    .select({ id: analyticsPageviews.id })
    .from(analyticsPageviews)
    .where(and(eq(analyticsPageviews.path, fixture), lt(analyticsPageviews.createdAt, cutoff)))
    .orderBy(asc(analyticsPageviews.createdAt), asc(analyticsPageviews.id))
    .limit(limit);
  return aged.length;
}

async function countOwnedSessions(fixture: string, cutoff: Date, limit: number): Promise<number> {
  const aged = await db
    .select({ id: analyticsSessions.id })
    .from(analyticsSessions)
    .where(and(eq(analyticsSessions.entryPath, fixture), lt(analyticsSessions.lastSeenAt, cutoff)))
    .orderBy(asc(analyticsSessions.lastSeenAt), asc(analyticsSessions.id))
    .limit(limit);
  return aged.length;
}

function scopedBatches(fixture: string): TrafficBatchPruners {
  return {
    deleteOldestPageviewsBatch: (cutoff, limit) => deleteOwnedPageviewBatch(fixture, cutoff, limit),
    deleteOldestSessionsBatch: (cutoff, limit) => deleteOwnedSessionBatch(fixture, cutoff, limit),
    countExpiredPageviews: (cutoff, limit) => countOwnedPageviews(fixture, cutoff, limit),
    countExpiredSessions: (cutoff, limit) => countOwnedSessions(fixture, cutoff, limit),
  };
}

async function countSessionsForFixture(
  fixture: string,
  opts?: { olderThanDays?: number }
): Promise<number> {
  const predicate =
    opts?.olderThanDays === undefined
      ? eq(analyticsSessions.entryPath, fixture)
      : and(
          eq(analyticsSessions.entryPath, fixture),
          lt(analyticsSessions.lastSeenAt, daysAgo(opts.olderThanDays))
        );
  const rows = await db
    .select({ id: analyticsSessions.id })
    .from(analyticsSessions)
    .where(predicate);
  return rows.length;
}

async function countPageviewsForFixture(fixture: string): Promise<number> {
  const rows = await db
    .select({ id: analyticsPageviews.id })
    .from(analyticsPageviews)
    .where(eq(analyticsPageviews.path, fixture));
  return rows.length;
}

const originalRetentionDays = process.env.ANALYTICS_RETENTION_DAYS;

beforeEach(() => {
  process.env.ANALYTICS_RETENTION_DAYS = "365";
});

afterAll(async () => {
  if (originalRetentionDays === undefined) delete process.env.ANALYTICS_RETENTION_DAYS;
  else process.env.ANALYTICS_RETENTION_DAYS = originalRetentionDays;
  if (!OWNER_DB_TEST_MAP_PRESENT || createdFixtureIds.size === 0) return;
  // Deleting sessions cascades to their pageviews via the FK; scoped by marker.
  for (const fixture of createdFixtureIds) {
    await db.delete(analyticsSessions).where(eq(analyticsSessions.entryPath, fixture));
    // Any orphaned pageviews (should be none once the session is gone) — scoped.
    await db.delete(analyticsPageviews).where(eq(analyticsPageviews.path, fixture));
  }
});

// (1) Policy + firm ordering — pure stubs, NO DB touched, safe under any
// concurrency and the only place the cutoff/order contract is asserted. With the
// canonical default limits a short first batch stops the drain after one call,
// and apply mode issues zero observational candidate reads.
test("computes cutoff from retention window and prunes pageviews then sessions", async () => {
  const calls: Array<[string, Date, number]> = [];
  const reads: string[] = [];
  const stub: TrafficBatchPruners = {
    deleteOldestPageviewsBatch: async (c, limit) => {
      calls.push(["pv", c, limit]);
      return 0;
    },
    deleteOldestSessionsBatch: async (c, limit) => {
      calls.push(["ss", c, limit]);
      return 0;
    },
    countExpiredPageviews: async (_c, limit) => {
      reads.push(`pv:${limit}`);
      return 0;
    },
    countExpiredSessions: async (_c, limit) => {
      reads.push(`ss:${limit}`);
      return 0;
    },
  };
  const now = new Date("2026-01-01T00:00:00Z");
  const result = await pruneExpiredTraffic(now, stub);
  expect(calls.map((c) => c[0])).toEqual(["pv", "ss"]); // firm order
  expect(calls[0]![1]).toEqual(addDays(now, -365)); // correct cutoff
  expect(calls[1]![1]).toEqual(addDays(now, -365)); // identical cutoff per family
  expect(calls[0]![2]).toBe(500); // canonical default batch size
  expect(calls[1]![2]).toBe(500);
  expect(reads).toEqual([]); // apply mode never issues dry-run candidate reads
  expect(result).toEqual({ pageviews: 0, sessions: 0, dryRun: false });
});

// (2) Bounded batching: a full batch keeps draining, a short batch stops, and
// the returned totals accumulate every batch — still pageviews strictly first.
test("drains bounded batches until a short batch and accumulates the deleted counts", async () => {
  const calls: Array<[string, number]> = [];
  const pageviewBatches = [2, 2, 1]; // full, full, short → stop after the third
  const stub: TrafficBatchPruners = {
    deleteOldestPageviewsBatch: async (_c, limit) => {
      calls.push(["pv", limit]);
      return pageviewBatches.shift() ?? 0;
    },
    deleteOldestSessionsBatch: async (_c, limit) => {
      calls.push(["ss", limit]);
      return 0;
    },
    countExpiredPageviews: async () => {
      throw new Error("apply mode must not run the dry-run candidate read");
    },
    countExpiredSessions: async () => {
      throw new Error("apply mode must not run the dry-run candidate read");
    },
  };
  const limits: TrafficBatchLimits = { batchSize: 2, maxBatchesPerRun: 10 };
  const result = await pruneExpiredTraffic(new Date(), stub, limits);
  expect(calls).toEqual([
    ["pv", 2],
    ["pv", 2],
    ["pv", 2],
    ["ss", 2],
  ]);
  expect(result).toEqual({ pageviews: 5, sessions: 0, dryRun: false });
});

// (3) Hard cap: a family that never comes back short is drained for at most
// maxBatchesPerRun batches, so an invocation can never loop unbounded.
test("caps an invocation at maxBatchesPerRun batches per family", async () => {
  const calls: string[] = [];
  const stub: TrafficBatchPruners = {
    deleteOldestPageviewsBatch: async (_c, limit) => {
      calls.push(`pv:${limit}`);
      return limit; // always full
    },
    deleteOldestSessionsBatch: async (_c, limit) => {
      calls.push(`ss:${limit}`);
      return limit; // always full
    },
    countExpiredPageviews: async () => 0,
    countExpiredSessions: async () => 0,
  };
  const limits: TrafficBatchLimits = { batchSize: 2, maxBatchesPerRun: 3 };
  const result = await pruneExpiredTraffic(new Date(), stub, limits);
  expect(calls).toEqual(["pv:2", "pv:2", "pv:2", "ss:2", "ss:2", "ss:2"]);
  expect(result).toEqual({ pageviews: 6, sessions: 6, dryRun: false });
});

// (4) The former request-path trigger is removed outright (search-history
// precedent): no export, no stub, no re-export, and neither deprecated
// ANALYTICS_PRUNE_INLINE_* key is read anywhere in the retention service.
// Scheduled retention is the only prune path.
test("maybePruneExpiredTraffic is removed outright and no inline key is read", () => {
  const repoRoot = join(import.meta.dir, "../../..");
  const source = readFileSync(
    join(repoRoot, "core/services/analytics/trafficRetentionService.ts"),
    "utf8"
  );
  expect(source).not.toContain("maybePruneExpiredTraffic");
  expect(source).not.toContain("process.env.ANALYTICS_PRUNE_INLINE");
  expect(source).not.toContain("lastPruneAt");
});

// (5) Dry-run (TASK-551-06-L01): the SAME cutoff/ordering/bound candidate query
// as apply mode, ZERO delete statements, observational counts flagged
// `dryRun: true`. Pure stubs — no DB touched, and the delete seam throws if the
// dry-run path ever tried to mutate.
test("dry-run observes candidates, deletes nothing, and reports observational counts", async () => {
  const calls: Array<[string, Date, number]> = [];
  const stub: TrafficBatchPruners = {
    deleteOldestPageviewsBatch: async () => {
      throw new Error("dry-run must never delete pageviews");
    },
    deleteOldestSessionsBatch: async () => {
      throw new Error("dry-run must never delete sessions");
    },
    countExpiredPageviews: async (c, limit) => {
      calls.push(["pv", c, limit]);
      return 2; // aged candidates observed, nothing removed
    },
    countExpiredSessions: async (c, limit) => {
      calls.push(["ss", c, limit]);
      return 1;
    },
  };
  const now = new Date("2026-01-01T00:00:00Z");
  const result = await pruneExpiredTraffic(
    now,
    stub,
    { batchSize: 2, maxBatchesPerRun: 10 },
    { dryRun: true }
  );
  // Exactly one observational read per family: dry-run never advances the
  // candidate set, so repeating the read would only re-count the same rows.
  expect(calls.map((c) => c[0])).toEqual(["pv", "ss"]); // firm order preserved
  expect(calls[0]![1]).toEqual(addDays(now, -365)); // same cutoff as apply mode
  expect(calls[1]![1]).toEqual(addDays(now, -365));
  expect(calls[0]![2]).toBe(2); // candidate LIMIT == batchSize
  expect(calls[1]![2]).toBe(2);
  expect(result).toEqual({ pageviews: 2, sessions: 1, dryRun: true });
});

// (5b) The dry-run candidate query is hard-capped at LIMIT <= 2,000 even for a
// hand-built oversized limit, so an observational read can never run unbounded.
test("dry-run clamps the candidate LIMIT to the 2,000 policy cap", async () => {
  const limits: number[] = [];
  const stub: TrafficBatchPruners = {
    deleteOldestPageviewsBatch: async () => {
      throw new Error("dry-run must never delete pageviews");
    },
    deleteOldestSessionsBatch: async () => {
      throw new Error("dry-run must never delete sessions");
    },
    countExpiredPageviews: async (_c, limit) => {
      limits.push(limit);
      return 0;
    },
    countExpiredSessions: async (_c, limit) => {
      limits.push(limit);
      return 0;
    },
  };
  const result = await pruneExpiredTraffic(
    new Date(),
    stub,
    { batchSize: 5_000, maxBatchesPerRun: 1 },
    { dryRun: true }
  );
  expect(limits).toEqual([2_000, 2_000]);
  expect(result).toEqual({ pageviews: 0, sessions: 0, dryRun: true });
});

// (5c) Driver-accurate convergence: the real repository batch primitives read
// the affected-row count from the drizzle postgres-js delete Result — `count`,
// never libpq's `rowCount` (reading `rowCount` silently reported 0 and stopped
// every drain after its first batch). A finite pool must therefore drain to zero
// across bounded batches, and the per-run cap must hold when the pool never
// comes back short. Pure stub executor — zero database contact.
type FakeDeleteResult = {
  count: number;
  command: string;
  state: Record<string, never>;
  columns: unknown[];
  statement: string;
};

function driverAccurateBatches(args: { pvRemaining: number; ssRemaining: number }): {
  batches: TrafficBatchPruners;
  calls: string[];
  remaining: () => { pv: number; ss: number };
} {
  const calls: string[] = [];
  const makeExec = (label: "pv" | "ss", pool: { remaining: number }): Exec => {
    let pendingTake = 0;
    const builder = {
      from: () => builder,
      where: () => builder,
      orderBy: () => builder,
      limit: (limit: number) => {
        calls.push(`${label}:select:${limit}`);
        pendingTake = Math.min(limit, pool.remaining);
        pool.remaining -= pendingTake;
        return Promise.resolve(
          Array.from({ length: pendingTake }, (_, index) => ({ id: `${label}-${index}` }))
        );
      },
    };
    return {
      select: () => builder,
      delete: () => ({
        where: async (): Promise<FakeDeleteResult> => {
          // A batch deletes exactly the candidate IDs it selected, and the
          // driver reports that number on `count` (NO `rowCount` field).
          const removed = pendingTake;
          pendingTake = 0;
          calls.push(`${label}:delete:${removed}`);
          return { count: removed, command: "DELETE", state: {}, columns: [], statement: "" };
        },
      }),
    } as unknown as Exec;
  };
  const pvPool = { remaining: args.pvRemaining };
  const ssPool = { remaining: args.ssRemaining };
  return {
    calls,
    batches: {
      deleteOldestPageviewsBatch: (cutoff, limit) =>
        deleteOldestPageviewsBatch(cutoff, limit, makeExec("pv", pvPool)),
      deleteOldestSessionsBatch: (cutoff, limit) =>
        deleteOldestSessionsBatch(cutoff, limit, makeExec("ss", ssPool)),
      countExpiredPageviews: (cutoff, limit) =>
        countExpiredPageviewsBatch(cutoff, limit, makeExec("pv", pvPool)),
      countExpiredSessions: (cutoff, limit) =>
        countExpiredSessionsBatch(cutoff, limit, makeExec("ss", ssPool)),
    },
    remaining: () => ({ pv: pvPool.remaining, ss: ssPool.remaining }),
  };
}

test("repository batches converge across batches and honor maxBatchesPerRun", async () => {
  // Converging drain: 5 aged rows per family, batch size 2 → 2 + 2 + 1 (short)
  // = 5 deleted, then the drain stops on the short batch.
  const drained = driverAccurateBatches({ pvRemaining: 5, ssRemaining: 5 });
  const result = await pruneExpiredTraffic(new Date(), drained.batches, {
    batchSize: 2,
    maxBatchesPerRun: 10,
  });
  expect(result).toEqual({ pageviews: 5, sessions: 5, dryRun: false });
  expect(drained.calls.filter((call) => call.startsWith("pv:"))).toEqual([
    "pv:select:2",
    "pv:delete:2",
    "pv:select:2",
    "pv:delete:2",
    "pv:select:2",
    "pv:delete:1",
  ]);
  expect(drained.remaining()).toEqual({ pv: 0, ss: 0 });

  // Convergence is idempotent: the drained pools are empty, so a repeated
  // completed run deletes nothing (a single zero-row probe batch per family).
  const repeat = await pruneExpiredTraffic(new Date(), drained.batches, {
    batchSize: 2,
    maxBatchesPerRun: 10,
  });
  expect(repeat).toEqual({ pageviews: 0, sessions: 0, dryRun: false });
  expect(drained.calls.filter((call) => call.includes(":delete:"))).toHaveLength(6);

  // Cap proof: a pool that never comes back short is drained for at most
  // maxBatchesPerRun batches — 3 batches x 2 rows per family, never a 4th.
  const capped = driverAccurateBatches({ pvRemaining: 100, ssRemaining: 100 });
  const cappedResult = await pruneExpiredTraffic(new Date(), capped.batches, {
    batchSize: 2,
    maxBatchesPerRun: 3,
  });
  expect(cappedResult).toEqual({ pageviews: 6, sessions: 6, dryRun: false });
  expect(capped.calls.filter((call) => call.includes(":delete:"))).toHaveLength(6);
  expect(capped.calls.filter((call) => call.startsWith("pv:select:"))).toEqual([
    "pv:select:2",
    "pv:select:2",
    "pv:select:2",
  ]);
});

// (6) Real FK cascade — a SINGLE small fixture-scoped DB smoke. The injected
// deletes are scoped to THIS run's marker, so the real delete cascade
// (onDelete "cascade" from TASK-483-01-L02) is exercised on OWNED rows ONLY.
testIfDb("deleting an aged session cascades its pageviews (fixture-scoped)", async () => {
  const fixtureId = `traffic-retention-${randomUUID()}`; // unique scope marker
  await seedSessionWithPageview({ startedAt: daysAgo(400), fixture: fixtureId }); // aged, owned
  await seedSessionWithPageview({ startedAt: daysAgo(10), fixture: fixtureId }); // recent, owned
  await pruneExpiredTraffic(new Date(), scopedBatches(fixtureId), {
    batchSize: 1,
    maxBatchesPerRun: 10,
  });
  expect(await countSessionsForFixture(fixtureId, { olderThanDays: 365 })).toBe(0); // own aged session gone
  expect(await countSessionsForFixture(fixtureId)).toBe(1); // own recent session kept
  expect(await countPageviewsForFixture(fixtureId)).toBe(1); // aged pageview cascaded away
});

// (7) Bounded batches converge oldest-first on OWNED rows and respect the
// per-run batch cap: one invocation deletes at most batchSize x maxBatchesPerRun
// rows, and repeated runs converge idempotently.
testIfDb("bounded batches converge on owned rows and respect the per-run cap", async () => {
  // Full drain: 5 aged + 2 recent owned sessions, batch size 2 → 3 batches.
  const drainFixture = `traffic-retention-${randomUUID()}`;
  await seedSessionsSpacedByMinute(drainFixture, 5, 400);
  await seedSessionWithPageview({ startedAt: daysAgo(10), fixture: drainFixture });
  await seedSessionWithPageview({ startedAt: daysAgo(9), fixture: drainFixture });
  await pruneExpiredTraffic(new Date(), scopedBatches(drainFixture), {
    batchSize: 2,
    maxBatchesPerRun: 10,
  });
  expect(await countSessionsForFixture(drainFixture, { olderThanDays: 365 })).toBe(0);
  expect(await countSessionsForFixture(drainFixture)).toBe(2); // recent sessions survive
  expect(await countPageviewsForFixture(drainFixture)).toBe(2); // their pageviews survive

  // Capped drain: 5 aged owned sessions, one batch of 2 per invocation.
  const cappedFixture = `traffic-retention-${randomUUID()}`;
  await seedSessionsSpacedByMinute(cappedFixture, 5, 400);
  const capped: TrafficBatchLimits = { batchSize: 2, maxBatchesPerRun: 1 };
  await pruneExpiredTraffic(new Date(), scopedBatches(cappedFixture), capped);
  expect(await countSessionsForFixture(cappedFixture)).toBe(3);
  await pruneExpiredTraffic(new Date(), scopedBatches(cappedFixture), capped);
  expect(await countSessionsForFixture(cappedFixture)).toBe(1);
});

test("retention days clamps to [30,1095]", () => {
  process.env.ANALYTICS_RETENTION_DAYS = "5000";
  expect(resolveRetentionDays()).toBe(1095);
  process.env.ANALYTICS_RETENTION_DAYS = "1";
  expect(resolveRetentionDays()).toBe(30);
});

test("retention days defaults to 365 when unset or non-numeric", () => {
  delete process.env.ANALYTICS_RETENTION_DAYS;
  expect(resolveRetentionDays()).toBe(365);
  process.env.ANALYTICS_RETENTION_DAYS = "not-a-number";
  expect(resolveRetentionDays()).toBe(365);
});

// Security gate: no raw IP/UA/full-referrer column exists to leak, and pruning
// bounds the salted visitor_hash retention (the privacy backstop).
test("traffic tables store no raw PII columns; visitor_hash is the bounded identifier", () => {
  const sessionCols = Object.keys(getTableColumns(analyticsSessions));
  const pageviewCols = Object.keys(getTableColumns(analyticsPageviews));
  const all = [...sessionCols, ...pageviewCols].map((c) => c.toLowerCase());
  for (const banned of ["ip", "ipaddress", "ip_address", "useragent", "user_agent", "ua"]) {
    expect(all).not.toContain(banned);
  }
  // The only visitor identifier is the salted, prune-bounded hash.
  expect(sessionCols).toContain("visitorHash");
  expect(pageviewCols).not.toContain("visitorHash"); // pageviews carry no identifier at all
});
