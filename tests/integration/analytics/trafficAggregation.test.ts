// TASK-483-04-L02 — DB-backed aggregation queries.
//
// Shared-DB isolation strategy (mandatory): the remote Postgres is shared
// concurrently by other streams and the owner, so this suite NEVER depends on
// global table emptiness and NEVER truncates/deletes whole tables. Each run
// anchors `now` to a per-run unique HISTORICAL window and seeds only rows whose
// timestamps fall inside [start, now); because every aggregation query is
// two-sided [start, end), rows written by other suites at other times can never
// leak in. Cleanup deletes only the exact sessions this suite created (their
// pageviews cascade via the FK).

import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { analyticsPageviews, analyticsSessions } from "../../../core/db/schema";
import type {
  TrafficDeviceClass,
  TrafficSourceKind,
} from "../../../core/services/analytics/trafficTypes";
import {
  getTopPages,
  getTrafficOverview,
} from "../../../core/services/analytics/trafficAggregationService";

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

// Per-run unique historical anchor: no other suite writes rows in this window.
const now = new Date(Date.UTC(1980, 0, 1) + Math.floor(Math.random() * 10_000) * 86_400_000);
const rangeDays = 7;
const windowStart = new Date(now.getTime() - (rangeDays - 1) * 86_400_000);
const seedAt = new Date(windowStart.getTime() + 86_400_000); // 1 day inside [start, now)

const SUITE = `traffic-agg-test-${randomUUID()}`;
const createdVisitorHashes = new Set<string>();

type SeedSession = {
  views: number;
  path?: string;
  sourceKind?: TrafficSourceKind;
  deviceClass?: TrafficDeviceClass;
  referrerHost?: string | null;
};

async function seed(sessions: SeedSession[]): Promise<string[]> {
  const ids: string[] = [];
  for (const s of sessions) {
    const visitorHash = `${SUITE}:${randomUUID()}`;
    createdVisitorHashes.add(visitorHash);
    const path = s.path ?? "/agg";
    const sourceKind = s.sourceKind ?? "direct";
    const deviceClass = s.deviceClass ?? "desktop";
    const referrerHost = s.referrerHost ?? null;
    const [created] = await db
      .insert(analyticsSessions)
      .values({
        visitorHash,
        sourceKind,
        referrerHost,
        deviceClass,
        lang: "en",
        entryPath: path,
        exitPath: path,
        pageviewCount: s.views,
        startedAt: seedAt,
        lastSeenAt: seedAt,
      })
      .returning({ id: analyticsSessions.id });
    ids.push(created.id);
    for (let i = 0; i < s.views; i += 1) {
      await db.insert(analyticsPageviews).values({
        sessionId: created.id,
        path,
        referrerHost,
        sourceKind,
        deviceClass,
        createdAt: seedAt,
      });
    }
  }
  return ids;
}

afterAll(async () => {
  if (!hasDb || createdVisitorHashes.size === 0) return;
  // Deleting sessions cascades to their pageviews via the FK.
  await db
    .delete(analyticsSessions)
    .where(inArray(analyticsSessions.visitorHash, [...createdVisitorHashes]));
});

testIfDb("totals: pageviews, visitors, sessions, bounce, avg pages/session", async () => {
  await seed([{ views: 1 }, { views: 1 }, { views: 3 }]);
  const o = await getTrafficOverview({ rangeDays, now });
  expect(o.totals.sessions).toBe(3); // exact: window is uniquely owned
  expect(o.totals.visitors).toBe(3); // 3 distinct visitor hashes
  expect(o.totals.pageviews).toBe(5); // 1 + 1 + 3
  expect(o.totals.bounceRate).toBeCloseTo(2 / 3);
  expect(o.totals.avgPagesPerSession).toBeCloseTo(5 / 3);
});

testIfDb("previous window is zeroed when nothing was seeded before start", async () => {
  const o = await getTrafficOverview({ rangeDays, now });
  expect(o.totals.sessions).toBeGreaterThan(0);
  expect(o.previous.sessions).toBe(0);
  expect(o.previous.pageviews).toBe(0);
  expect(o.previous.bounceRate).toBe(0);
});

testIfDb("sources and devices breakdown carry human labels", async () => {
  const o = await getTrafficOverview({ rangeDays, now });
  const direct = o.sources.find((r) => r.key === "direct");
  expect(direct?.label).toBe("Direct");
  expect(direct?.value ?? 0).toBeGreaterThanOrEqual(3);
  const desktop = o.devices.find((r) => r.key === "desktop");
  expect(desktop?.label).toBe("Desktop");
});

testIfDb("referrers breakdown includes only non-null hosts", async () => {
  await seed([
    { views: 1, referrerHost: "ref.example.test" },
    { views: 1, referrerHost: "ref.example.test" },
  ]);
  const o = await getTrafficOverview({ rangeDays, now });
  const ref = o.referrers.find((r) => r.key === "ref.example.test");
  expect(ref?.value).toBe(2);
  expect(ref?.label).toBe("ref.example.test");
});

testIfDb("trend has one zero-filled point per day", async () => {
  const o = await getTrafficOverview({ rangeDays, now });
  expect(o.trend.length).toBe(rangeDays);
  const seeded = o.trend.find((p) => p.date === seedAt.toISOString().slice(0, 10));
  expect(seeded?.value ?? 0).toBeGreaterThan(0);
});

testIfDb("top pages ranked by real view count", async () => {
  await seed([
    { views: 3, path: "/agg-popular" },
    { views: 1, path: "/agg-rare" },
  ]);
  const top = await getTopPages({ rangeDays: 30, limit: 5, now });
  expect(top.length).toBeGreaterThan(0);
  for (let i = 1; i < top.length; i += 1) {
    expect(top[i - 1].views).toBeGreaterThanOrEqual(top[i].views); // ordering-only
  }
});

testIfDb("empty range returns zeroed totals and empty arrays (no nulls)", async () => {
  // A far-earlier window this suite never seeded.
  const emptyNow = new Date(now.getTime() - 5000 * 86_400_000);
  const o = await getTrafficOverview({ rangeDays, now: emptyNow });
  expect(o.totals.pageviews).toBe(0);
  expect(o.totals.sessions).toBe(0);
  expect(o.totals.bounceRate).toBe(0);
  expect(o.topPages).toEqual([]);
  expect(o.trend.every((p) => p.value === 0)).toBe(true);
});

test("DB failure surfaces analytics_query_failed", async () => {
  // Monkey-patch db.select (rather than bun:test spyOn, which the repo's
  // bun:test type shim does not re-export) so runQueries' catch rethrows the
  // machine-readable code.
  const dbAny = db as unknown as { select: (...args: unknown[]) => unknown };
  const originalSelect = dbAny.select;
  dbAny.select = () => {
    throw new Error("boom");
  };
  try {
    await expect(getTrafficOverview({ rangeDays, now })).rejects.toThrow("analytics_query_failed");
  } finally {
    dbAny.select = originalSelect;
  }
});
