// TASK-551-06-L01 — traffic repository write path and retention DELETE
// primitives.
//
// Execution contract: the real-DB legs dial the shared test Postgres, so they
// register through `test.skipIf` on TASK-551-11's owner-injected
// `task551-db-test` map (presence-only gate below) and skip when it is absent —
// the airtight local run performs zero database contact. No `.env` is ever
// sourced and no ambient `DATABASE_URL` is probed.
//
// Fixture safety: every visitorHash is prefixed so cleanup only ever touches
// this suite's own rows, and every production delete exercised here runs inside
// a transaction that throws to roll back, so nothing this suite deletes can
// persist. Assertions are made ONLY on this suite's own fixture rows.

import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, asc, eq, inArray, lt } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { analyticsPageviews, analyticsSessions } from "../../../core/db/schema";
import {
  deleteOldestPageviewsBatch,
  deleteOldestSessionsBatch,
  deleteSessionsOlderThan,
  recordTrafficEvent,
} from "../../../core/services/analytics/trafficRepository";
import type { NormalizedTrafficEvent } from "../../../core/services/analytics/trafficTypes";

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
// owner map above; the source guard below never needs a database.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

// Uniquely scoped fixtures: every visitorHash is prefixed so cleanup only ever
// touches this suite's own rows on the shared DB.
const SUITE = `traffic-repo-test-${randomUUID()}`;
const createdVisitorHashes = new Set<string>();

function newVisitorHash(label: string): string {
  const h = `${SUITE}:${label}:${randomUUID()}`;
  createdVisitorHashes.add(h);
  return h;
}

function ev(path: string): NormalizedTrafficEvent {
  return {
    type: "pageview",
    path,
    referrerHost: null,
    sourceKind: "direct",
    deviceClass: "desktop",
    lang: "en",
  };
}

afterAll(async () => {
  if (!OWNER_DB_TEST_MAP_PRESENT || createdVisitorHashes.size === 0) return;
  // Deleting sessions cascades to their pageviews via the FK.
  await db
    .delete(analyticsSessions)
    .where(inArray(analyticsSessions.visitorHash, [...createdVisitorHashes]));
});

// Source guard (TASK-551-06-L01): the write service persists only — no import
// from the retention service and no inline prune call may remain (prose mentions
// of the retention module are not a code path).
test("recordTrafficEvent persists only: no retention import or inline prune call remains", () => {
  const repoRoot = join(import.meta.dir, "../../..");
  const source = readFileSync(
    join(repoRoot, "core/services/analytics/trafficRepository.ts"),
    "utf8"
  );
  expect(source).not.toContain('from "./trafficRetentionService"');
  expect(source).not.toContain("maybePruneExpiredTraffic");
  // And the write body states the removal instead of a reserved hook.
  expect(source).toContain("zero prune SQL");
});

testIfDb("second view in window reuses session and increments count", async () => {
  const H = newVisitorHash("window-reuse");
  const t0 = new Date();
  const t0plus5m = new Date(t0.getTime() + 5 * 60 * 1000);

  const a = await recordTrafficEvent({ event: ev("/a"), visitorHash: H, now: t0 });
  const b = await recordTrafficEvent({ event: ev("/b"), visitorHash: H, now: t0plus5m });

  expect(a.isNewSession).toBe(true);
  expect(b.isNewSession).toBe(false);
  expect(a.sessionId).toBe(b.sessionId);

  const [session] = await db
    .select({
      pageviewCount: analyticsSessions.pageviewCount,
      entryPath: analyticsSessions.entryPath,
      exitPath: analyticsSessions.exitPath,
    })
    .from(analyticsSessions)
    .where(eq(analyticsSessions.id, a.sessionId));
  expect(session.pageviewCount).toBe(2);
  expect(session.entryPath).toBe("/a");
  expect(session.exitPath).toBe("/b");

  const pageviews = await db
    .select({ id: analyticsPageviews.id })
    .from(analyticsPageviews)
    .where(eq(analyticsPageviews.sessionId, a.sessionId));
  expect(pageviews.length).toBe(2);
});

testIfDb("view after window opens a new session", async () => {
  const H = newVisitorHash("window-expiry");
  const t0 = new Date();
  const t0plus40m = new Date(t0.getTime() + 40 * 60 * 1000);

  const a = await recordTrafficEvent({ event: ev("/a"), visitorHash: H, now: t0 });
  const c = await recordTrafficEvent({ event: ev("/c"), visitorHash: H, now: t0plus40m });

  expect(c.isNewSession).toBe(true);
  expect(c.sessionId).not.toBe(a.sessionId);
});

