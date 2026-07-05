# TASK-483-06-L01: Retention Pruning And Privacy Enforcement
# FileName: TASK-483-06-L01-Retention-Pruning-And-Privacy-Enforcement.md

**Parent Subtask:** TASK-483-06
**Priority:** High
**Category:** Tools / Analytics / Privacy / Retention
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L03, TASK-483-02-L02
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Bound data retention and consolidate the privacy posture: prune raw
  pageviews/sessions older than a configurable window, and centralize the
  enabled/DNT/consent + salt-rotation policy so the pipeline stays privacy-safe.
- **Owning module(s) to create:**
  `core/services/analytics/trafficRetentionService.ts` (`pruneExpiredTraffic`
  with an injectable `TrafficPruners` repository seam for shared-DB test safety,
  `maybePruneExpiredTraffic`, `resolveRetentionDays`,
  `__resetPruneGateForTests`). Repository helpers:
  REUSE both raw pruners `deletePageviewsOlderThan` and
  `deleteSessionsOlderThan` — BOTH are declared by TASK-483-01-L03 in
  `trafficRepository.ts` (which owns declaration but not policy/triggering);
  this leaf adds no repository helper.
  Trigger pruning **opportunistically/inline on the ingestion
  path** — there is no scheduler/cron in the repo today, so retention rides the
  write path exactly like `core/services/search/searchHistoryService.ts`
  `pruneHistory` (which runs inline after each `recordSearch` insert).
  This leaf inserts the single `await maybePruneExpiredTraffic();` call at the
  **RESERVED retention-hook marker** that TASK-483-01-L03 already places inside
  `recordTrafficEvent` in `core/services/analytics/trafficRepository.ts` (after
  the pageview insert, before the return; declared by 01-L03, and the ingestion
  route 02-L02 calls `recordTrafficEvent`) — that one in-function edit at the
  agreed marker is this leaf's ONLY `trafficRepository.ts` change and is safe
  because the land order is strictly sequential (01 → … → 06, single writer per
  source file at any time). `maybePruneExpiredTraffic` is imported from
  `./trafficRetentionService` (this leaf's module). A cheap process-local time-gate (below) keeps the
  delete-by-cutoff off the hot path. **Migration note:** when TASK-484-02-L01 lands its in-process
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

// Repository seam — MANDATORY for shared-DB test safety. The two raw pruners are
// injectable. In production they default to the real TASK-483-01-L03 helpers,
// which perform an UNSCOPED global delete-by-cutoff (delete ALL rows older than
// the cutoff). That is correct in a single production DB but is DESTRUCTIVE
// against the ONE shared remote render.com test Postgres: it would delete aged
// rows this leaf's suite did NOT create — 483's own trafficAggregation
// fixtures, the parallel TASK-482/484 streams' rows, and the owner's data.
// Tests therefore NEVER call this with the real repo; they inject pure stubs
// (policy/ordering) or fixture-SCOPED delete fns (real FK cascade) — see the
// regression shape below.
export type TrafficPruners = {
  deletePageviewsOlderThan: (cutoff: Date) => Promise<number>;
  deleteSessionsOlderThan: (cutoff: Date) => Promise<number>;
};
const realPruners: TrafficPruners = { deletePageviewsOlderThan, deleteSessionsOlderThan };

export async function pruneExpiredTraffic(
  now = new Date(),
  repo: TrafficPruners = realPruners,
): Promise<{ pageviews: number; sessions: number }> {
  const cutoff = addDays(now, -resolveRetentionDays());
  // Firm order: (1) deletePageviewsOlderThan — reused from TASK-483-01-L03 —
  // bounds old pageviews that belong to still-retained sessions; then
  // (2) deleteSessionsOlderThan — also declared by TASK-483-01-L03 in
  // trafficRepository.ts — removes expired sessions, whose remaining pageviews
  // go via the FK onDelete: "cascade" defined in TASK-483-01-L02.
  const pv = await repo.deletePageviewsOlderThan(cutoff);   // returns rowCount
  const ss = await repo.deleteSessionsOlderThan(cutoff);    // cascades remaining pageviews
  return { pageviews: pv, sessions: ss };
}

// Opportunistic inline trigger — mirrors core/services/search/searchHistoryService.ts
// pruneHistory, which runs inline after each recordSearch insert. recordTrafficEvent
// (trafficRepository.ts, TASK-483-01-L03) calls maybePruneExpiredTraffic() after
// persisting — THIS leaf inserts that call; a process-local time-gate runs the
// delete-by-cutoff at most once per window, not on every beacon.
let lastPruneAt = 0;
const PRUNE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // at most every 6h per process
export async function maybePruneExpiredTraffic(now = Date.now()): Promise<void> {
  // Test seam — MANDATORY: the test DB is ONE shared remote Postgres
  // (render.com) used concurrently by TASK-482/483/484 and the owner. An
  // inline prune fired from another suite's recordTrafficEvent (ingestion
  // route tests, perf suite) would delete THAT suite's aged fixtures. Any
  // suite that exercises the ingestion path must set
  // ANALYTICS_PRUNE_INLINE_DISABLED=1; the retention suite exercises
  // pruneExpiredTraffic() ONLY through the injected repository seam (pure stubs
  // or fixture-scoped deletes — never the real unscoped pruners against the
  // shared DB) and resets the gate via the helper below.
  if (process.env.ANALYTICS_PRUNE_INLINE_DISABLED === "1") return;
  // Defense in depth for the ONE shared render.com test DB: default the inline
  // prune OFF under test so a suite that forgot ANALYTICS_PRUNE_INLINE_DISABLED
  // can never fire the UNSCOPED delete-by-cutoff. A suite that specifically
  // exercises the inline gate opts back in with ANALYTICS_PRUNE_INLINE_ENABLED=1.
  if (process.env.NODE_ENV === "test" && process.env.ANALYTICS_PRUNE_INLINE_ENABLED !== "1") return;
  if (now - lastPruneAt < PRUNE_MIN_INTERVAL_MS) return;
  lastPruneAt = now;
  try { await pruneExpiredTraffic(); } catch { /* swallow: never fail the ingest write */ }
}
export function __resetPruneGateForTests(): void { lastPruneAt = 0; }
// When TASK-484-02-L01's scheduler seam (runDueScheduledBackups) lands, invoke
// pruneExpiredTraffic() from there instead and delete this inline gate.
```

Data flow: the ingestion path (`recordTrafficEvent` in `trafficRepository.ts`,
declared by TASK-483-01-L03 and called by the 02-L02 route) calls
`maybePruneExpiredTraffic` after persisting each event; once per process-local
window the gate fires `pruneExpiredTraffic`, sessions older than the window are
removed and their pageviews cascade (FK `onDelete: "cascade"` from
TASK-483-01-L02). Aggregation queries naturally return only retained data.

Error handling: a prune failure must **never** fail the ingestion write — the
inline call swallows and logs the error and retries on the next eligible write;
the prune is idempotent (delete-by-cutoff). The optional manual trigger, if
added, introduces **no new error code**: `mapAnalyticsError` is landed and
single-owned by TASK-483-02-L02, whose switch is a **closed enumeration**
(`analytics_beacon_invalid` / `analytics_persist_failed` /
`analytics_query_failed` + the `internal_error` default) that no other leaf may
restructure (04-L03 only adds the already-present `analytics_query_failed`). A
retention/prune failure therefore falls through to that `internal_error` default
(500). This leaf adds NO `analytics_retention_failed` case and never becomes a
second writer on `analyticsRoutes.ts`.

Standing-gate note: by the time this leaf lands, the `test:bun` glob ALREADY
covers `tests/integration/analytics/` — TASK-483-01-L02 is the single owner that
added that directory to `package.json` `test:bun` (and mirrored it in
`_docs/TESTING_STRATEGY.md`), and 01-L02 lands first under the strict 01 → … → 06
order. This leaf authors the retention suite at that path but does NOT edit any
gate definitions (implementation subtasks stay single-writer and off the
board/config closure surfaces) — in particular it does NOT re-add the directory
to `test:bun`. The remaining standing-CI wiring this suite depends on — adding
`tests/integration/analytics` to the `test:integration` glob and registering the
suite in `scripts/run-bun-lane.ts` (which uses an explicit `routeSuites`
allowlist) — is owned and verified by the closure leaf **TASK-483-06-L02**, so
this retention cascade/cutoff/ordering regression runs in STANDING CI (otherwise
a bad prune order → FK violation, or a wrong cutoff, could ship undetected).

Regression-test shape (Bun, DB-backed,
`tests/integration/analytics/trafficRetention.test.ts`):

```ts
// Shared remote test DB: this suite must NEVER fire the real UNSCOPED
// delete-by-cutoff (deletePageviewsOlderThan/deleteSessionsOlderThan) against
// the shared render.com Postgres — that would delete aged rows the suite did
// NOT create (483's own trafficAggregation fixtures, the TASK-482/484 streams,
// the owner). pruneExpiredTraffic is exercised ONLY via its injected repository
// seam: pure stubs for policy/ordering, fixture-scoped deletes for the real FK
// cascade. Assert ONLY on this suite's own fixtures; never assert global delete
// counts (res.sessions/res.pageviews) or table-wide state; clean up only rows
// this suite created.

// (1) Policy + firm ordering — pure stubs, NO DB touched, safe under any
// concurrency and the only place the cutoff/order contract is asserted.
test("computes cutoff from retention window and prunes pageviews then sessions", async () => {
  const calls: Array<[string, Date]> = [];
  const stub: TrafficPruners = {
    deletePageviewsOlderThan: async (c) => { calls.push(["pv", c]); return 0; },
    deleteSessionsOlderThan:  async (c) => { calls.push(["ss", c]); return 0; },
  };
  process.env.ANALYTICS_RETENTION_DAYS = "365";
  const now = new Date("2026-01-01T00:00:00Z");
  await pruneExpiredTraffic(now, stub);
  expect(calls.map((c) => c[0])).toEqual(["pv", "ss"]);            // firm order
  expect(calls[0][1]).toEqual(addDays(now, -365));                 // correct cutoff
});

// (2) Real FK cascade — a SINGLE small fixture-scoped DB smoke. The injected
// deletes are scoped to THIS run's marker (path/entry_path under fixtureId AND
// older than cutoff), so the real delete cascade (onDelete "cascade" from
// TASK-483-01-L02) is exercised on OWNED rows ONLY; the shared table's other
// rows (aged fixtures of the owner / TASK-482/484) are never touched.
test("deleting an aged session cascades its pageviews (fixture-scoped)", async () => {
  const fixtureId = `traffic-retention-${crypto.randomUUID()}`;    // unique scope marker
  await seedSessionWithPageview({ startedAt: daysAgo(400), fixture: fixtureId }); // aged, owned
  await seedSessionWithPageview({ startedAt: daysAgo(10),  fixture: fixtureId }); // recent, owned
  const scoped: TrafficPruners = {
    // delete-by-cutoff ANDed with the fixture marker — never table-wide
    deletePageviewsOlderThan: (c) => deleteOwnedPageviewsOlderThan(fixtureId, c),
    deleteSessionsOlderThan:  (c) => deleteOwnedSessionsOlderThan(fixtureId, c), // fires real cascade
  };
  await pruneExpiredTraffic(new Date(), scoped);
  expect(await countSessionsForFixture(fixtureId, { olderThanDays: 365 })).toBe(0); // own aged session gone
  expect(await countSessionsForFixture(fixtureId)).toBe(1);                          // own recent session kept
  expect(await countPageviewsForFixture(fixtureId)).toBe(1); // aged session's pageview cascaded away
  // afterAll: delete the surviving fixture rows (session + its pageview).
});

test("retention days clamps to [30,1095]", () => {
  process.env.ANALYTICS_RETENTION_DAYS = "5000";
  expect(resolveRetentionDays()).toBe(1095);
});
```

## Testing Requirements

- **Bun** prune suite that exercises `pruneExpiredTraffic` ONLY through its
  injected repository seam — pure stubs for the cutoff/ordering policy and
  fixture-scoped deletes for the real FK cascade; it MUST NOT call the real
  UNSCOPED `deletePageviewsOlderThan`/`deleteSessionsOlderThan` against the
  shared render.com Postgres (that would delete aged rows the suite did not
  create). Uniquely scoped fixtures; assert only on own-fixture rows (never
  global delete counts or table emptiness — the DB is shared with TASK-482/484
  and the owner); clean up only owned rows; `set -a && source .env && set +a`.
- EVERY suite that drives `recordTrafficEvent` (directly OR via the ingestion
  route) MUST set `ANALYTICS_PRUNE_INLINE_DISABLED=1` so its writes never fire
  the inline UNSCOPED delete-by-cutoff against the shared render.com Postgres —
  which would purge aged rows the suite did not create (04-L02's 1980-anchored
  aggregation fixtures, this leaf's own `daysAgo(400)` rows, and the
  TASK-482/484 + owner data). The complete list is:
  `tests/integration/analytics/trafficRepository.test.ts` (TASK-483-01-L03,
  which calls `recordTrafficEvent` directly and is re-run in 06-L02's full
  matrix), `tests/integration/routes/publicAnalytics.test.ts` and
  `tests/security/analyticsBeacon.test.ts` (TASK-483-02-L02, public route), and
  `tests/perf/analyticsIngestion.test.ts` (TASK-483-06-L02, perf). Additionally,
  `maybePruneExpiredTraffic` defaults OFF under `NODE_ENV=test` (see pseudocode)
  as a backstop for any suite that forgets the flag. This retention suite itself
  uses `__resetPruneGateForTests()` when exercising the gate and only ever fires
  the delete through the injected repository seam (pure stubs / fixture-scoped
  deletes), never the real unscoped pruners.
- **Bun** security gate assertion that no raw IP/UA column exists to leak and
  that pruning bounds `visitor_hash` retention.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
