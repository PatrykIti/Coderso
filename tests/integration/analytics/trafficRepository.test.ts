// Ensure the reserved inline-prune hook (added by TASK-483-06-L01) never fires an
// unscoped global delete against the shared render.com Postgres from this suite.
// (No-op today — 01-L03 has not wired the hook — but set for forward-compat since
// this suite is re-run in 06-L02's matrix.)
process.env.ANALYTICS_PRUNE_INLINE_DISABLED = "1";

import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { analyticsPageviews, analyticsSessions } from "../../../core/db/schema";
import {
  deleteSessionsOlderThan,
  recordTrafficEvent,
} from "../../../core/services/analytics/trafficRepository";
import type { NormalizedTrafficEvent } from "../../../core/services/analytics/trafficTypes";

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
  if (!hasDb || createdVisitorHashes.size === 0) return;
  // Deleting sessions cascades to their pageviews via the FK.
  await db
    .delete(analyticsSessions)
    .where(inArray(analyticsSessions.visitorHash, [...createdVisitorHashes]));
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
