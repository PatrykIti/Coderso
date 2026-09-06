// Traffic repository — thin DB access for real traffic analytics (TASK-483-01-L03).
//
// Owns WRITES (session upsert within a rolling window + one pageview insert per
// event) and the retention DELETE primitives consumed by the dedicated retention
// service (TASK-551-06-L01). It intentionally exposes NO read helpers for
// aggregation: TASK-483-04-L02 issues its own scoped group-by / count-distinct /
// join queries directly against the tables (shapes a simple range reader cannot
// express). Retention policy/timing lives in trafficRetentionService.ts: since
// TASK-551-06-L01 removed the inline prune hook, recordTrafficEvent persists and
// returns — it never imports or invokes retention, so a request write executes
// zero prune statements.

import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { analyticsPageviews, analyticsSessions } from "../../db/schema";
import type { NormalizedTrafficEvent } from "./trafficTypes";

const SESSION_WINDOW_MS = 30 * 60 * 1000;

// db handle or a transaction handle (the argument drizzle passes to a
// db.transaction callback). Delete primitives accept it so a DB-backed test can
// run the exact production delete inside a transaction that rolls back. Typed to
// the shared `select`/`delete` capabilities so both `db` and a `tx` executor
// satisfy it (a raw `typeof db` excludes the tx handle, which lacks `$client`).
export type Exec = Pick<typeof db, "delete" | "select">;

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

    // No retention here (TASK-551-06-L01): the former inline prune hook was
    // removed unconditionally, so a request write executes zero prune SQL.
    // Scheduled retention invokes pruneExpiredTraffic() instead.
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

// Retention DELETE primitives consumed by trafficRetentionService.ts
// (TASK-551-06-L01). The scheduled retention path uses the bounded
// `deleteOldest*Batch` primitives: each selects at most `limit` expired row IDs
// oldest-first (immutable `id ASC` tie-breaker after the age column) and deletes
// exactly those IDs, so a single batch can never run an unbounded delete. The
// original whole-cutoff `delete*OlderThan` helpers remain as repository
// primitives; retention no longer calls them. Every primitive accepts an
// optional executor defaulting to `db` so a DB-backed test can run the exact
// production delete inside a db.transaction that rolls back (non-destructive on
// the shared test Postgres). The `countExpired*Batch` primitives are the dry-run
// twins: the identical candidate query with zero deletes.
export async function deleteOldestPageviewsBatch(
  cutoff: Date,
  limit: number,
  exec: Exec = db
): Promise<number> {
  const aged = await exec
    .select({ id: analyticsPageviews.id })
    .from(analyticsPageviews)
    .where(lt(analyticsPageviews.createdAt, cutoff))
    .orderBy(asc(analyticsPageviews.createdAt), asc(analyticsPageviews.id))
    .limit(limit);
  if (aged.length === 0) return 0;
  const result = await exec.delete(analyticsPageviews).where(
    inArray(
      analyticsPageviews.id,
      aged.map((row) => row.id)
    )
  );
  return rowCountOf(result);
}

export async function deleteOldestSessionsBatch(
  cutoff: Date,
  limit: number,
  exec: Exec = db
): Promise<number> {
  const aged = await exec
    .select({ id: analyticsSessions.id })
    .from(analyticsSessions)
    .where(lt(analyticsSessions.lastSeenAt, cutoff))
    .orderBy(asc(analyticsSessions.lastSeenAt), asc(analyticsSessions.id))
    .limit(limit);
  if (aged.length === 0) return 0;
  // The analytics_pageviews.session_id FK (onDelete: "cascade", TASK-483-01-L02)
  // removes any remaining pageviews of pruned sessions.
  const result = await exec.delete(analyticsSessions).where(
    inArray(
      analyticsSessions.id,
      aged.map((row) => row.id)
    )
  );
  return rowCountOf(result);
}

export async function deletePageviewsOlderThan(cutoff: Date, exec: Exec = db): Promise<number> {
  const result = await exec
    .delete(analyticsPageviews)
    .where(lt(analyticsPageviews.createdAt, cutoff));
  return rowCountOf(result);
}

export async function deleteSessionsOlderThan(cutoff: Date, exec: Exec = db): Promise<number> {
  // See deleteOldestSessionsBatch: the FK cascade removes orphaned pageviews.
  const result = await exec
    .delete(analyticsSessions)
    .where(lt(analyticsSessions.lastSeenAt, cutoff));
  return rowCountOf(result);
}

// Dry-run candidate reads (TASK-551-06-L01): the SAME cutoff, ordering and
// `LIMIT <= 2,000` candidate query the apply-mode batch runs, with NO delete,
// no `FOR UPDATE` lock and no other mutation. The returned number is purely
// observational — rows are left exactly as they were.
export async function countExpiredPageviewsBatch(
  cutoff: Date,
  limit: number,
  exec: Exec = db
): Promise<number> {
  const aged = await exec
    .select({ id: analyticsPageviews.id })
    .from(analyticsPageviews)
    .where(lt(analyticsPageviews.createdAt, cutoff))
    .orderBy(asc(analyticsPageviews.createdAt), asc(analyticsPageviews.id))
    .limit(limit);
  return aged.length;
}

export async function countExpiredSessionsBatch(
  cutoff: Date,
  limit: number,
  exec: Exec = db
): Promise<number> {
  const aged = await exec
    .select({ id: analyticsSessions.id })
    .from(analyticsSessions)
    .where(lt(analyticsSessions.lastSeenAt, cutoff))
    .orderBy(asc(analyticsSessions.lastSeenAt), asc(analyticsSessions.id))
    .limit(limit);
  return aged.length;
}

// Affected-row read for a drizzle postgres-js delete. The driver's Result
// carries `count` (plus `command`/`state`/`columns`/`statement`) and NEVER a
// libpq-style `rowCount`, so reading `rowCount` always yields 0 — which made
// every batch report zero deleted rows and stopped the retention drain after
// its first batch. Anything without a numeric `count` reads as 0 defensively.
function rowCountOf(result: unknown): number {
  if (result && typeof result === "object" && "count" in result) {
    const count = (result as { count: unknown }).count;
    return typeof count === "number" ? count : 0;
  }
  return 0;
}
