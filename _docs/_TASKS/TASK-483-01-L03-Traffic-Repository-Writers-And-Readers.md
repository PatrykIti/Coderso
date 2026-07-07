# TASK-483-01-L03: Traffic Repository Writers And Readers
# FileName: TASK-483-01-L03-Traffic-Repository-Writers-And-Readers.md

**Parent Subtask:** TASK-483-01
**Priority:** High
**Category:** Tools / Analytics / Services
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L01, TASK-483-01-L02
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Provide the thin DB access layer that ingestion WRITES through
  (session upsert + pageview insert) plus the retention pruners. Aggregation
  (TASK-483-04) reads the tables DIRECTLY with its own scoped
  group-by / count-distinct / join queries — shapes the simple range readers
  cannot express — so this repository owns writes + pruners, not read helpers for
  aggregation.
- **Owning module(s) to create:** `core/services/analytics/trafficRepository.ts`.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/ORM_SPEC.md`.
- **Out-of-scope:** HTTP/route concerns, aggregation math (TASK-483-04),
  retention **policy and triggering** (TASK-483-06) — this leaf does declare
  the raw pruner helpers `deletePageviewsOlderThan` / `deleteSessionsOlderThan`
  that TASK-483-06-L01 calls, but not when/why they run. Keep business rules
  out of the repository.
- **Anticipated later edit (single-writer preserved):** this leaf reserves a
  retention-hook marker inside `recordTrafficEvent` (see pseudocode). TASK-483-06-L01
  is the sole later writer of `trafficRepository.ts` and adds exactly one
  `await maybePruneExpiredTraffic();` line at that marker — no other body change.
  This is safe under the strictly sequential land order (01 → … → 06, one writer
  per source file at a time), so the file never has two concurrent writers.

## Implementation Pseudocode

```ts
import { db } from "../../db/client";
import { analyticsPageviews, analyticsSessions } from "../../db/schema";
import type { NormalizedTrafficEvent } from "./trafficTypes";

const SESSION_WINDOW_MS = 30 * 60 * 1000;

