// Traffic retention & privacy enforcement (TASK-483-06-L01).
//
// Bounds data retention for the real traffic analytics pipeline: prunes raw
// pageviews/sessions older than a configurable window so hashed `visitor_hash`
// identifiers never accumulate indefinitely. This is the privacy backstop — no
// raw PII (IP/User-Agent/full referrer) was ever stored, so there is nothing
// else to purge; pruning simply ages out the salted, non-PII rows.
//
// Retention rides the WRITE path opportunistically (there is no scheduler/cron
// in the repo today), mirroring core/services/search/searchHistoryService.ts
// pruneHistory which runs inline after each recordSearch insert. A cheap
// process-local time-gate keeps the delete-by-cutoff off the hot path.
//
// Migration note: when TASK-484-02-L01 lands its in-process scheduler seam
// (core/server/jobs/backupScheduler.ts / runDueScheduledBackups), call
// pruneExpiredTraffic() from there instead and drop the inline gate below — the
// service's public API does not change.

import { deletePageviewsOlderThan, deleteSessionsOlderThan } from "./trafficRepository";

// Local trivial date helper (matches the private consts in analyticsService.ts /
// trafficAggregationService.ts — duplicated rather than entangling the modules).
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

// Retention window: default 365 days, clamped to [30, 1095]. Configured via the
// ANALYTICS_RETENTION_DAYS env var.
export function resolveRetentionDays(): number {
  const raw = Number(process.env.ANALYTICS_RETENTION_DAYS);
  if (!Number.isFinite(raw)) return 365;
  return Math.min(Math.max(Math.floor(raw), 30), 1095);
}

// Repository seam — MANDATORY for shared-DB test safety. The two raw pruners are
// injectable. In production they default to the real TASK-483-01-L03 helpers,
// which perform an UNSCOPED global delete-by-cutoff (delete ALL rows older than
// the cutoff). That is correct in a single production DB but is DESTRUCTIVE
// against the ONE shared remote render.com test Postgres: it would delete aged
// rows a suite did NOT create. Tests therefore NEVER call this with the real
// repo; they inject pure stubs (policy/ordering) or fixture-SCOPED delete fns
// (real FK cascade).
export type TrafficPruners = {
  deletePageviewsOlderThan: (cutoff: Date) => Promise<number>;
  deleteSessionsOlderThan: (cutoff: Date) => Promise<number>;
};

const realPruners: TrafficPruners = {
  deletePageviewsOlderThan: (cutoff) => deletePageviewsOlderThan(cutoff),
  deleteSessionsOlderThan: (cutoff) => deleteSessionsOlderThan(cutoff),
};

export async function pruneExpiredTraffic(
  now = new Date(),
  repo: TrafficPruners = realPruners
): Promise<{ pageviews: number; sessions: number }> {
  const cutoff = addDays(now, -resolveRetentionDays());
  // Firm order: (1) deletePageviewsOlderThan — reused from TASK-483-01-L03 —
  // bounds old pageviews that belong to still-retained sessions; then
  // (2) deleteSessionsOlderThan — also declared by TASK-483-01-L03 in
  // trafficRepository.ts — removes expired sessions, whose remaining pageviews
  // go via the FK onDelete: "cascade" defined in TASK-483-01-L02.
  const pageviews = await repo.deletePageviewsOlderThan(cutoff);
  const sessions = await repo.deleteSessionsOlderThan(cutoff);
  return { pageviews, sessions };
}

// Opportunistic inline trigger — mirrors searchHistoryService.pruneHistory,
// which runs inline after each recordSearch insert. recordTrafficEvent
// (trafficRepository.ts) calls maybePruneExpiredTraffic() after persisting; a
// process-local time-gate runs the delete-by-cutoff at most once per window, not
// on every beacon.
let lastPruneAt = 0;
const PRUNE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // at most every 6h per process

export async function maybePruneExpiredTraffic(now = Date.now()): Promise<void> {
  // Test seam — MANDATORY: the test DB is ONE shared remote Postgres
  // (render.com) used concurrently by TASK-482/483/484 and the owner. An inline
  // prune fired from another suite's recordTrafficEvent (ingestion route tests,
  // perf suite) would delete THAT suite's aged fixtures. Any suite that
  // exercises the ingestion path must set ANALYTICS_PRUNE_INLINE_DISABLED=1.
  if (process.env.ANALYTICS_PRUNE_INLINE_DISABLED === "1") return;
  // Defense in depth for the ONE shared render.com test DB: default the inline
  // prune OFF under test so a suite that forgot the flag can never fire the
  // UNSCOPED delete-by-cutoff. A suite that specifically exercises the inline
  // gate opts back in with ANALYTICS_PRUNE_INLINE_ENABLED=1.
  if (process.env.NODE_ENV === "test" && process.env.ANALYTICS_PRUNE_INLINE_ENABLED !== "1") {
    return;
  }
  if (now - lastPruneAt < PRUNE_MIN_INTERVAL_MS) return;
  lastPruneAt = now;
  try {
    await pruneExpiredTraffic();
  } catch {
    /* swallow: never fail the ingest write; retries on the next eligible write */
  }
}

export function __resetPruneGateForTests(): void {
  lastPruneAt = 0;
}
// When TASK-484-02-L01's scheduler seam (runDueScheduledBackups) lands, invoke
// pruneExpiredTraffic() from there instead and delete this inline gate.
