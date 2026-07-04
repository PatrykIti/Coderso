# TASK-483-06-L01: Retention Pruning And Privacy Enforcement
# FileName: TASK-483-06-L01-Retention-Pruning-And-Privacy-Enforcement.md

**Parent Subtask:** TASK-483-06
**Priority:** High
**Category:** Tools / Analytics / Privacy / Retention
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L03, TASK-483-02-L02
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Bound data retention and consolidate the privacy posture: prune raw
  pageviews/sessions older than a configurable window, and centralize the
  enabled/DNT/consent + salt-rotation policy so the pipeline stays privacy-safe.
- **Owning module(s) to create:**
  `core/services/analytics/trafficRetentionService.ts` (`pruneExpiredTraffic`,
  `maybePruneExpiredTraffic`, `resolveRetentionDays`); extend `trafficRepository.ts`
  reader `deletePageviewsOlderThan` / `deleteSessionsOlderThan` (declared in
  TASK-483-01-L03). Trigger pruning **opportunistically/inline on the ingestion
  path** — there is no scheduler/cron in the repo today, so retention rides the
  write path exactly like `core/services/search/searchHistoryService.ts`
  `pruneHistory` (which runs inline after each `recordSearch` insert).
  `recordTrafficEvent` (TASK-483-02-L02) calls `maybePruneExpiredTraffic()` after
  persisting; a cheap process-local time-gate (below) keeps the delete-by-cutoff
  off the hot path. **Migration note:** when TASK-484-02-L01 lands its in-process
  scheduler seam (`core/server/jobs/backupScheduler.ts` / `runDueScheduledBackups`),
  call `pruneExpiredTraffic()` from there instead and drop the inline gate — no
  change to the service's public API.
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/DATA_MODEL.md`.
- **Out-of-scope:** ingestion (TASK-483-02), aggregation (TASK-483-04). No new
  admin UI; retention is a backend policy.

## Security Contract

- **Endpoint visibility:** none (internal service invoked inline from the
  ingestion path). If a manual trigger is exposed, it is internal
  `/admin/api/analytics/traffic/prune` (POST) behind `content:write` + CSRF;
  default is the opportunistic inline prune only (no public surface).
- **Auth model:** runs in the trusted backend context; a manual trigger requires
  admin session + CSRF.
- **RBAC:** `content:write` for the optional manual trigger.
- **CSRF expectations:** required if the manual POST trigger is added.
- **Rate-limit bucket:** `admin_write` for the optional manual trigger.
- **Validation schema-owner module:** retention window parsed/clamped in the
  service (`resolveRetentionDays`, default 365, min 30, max 1095); env
  `ANALYTICS_RETENTION_DAYS`.
- **Anti-abuse controls:** N/A (internal).
- **Secret/PII handling:** pruning is the privacy backstop — it deletes the
  oldest `visitor_hash`-bearing rows so the hashed identifiers do not accumulate
  indefinitely. Document salt rotation: changing `ANALYTICS_IP_HASH_SECRET`
  invalidates cross-period visitor continuity by design (acceptable). No raw PII
  exists to purge because none was ever stored.

## Implementation Pseudocode

```ts
export function resolveRetentionDays(): number {
  const raw = Number(process.env.ANALYTICS_RETENTION_DAYS);
  if (!Number.isFinite(raw)) return 365;
  return Math.min(Math.max(Math.floor(raw), 30), 1095);
}

export async function pruneExpiredTraffic(now = new Date()): Promise<{ pageviews: number; sessions: number }> {
  const cutoff = addDays(now, -resolveRetentionDays());
  // Delete pageviews first (or rely on FK cascade from sessions); then sessions.
  const pv = await deletePageviewsOlderThan(cutoff);     // returns rowCount
  const ss = await deleteSessionsOlderThan(cutoff);      // cascades remaining pageviews
  return { pageviews: pv, sessions: ss };
}

// Opportunistic inline trigger — mirrors core/services/search/searchHistoryService.ts
// pruneHistory, which runs inline after each recordSearch insert. recordTrafficEvent
// (TASK-483-02-L02) calls maybePruneExpiredTraffic() after persisting; a process-local
// time-gate runs the delete-by-cutoff at most once per window, not on every beacon.
let lastPruneAt = 0;
const PRUNE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // at most every 6h per process
export async function maybePruneExpiredTraffic(now = Date.now()): Promise<void> {
  if (now - lastPruneAt < PRUNE_MIN_INTERVAL_MS) return;
  lastPruneAt = now;
  try { await pruneExpiredTraffic(); } catch { /* swallow: never fail the ingest write */ }
}
// When TASK-484-02-L01's scheduler seam (runDueScheduledBackups) lands, invoke
// pruneExpiredTraffic() from there instead and delete this inline gate.
```

Data flow: the ingestion path (`recordTrafficEvent`, TASK-483-02-L02) calls
`maybePruneExpiredTraffic` after persisting each event; once per process-local
window the gate fires `pruneExpiredTraffic`, sessions older than the window are
removed and their pageviews cascade (FK `onDelete: "cascade"` from
TASK-483-01-L02). Aggregation queries naturally return only retained data.

Error handling: a prune failure must **never** fail the ingestion write — the
inline call swallows and logs the error and retries on the next eligible write;
the prune is idempotent (delete-by-cutoff). Surface `analytics_retention_failed`
if a manual trigger is added, mapped via `mapAnalyticsError`.

Regression-test shape (Bun, DB-backed,
`tests/integration/analytics/trafficRetention.test.ts`):

```ts
test("prunes rows older than retention window, keeps recent", async () => {
  await seedSession({ startedAt: daysAgo(400) });   // scoped fixtures
  await seedSession({ startedAt: daysAgo(10) });
  const res = await pruneExpiredTraffic();
  expect(res.sessions).toBeGreaterThanOrEqual(1);
  expect(await countSessionsForFixture()).toBe(1);  // recent kept
});
test("retention days clamps to [30,1095]", () => {
  process.env.ANALYTICS_RETENTION_DAYS = "5000";
  expect(resolveRetentionDays()).toBe(1095);
});
```

## Testing Requirements

- **Bun** DB-backed prune suite with uniquely scoped fixtures; clean up only
  owned rows; `set -a && source .env && set +a`.
- **Bun** security gate assertion that no raw IP/UA column exists to leak and
  that pruning bounds `visitor_hash` retention.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
