// Traffic repository — thin DB access for real traffic analytics (TASK-483-01-L03).
//
// Owns WRITES (session upsert within a rolling window + one pageview insert per
// event) and the retention PRUNERS consumed by TASK-483-06-L01. It intentionally
// exposes NO read helpers for aggregation: TASK-483-04-L02 issues its own scoped
// group-by / count-distinct / join queries directly against the tables (shapes a
// simple range reader cannot express). Business rules (retention policy/timing)
// live elsewhere.

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { analyticsPageviews, analyticsSessions } from "../../db/schema";
import { maybePruneExpiredTraffic } from "./trafficRetentionService";
import type { NormalizedTrafficEvent } from "./trafficTypes";

const SESSION_WINDOW_MS = 30 * 60 * 1000;

// db handle or a transaction handle (the argument drizzle passes to a
// db.transaction callback). Pruners accept it so a DB-backed test can run the
// exact production delete inside a transaction that rolls back. Typed to the
// shared `delete` capability so both `db` and a `tx` executor satisfy it (a raw
// `typeof db` excludes the tx handle, which lacks `$client`).
type Exec = Pick<typeof db, "delete">;

export async function recordTrafficEvent(args: {
  event: NormalizedTrafficEvent;
  visitorHash: string; // computed in TASK-483-02-L03 (salted, non-PII)
  now?: Date;
}): Promise<{ sessionId: string; isNewSession: boolean }> {
  const now = args.now ?? new Date();
  const windowStart = new Date(now.getTime() - SESSION_WINDOW_MS);

  try {
    // Find the most recent live session for this visitor.
    const [open] = await db
      .select({ id: analyticsSessions.id })
      .from(analyticsSessions)
      .where(
        and(
          eq(analyticsSessions.visitorHash, args.visitorHash),
          gte(analyticsSessions.lastSeenAt, windowStart)
        )
      )
      .orderBy(desc(analyticsSessions.lastSeenAt))
      .limit(1);

    let sessionId = open?.id;
    let isNewSession = false;
    if (!sessionId) {
      isNewSession = true;
      const [created] = await db
        .insert(analyticsSessions)
        .values({
          visitorHash: args.visitorHash,
          sourceKind: args.event.sourceKind,
          referrerHost: args.event.referrerHost,
          deviceClass: args.event.deviceClass,
          lang: args.event.lang,
          entryPath: args.event.path,
          exitPath: args.event.path,
          startedAt: now,
          lastSeenAt: now,
        })
        .returning({ id: analyticsSessions.id });
      sessionId = created.id;
    } else {
      await db
        .update(analyticsSessions)
        .set({
          lastSeenAt: now,
          exitPath: args.event.path,
          pageviewCount: sql`${analyticsSessions.pageviewCount} + 1`,
        })
        .where(eq(analyticsSessions.id, sessionId));
    }

    await db.insert(analyticsPageviews).values({
      sessionId,
      path: args.event.path,
      referrerHost: args.event.referrerHost,
      sourceKind: args.event.sourceKind,
      deviceClass: args.event.deviceClass,
      createdAt: now,
    });

    // ── RESERVED retention hook (single insertion point) ──────────────────────
    // TASK-483-06-L01 adds EXACTLY ONE line here, its ONLY edit to this file.
    // Placed after the pageview insert and before the return so the opportunistic,
    // process-local time-gated prune rides the write path (mirrors
    // searchHistoryService.pruneHistory after recordSearch). 01-L03 owns this
    // function body; because land order is strictly sequential (01 → … → 06,
    // single writer per source file at any time), 06-L01 is the sole later writer
    // and touches only this marker — recordTrafficEvent stays a one-owner body.
    // ──────────────────────────────────────────────────────────────────────────
    await maybePruneExpiredTraffic();
    return { sessionId, isNewSession };
  } catch (error) {
    // Surface DB failures as a machine-readable code; the route boundary
    // (TASK-483-02) maps it through mapAnalyticsError. Never leak the raw event.
    if (error instanceof Error && error.message === "analytics_persist_failed") {
      throw error;
    }
    throw new Error("analytics_persist_failed");
  }
}

// NOTE: no read helpers for aggregation. TASK-483-04-L02 issues its own scoped
// group-by / count-distinct / join queries directly against analyticsPageviews /
// analyticsSessions, so this repository intentionally exposes NO
// selectPageviewsInRange / selectSessionsInRange.

// Retention pruners consumed by TASK-483-06-L01. Both return the deleted rowCount.
// The predicate is cutoff-only (whole-table by-time delete); it CANNOT be scoped
// by visitorHash. Each accepts an optional executor defaulting to `db` so a
// DB-backed test can run the exact production delete inside a db.transaction that
// rolls back (non-destructive on the shared render.com Postgres). 06-L01 calls
// cutoff-only.
export async function deletePageviewsOlderThan(cutoff: Date, exec: Exec = db): Promise<number> {
  const result = await exec
    .delete(analyticsPageviews)
    .where(lt(analyticsPageviews.createdAt, cutoff));
  return rowCountOf(result);
}

export async function deleteSessionsOlderThan(cutoff: Date, exec: Exec = db): Promise<number> {
  // The analytics_pageviews.session_id FK (onDelete: "cascade", TASK-483-01-L02)
  // removes any remaining pageviews of pruned sessions — this is the primary pruner.
  const result = await exec
    .delete(analyticsSessions)
    .where(lt(analyticsSessions.lastSeenAt, cutoff));
  return rowCountOf(result);
}

function rowCountOf(result: unknown): number {
  if (result && typeof result === "object" && "rowCount" in result) {
    const count = (result as { rowCount: number | null }).rowCount;
    return typeof count === "number" ? count : 0;
  }
  return 0;
}