export async function recordTrafficEvent(args: {
  event: NormalizedTrafficEvent;
  visitorHash: string;       // computed in TASK-483-02-L03 (salted, non-PII)
  now?: Date;
}): Promise<{ sessionId: string; isNewSession: boolean }> {
  const now = args.now ?? new Date();
  const windowStart = new Date(now.getTime() - SESSION_WINDOW_MS);

  // Find the most recent live session for this visitor.
  const [open] = await db
    .select({ id: analyticsSessions.id })
    .from(analyticsSessions)
    .where(and(
      eq(analyticsSessions.visitorHash, args.visitorHash),
      gte(analyticsSessions.lastSeenAt, windowStart),
    ))
    .orderBy(desc(analyticsSessions.lastSeenAt))
    .limit(1);

  let sessionId = open?.id;
  let isNewSession = false;
  if (!sessionId) {
    isNewSession = true;
    const [created] = await db.insert(analyticsSessions).values({
      visitorHash: args.visitorHash,
      sourceKind: args.event.sourceKind,
      referrerHost: args.event.referrerHost,
      deviceClass: args.event.deviceClass,
      lang: args.event.lang,
      entryPath: args.event.path,
      exitPath: args.event.path,
      startedAt: now,
      lastSeenAt: now,
    }).returning({ id: analyticsSessions.id });
    sessionId = created.id;
  } else {
    await db.update(analyticsSessions)
      .set({ lastSeenAt: now, exitPath: args.event.path,
              pageviewCount: sql`${analyticsSessions.pageviewCount} + 1` })
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
  // TASK-483-06-L01 adds EXACTLY ONE line here, its ONLY edit to this file:
  //   await maybePruneExpiredTraffic();   // import from "./trafficRetentionService"
  // Placed after the pageview insert and before the return so the opportunistic,
  // process-local time-gated prune rides the write path (mirrors
  // searchHistoryService.pruneHistory after recordSearch). 01-L03 owns this
  // function body; because land order is strictly sequential (01 → … → 06,
  // single writer per source file at any time), 06-L01 is the sole later writer
  // and touches only this marker — recordTrafficEvent stays a one-owner body.
  // ──────────────────────────────────────────────────────────────────────────
  return { sessionId, isNewSession };
}

// NOTE: no read helpers for aggregation. TASK-483-04-L02 issues its own scoped
// group-by / count-distinct / join queries directly against analyticsPageviews /
// analyticsSessions (shapes a simple range reader cannot express), so this
// repository intentionally exposes NO selectPageviewsInRange / selectSessionsInRange.
// It owns WRITES (recordTrafficEvent) and the retention pruners only.

// Retention pruners consumed by TASK-483-06-L01. Both return the deleted rowCount.
// The predicate is cutoff-only (whole-table by-time delete); it CANNOT be scoped by
// visitorHash. Each accepts an optional executor defaulting to `db` so a DB-backed
// test can run the exact production delete inside a `db.transaction` that rolls back
// (non-destructive on the shared render.com Postgres). 06-L01 calls cutoff-only.
type Exec = typeof db; // db | tx handle (Parameters of db.transaction's callback)
export async function deletePageviewsOlderThan(cutoff: Date, exec: Exec = db): Promise<number> {
  // exec.delete(analyticsPageviews).where(lt(analyticsPageviews.createdAt, cutoff))
}
export async function deleteSessionsOlderThan(cutoff: Date, exec: Exec = db): Promise<number> {
  // exec.delete(analyticsSessions).where(lt(analyticsSessions.lastSeenAt, cutoff));
  // the analytics_pageviews.session_id FK (onDelete: "cascade", TASK-483-01-L02)
  // removes any remaining pageviews of pruned sessions — this is the primary pruner.
}
```

Data flow: ingestion route → `recordTrafficEvent` (session upsert within a
rolling window + one pageview insert). Aggregation (TASK-483-04) reads the tables
directly with its own scoped queries — NOT through this repository. The
30-minute window encodes the session/bounce definition (single-pageview
session = bounce).

Error handling: repository surfaces DB errors as `analytics_persist_failed`
(machine-readable); the route maps it through `mapAnalyticsError`. Writes are
idempotent enough that a duplicate beacon at worst increments pageview count.

Regression-test shape (Bun, DB-backed,
`tests/integration/analytics/trafficRepository.test.ts` — this directory is
added to the root `package.json` `test:bun` glob by TASK-483-01-L02; do not
re-edit the script here, just place the suite in the covered directory):

```ts
test("second view in window reuses session and increments count", async () => {
  const a = await recordTrafficEvent({ event: ev("/a"), visitorHash: H, now: t0 });
  const b = await recordTrafficEvent({ event: ev("/b"), visitorHash: H, now: t0plus5m });
  expect(b.isNewSession).toBe(false);
  expect(a.sessionId).toBe(b.sessionId);
});
test("view after window opens a new session", async () => {
  await recordTrafficEvent({ event: ev("/a"), visitorHash: H, now: t0 });
  const c = await recordTrafficEvent({ event: ev("/c"), visitorHash: H, now: t0plus40m });
  expect(c.isNewSession).toBe(true);
});
```

## Security Contract

- **Endpoint visibility:** none (service module).
- **Auth model / RBAC / CSRF:** N/A (route enforces).
- **Rate-limit bucket:** N/A (enforced at the public route, TASK-483-02-L02).
- **Validation schema-owner module:** consumes already-normalized
  `NormalizedTrafficEvent`; the repository must not re-accept raw input.
- **Anti-abuse controls:** N/A (upstream of the route guard).
- **Secret/PII handling:** receives only a pre-hashed `visitorHash`; it must
  never receive or store raw IP/UA. No logging of `visitorHash` or paths at info
  level.

## Testing Requirements

- **Bun** DB-backed suite with uniquely scoped `visitorHash` fixtures; clean up
  only owned rows. `set -a && source .env && set +a` first. The suite lives in
  `tests/integration/analytics/`, which TASK-483-01-L02 adds to the `test:bun`
  glob — confirm it appears in a `bun run test:bun` run.
- Cover the retention pruners **without a destructive global delete on the shared
  DB**. The pruner predicate is cutoff-only (whole-table `where last_seen_at <
  cutoff`) and CANNOT be scoped by `visitorHash`, so do NOT invoke the global
  cutoff delete against render.com. Instead, run the whole insert → prune → assert
  inside a `db.transaction(async (tx) => { … })` that throws at the end to roll
  back: insert an owned old session (unique `visitorHash`) + pageview via `tx`,
  call `deleteSessionsOlderThan(cutoff, tx)` (passing the tx executor), then assert
  via `tx` that the owned session and its cascaded pageviews are gone. Assert only
  on the fixture rows (existence check by the unique `visitorHash` / their
  `sessionId`) — never assert a global `rowCount` that would depend on table
  emptiness, since other streams' and the owner's rows older than `cutoff` are also
  in-scope of the cutoff delete inside the transaction. The rollback discards every
  delete (including those other rows), so nothing is persisted. Pick a `cutoff`
  between the fixture's deliberately-ancient `lastSeenAt` and `now`.
- **Shared-DB safety:** TASK-483-06-L01 later inserts an inline
  `maybePruneExpiredTraffic()` at the reserved marker in `recordTrafficEvent`,
  whose default pruners do an UNSCOPED global delete-by-cutoff. This suite calls
  `recordTrafficEvent` directly (and is re-run in 06-L02's matrix), so it MUST
  set `ANALYTICS_PRUNE_INLINE_DISABLED=1` so those calls never fire the unscoped
  delete against the shared render.com Postgres. (06-L01 also defaults the
  inline prune OFF under `NODE_ENV=test` as a backstop.)
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