testIfDb(
  "deleteSessionsOlderThan prunes by cutoff and cascades pageviews (rolled back)",
  async () => {
    const H = newVisitorHash("prune");
    // Deliberately ancient lastSeenAt so a cutoff between it and now selects it.
    const ancient = new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Run the whole insert → prune → assert inside a transaction that throws to
    // roll back — non-destructive on the shared DB. The cutoff delete is
    // whole-table (cannot be scoped by visitorHash), so we assert ONLY on the
    // fixture rows and never on a global rowCount that would depend on table
    // emptiness. The rollback discards every delete this transaction performed.
    const ROLLBACK = "intentional-rollback";
    let sawGone = false;
    let sessionId = "";
    try {
      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(analyticsSessions)
          .values({
            visitorHash: H,
            sourceKind: "direct",
            referrerHost: null,
            deviceClass: "desktop",
            lang: "en",
            entryPath: "/old",
            exitPath: "/old",
            startedAt: ancient,
            lastSeenAt: ancient,
          })
          .returning({ id: analyticsSessions.id });
        sessionId = created.id;
        await tx.insert(analyticsPageviews).values({
          sessionId,
          path: "/old",
          referrerHost: null,
          sourceKind: "direct",
          deviceClass: "desktop",
          createdAt: ancient,
        });

        // Exact production delete, executed through the tx executor.
        await deleteSessionsOlderThan(cutoff, tx);

        const remainingSessions = await tx
          .select({ id: analyticsSessions.id })
          .from(analyticsSessions)
          .where(eq(analyticsSessions.visitorHash, H));
        const remainingPageviews = await tx
          .select({ id: analyticsPageviews.id })
          .from(analyticsPageviews)
          .where(eq(analyticsPageviews.sessionId, sessionId));
        sawGone = remainingSessions.length === 0 && remainingPageviews.length === 0;

        throw new Error(ROLLBACK);
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== ROLLBACK) throw error;
    }

    expect(sawGone).toBe(true);

    // Belt-and-braces: confirm the rollback persisted nothing for this fixture.
    const persisted = await db
      .select({ id: analyticsSessions.id })
      .from(analyticsSessions)
      .where(and(eq(analyticsSessions.visitorHash, H), lt(analyticsSessions.lastSeenAt, cutoff)));
    expect(persisted.length).toBe(0);
  }
);

// Bounded-batch primitives (TASK-551-06-L01): at most `limit` oldest rows per
// batch, ordered oldest-first with the immutable `id ASC` tie-breaker. Distinct
// seeded timestamps make the ordering deterministic without depending on UUID
// sort order. Everything runs in a transaction that throws to roll back, so the
// unscoped age predicate can never persist a delete on the shared DB.
testIfDb("bounded batch deletes at most the requested oldest rows (rolled back)", async () => {
  const H = newVisitorHash("bounded-batch");
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldest = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  const timestamps = [
    oldest,
    new Date(oldest.getTime() + 60 * 1000),
    new Date(oldest.getTime() + 2 * 60 * 1000),
    new Date(Date.now() - 24 * 60 * 60 * 1000), // recent, past the cutoff
  ];

  const ROLLBACK = "intentional-rollback";
  let sawTwoOldestGone = false;
  let sawRecentAndThirdKept = false;
  let sawPageviewBatchBound = false;
  try {
    await db.transaction(async (tx) => {
      const sessionIds: string[] = [];
      for (const [index, at] of timestamps.entries()) {
        const [created] = await tx
          .insert(analyticsSessions)
          .values({
            visitorHash: H,
            sourceKind: "direct",
            referrerHost: null,
            deviceClass: "desktop",
            lang: "en",
            entryPath: `/bounded-${index}`,
            exitPath: `/bounded-${index}`,
            startedAt: at,
            lastSeenAt: at,
          })
          .returning({ id: analyticsSessions.id });
        sessionIds.push(created.id);
        await tx.insert(analyticsPageviews).values({
          sessionId: created.id,
          path: `/bounded-${index}`,
          referrerHost: null,
          sourceKind: "direct",
          deviceClass: "desktop",
          createdAt: at,
        });
      }

      // Pageview batches run first (retention order) and are bounded by the
      // limit, oldest `created_at` first: exactly the two oldest pageviews go,
      // the third aged and the recent pageview survive.
      const deletedPageviews = await deleteOldestPageviewsBatch(cutoff, 2, tx);
      const remainingPageviews = await tx
        .select({ path: analyticsPageviews.path })
        .from(analyticsPageviews)
        .where(inArray(analyticsPageviews.sessionId, sessionIds));
      sawPageviewBatchBound =
        deletedPageviews === 2 &&
        remainingPageviews.length === 2 &&
        remainingPageviews
          .map((row) => row.path)
          .sort()
          .join(",") === "/bounded-2,/bounded-3";

      // Exactly the two oldest sessions then go; the third aged and the recent
      // survive, and the pageview set is unchanged — the FK cascade had nothing
      // left to remove, so only the bounded batch itself deleted rows.
      const deletedSessions = await deleteOldestSessionsBatch(cutoff, 2, tx);
      expect(deletedSessions).toBe(2);
      const remaining = await tx
        .select({ id: analyticsSessions.id, lastSeenAt: analyticsSessions.lastSeenAt })
        .from(analyticsSessions)
        .where(eq(analyticsSessions.visitorHash, H))
        .orderBy(asc(analyticsSessions.lastSeenAt));
      sawTwoOldestGone = deletedSessions === 2 && remaining.length === 2;
      sawRecentAndThirdKept =
        remaining.length === 2 &&
        remaining[0]!.lastSeenAt.getTime() === timestamps[2]!.getTime() &&
        remaining[1]!.lastSeenAt.getTime() === timestamps[3]!.getTime();
      const pageviewsAfterSessionBatch = await tx
        .select({ path: analyticsPageviews.path })
        .from(analyticsPageviews)
        .where(inArray(analyticsPageviews.sessionId, sessionIds));
      sawRecentAndThirdKept =
        sawRecentAndThirdKept &&
        pageviewsAfterSessionBatch.length === 2 &&
        pageviewsAfterSessionBatch
          .map((row) => row.path)
          .sort()
          .join(",") === "/bounded-2,/bounded-3";

      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK) throw error;
  }

  expect(sawTwoOldestGone).toBe(true);
  expect(sawRecentAndThirdKept).toBe(true);
  expect(sawPageviewBatchBound).toBe(true);
});
