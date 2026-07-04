# TASK-483-01-L03: Traffic Repository Writers And Readers
# FileName: TASK-483-01-L03-Traffic-Repository-Writers-And-Readers.md

**Parent Subtask:** TASK-483-01
**Priority:** High
**Category:** Tools / Analytics / Services
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L01, TASK-483-01-L02
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Provide the thin DB access layer that ingestion writes through and
  aggregation reads through, so neither layer hand-writes Drizzle queries.
- **Owning module(s) to create:** `core/services/analytics/trafficRepository.ts`.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/ORM_SPEC.md`.
- **Out-of-scope:** HTTP/route concerns, aggregation math (TASK-483-04),
  retention pruning (TASK-483-06). Keep business rules out of the repository.

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
  return { sessionId, isNewSession };
}

// Read helpers consumed by aggregation (TASK-483-04). Range-scoped, index-backed.
export async function selectPageviewsInRange(start: Date, end: Date) { /* ... */ }
export async function selectSessionsInRange(start: Date, end: Date) { /* ... */ }
export async function deletePageviewsOlderThan(cutoff: Date) { /* used by TASK-483-06 */ }
```

Data flow: ingestion route → `recordTrafficEvent` (session upsert within a
rolling window + one pageview insert). Aggregation reads via `select... InRange`.
The 30-minute window encodes the session/bounce definition (single-pageview
session = bounce).

Error handling: repository surfaces DB errors as `analytics_persist_failed`
(machine-readable); the route maps it through `mapAnalyticsError`. Writes are
idempotent enough that a duplicate beacon at worst increments pageview count.

Regression-test shape (Bun, DB-backed,
`tests/integration/analytics/trafficRepository.test.ts`):

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
  only owned rows. `set -a && source .env && set +a` first.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
