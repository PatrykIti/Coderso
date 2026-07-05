// TASK-483-06-L01 — retention pruning & privacy enforcement.
//
// Shared remote test DB: this suite must NEVER fire the real UNSCOPED
// delete-by-cutoff (deletePageviewsOlderThan/deleteSessionsOlderThan) against
// the shared render.com Postgres — that would delete aged rows the suite did NOT
// create (483's own trafficAggregation fixtures, the TASK-482/484 streams, the
// owner). pruneExpiredTraffic is exercised ONLY via its injected repository
// seam: pure stubs for policy/ordering, fixture-scoped deletes for the real FK
// cascade. Assert ONLY on this suite's own fixtures; never assert global delete
// counts (res.sessions/res.pageviews) or table-wide state; clean up only rows
// this suite created.

// This suite never drives recordTrafficEvent, but set the flag defensively so no
// import-time / incidental write path can fire the inline unscoped prune.
process.env.ANALYTICS_PRUNE_INLINE_DISABLED = "1";

import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, getTableColumns, lt, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { analyticsPageviews, analyticsSessions } from "../../../core/db/schema";
import {
  __resetPruneGateForTests,
  pruneExpiredTraffic,
  resolveRetentionDays,
  type TrafficPruners,
} from "../../../core/services/analytics/trafficRetentionService";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

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

function rowCountOf(result: unknown): number {
  if (result && typeof result === "object" && "rowCount" in result) {
    const count = (result as { rowCount: number | null }).rowCount;
    return typeof count === "number" ? count : 0;
  }
  return 0;
}

// Fixture-scoped pruners: the cutoff predicate is ANDed with the fixture marker,
// so the real delete cascade runs on OWNED rows ONLY — never table-wide.
async function deleteOwnedPageviewsOlderThan(fixture: string, cutoff: Date): Promise<number> {
  const result = await db
    .delete(analyticsPageviews)
    .where(and(eq(analyticsPageviews.path, fixture), lt(analyticsPageviews.createdAt, cutoff)));
  return rowCountOf(result);
}

async function deleteOwnedSessionsOlderThan(fixture: string, cutoff: Date): Promise<number> {
  const result = await db
    .delete(analyticsSessions)
    .where(and(eq(analyticsSessions.entryPath, fixture), lt(analyticsSessions.lastSeenAt, cutoff)));
  return rowCountOf(result);
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
  __resetPruneGateForTests();
  process.env.ANALYTICS_RETENTION_DAYS = "365";
});

afterAll(async () => {
  if (originalRetentionDays === undefined) delete process.env.ANALYTICS_RETENTION_DAYS;
  else process.env.ANALYTICS_RETENTION_DAYS = originalRetentionDays;
  if (!hasDb || createdFixtureIds.size === 0) return;
  // Deleting sessions cascades to their pageviews via the FK; scoped by marker.
  for (const fixture of createdFixtureIds) {
    await db.delete(analyticsSessions).where(eq(analyticsSessions.entryPath, fixture));
    // Any orphaned pageviews (should be none once the session is gone) — scoped.
    await db.delete(analyticsPageviews).where(eq(analyticsPageviews.path, fixture));
  }
});

// (1) Policy + firm ordering — pure stubs, NO DB touched, safe under any
// concurrency and the only place the cutoff/order contract is asserted.
test("computes cutoff from retention window and prunes pageviews then sessions", async () => {
  const calls: Array<[string, Date]> = [];
  const stub: TrafficPruners = {
    deletePageviewsOlderThan: async (c) => {
      calls.push(["pv", c]);
      return 0;
    },
    deleteSessionsOlderThan: async (c) => {
      calls.push(["ss", c]);
      return 0;
    },
  };
  process.env.ANALYTICS_RETENTION_DAYS = "365";
  const now = new Date("2026-01-01T00:00:00Z");
  await pruneExpiredTraffic(now, stub);
  expect(calls.map((c) => c[0])).toEqual(["pv", "ss"]); // firm order
  expect(calls[0][1]).toEqual(addDays(now, -365)); // correct cutoff
});

// (2) Real FK cascade — a SINGLE small fixture-scoped DB smoke. The injected
// deletes are scoped to THIS run's marker, so the real delete cascade
// (onDelete "cascade" from TASK-483-01-L02) is exercised on OWNED rows ONLY.
testIfDb("deleting an aged session cascades its pageviews (fixture-scoped)", async () => {
  const fixtureId = `traffic-retention-${randomUUID()}`; // unique scope marker
  await seedSessionWithPageview({ startedAt: daysAgo(400), fixture: fixtureId }); // aged, owned
  await seedSessionWithPageview({ startedAt: daysAgo(10), fixture: fixtureId }); // recent, owned
  const scoped: TrafficPruners = {
    deletePageviewsOlderThan: (c) => deleteOwnedPageviewsOlderThan(fixtureId, c),
    deleteSessionsOlderThan: (c) => deleteOwnedSessionsOlderThan(fixtureId, c), // fires real cascade
  };
  await pruneExpiredTraffic(new Date(), scoped);
  expect(await countSessionsForFixture(fixtureId, { olderThanDays: 365 })).toBe(0); // own aged session gone
  expect(await countSessionsForFixture(fixtureId)).toBe(1); // own recent session kept
  expect(await countPageviewsForFixture(fixtureId)).toBe(1); // aged session's pageview cascaded away
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
