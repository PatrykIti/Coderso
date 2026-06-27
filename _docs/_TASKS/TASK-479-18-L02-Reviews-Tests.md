# TASK-479-18-L02: Reviews Tests
# FileName: TASK-479-18-L02-Reviews-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Reviews / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-18-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-18
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add a Vitest render test that locks the restyled Reviews screen's structure and
proves the restyle preserved behavior: the **stat row** shows a derived average +
real status counts (no fabricated numbers), the **status Tabs** keep all four
statuses plus "all" with live counts, the **review cards** render one per filtered
review with author / stars / status badge / body precedence, and the
**Approve/Reject** affordances still call the existing moderation path.

- **Goal:** Guard L01 against regressions with focused, deterministic render
  tests in the Bun-free admin Vitest lane.
- **Owning module/service:**
  `tests/vitest/ui-integration/reviews-restyle.test.tsx` (new), exercising
  `core/admin/ui/reviews/ReviewsModerationPage.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`. Pattern reference:
  existing `tests/vitest/ui/reviews-page.test.tsx` (its `renderAdminUi` +
  `cacheKeys.reviewsList` localStorage seed harness) and
  `tests/vitest/admin/reviewsClient.test.ts`.
- **Out of scope:** No runtime/Bun coverage moves; no new product code (that is
  L01); no API/contract tests beyond what the UI render already exercises. Do not
  re-test `reviewsClient` cache mechanics that `reviewsClient.test.ts` already
  covers.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests seed the cache via `localStorage` and
mock client mutations exactly as the existing reviews suites do; no real network,
secrets, or RBAC bypass.

---

## Implementation Pseudocode

Reuse the established harness from `tests/vitest/ui/reviews-page.test.tsx`
(`renderAdminUi` from `tests/utils/adminRouterRender`, the `createLocalStorage`
helper, and the `cacheKeys.reviewsList` `{ value, savedAt }` seed shape). Do NOT
invent a new render utility. `renderAdminUi` returns a server-rendered HTML
**string** (`renderToString`) — there is NO RTL / `@testing-library`, `jest-dom`, or
`user-event` in this repo. Assert on the rendered string for structure. Where a real
click is needed, use the repo's DOM idiom (NOT `renderAdminUi`): add a
`// @vitest-environment happy-dom` pragma, set
`IS_REACT_ACT_ENVIRONMENT = true`, mount with `createRoot` from `react-dom/client`
inside `React.act`, and dispatch `element.click()` inside `React.act` — the pattern in
`tests/vitest/ui-integration/tabs-preview-activation.test.tsx`. Do NOT assert
inactive-tab panel content under the SSR string (only always-rendered trigger labels
and card content).

```tsx
// tests/vitest/ui-integration/reviews-restyle.test.tsx
import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { ReviewsModerationPage } from "../../../core/admin/ui/reviews/ReviewsModerationPage";
import type { ReviewRecord } from "../../../core/admin/services/reviewsClient";
import { renderAdminUi } from "../../utils/adminRouterRender";

// reuse createLocalStorage() + seedReviews() copied from reviews-page.test.tsx
function seedReviews(records: Partial<ReviewRecord>[]) {
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  storage.setItem(cacheKeys.reviewsList, JSON.stringify({
    value: records.map((r, i) => ({
      id: `r${i}`, entityType: "service", entityId: "svc-1",
      status: "pending", rating: 5, title: null, body: "Body text",
      authorName: "Alice", authorEmail: "a@x.com", metadata: {},
      moderatedBy: null, moderatedAt: null,
      createdAt: "2026-02-19T00:00:00.000Z", updatedAt: "2026-02-19T00:00:00.000Z",
      publishedAt: null, ...r,
    })),
    savedAt: Date.now(),
  }));
}
afterEach(() => { vi.restoreAllMocks(); /* restore/delete globalThis.localStorage */ });

test("stat row shows a derived average rating + real counts (no fabricated numbers)", () => {
  seedReviews([{ rating: 5, status: "approved" }, { rating: 3, status: "pending" }]);
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });
  expect(html).toContain("Average rating");
  expect(html).toContain("4.0");            // (5+3)/2 derived, NOT the prototype's "4.6"
  expect(html).not.toContain("4.6");        // guard against the fabricated mock value
  expect(html).not.toContain("+9.2%");      // no fake trend delta
});

test("status tabs keep all four statuses plus 'all' with live counts", () => {
  seedReviews([{ status: "pending" }, { status: "approved" }, { status: "rejected" }, { status: "spam" }]);
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });
  for (const label of ["All", "Pending", "Approved", "Rejected", "Spam"]) {
    expect(html).toContain(label);          // four-status model preserved (prototype only had 3)
  }
});

test("review cards render author, body precedence, and status per record", () => {
  seedReviews([{ authorName: "Bob", title: "Loved it", body: "ignored when title set", status: "pending" }]);
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });
  expect(html).toContain("Bob");
  expect(html).toContain("Loved it");        // title wins over body
});

test("renders empty/loading state without crashing when cache is absent", () => {
  // no seed -> isLoading true
  const html = renderAdminUi(<ReviewsModerationPage />, { path: "/admin/advanced/reviews" });
  expect(html).toContain("Reviews");
  expect(html).toContain("Loading reviews");
});

// Optional interaction test (repo DOM idiom — NOT renderAdminUi, which is SSR-only):
// add `// @vitest-environment happy-dom`, set IS_REACT_ACT_ENVIRONMENT = true, then
// createRoot(container).render(<ReviewsModerationPage />) inside React.act and call
// el.click() inside React.act (pattern: tabs-preview-activation.test.tsx). Seed one
// pending review, click "Approve", assert updateReviewStatus was called with
// (id, "approved"). Mock the module the page imports via
// vi.mock("@/services/reviewsClient", ...) (the vitest `@`→core/admin alias resolves
// it); do NOT hit network.
```

**Data flow:** seed `cacheKeys.reviewsList` via `localStorage` so the page
hydrates from cache (lazy initial state in `useReviews`) → render → assert HTML.
The background `listReviewsCached({ force: true })` fetch is not awaited in the
SSR string render, so tests assert the cache-hydrated output (matches the existing
`reviews-page.test.tsx` approach).

**Error handling (test concerns):** restore/delete `globalThis.localStorage` in
`afterEach` so suites stay independent; for the optional Approve interaction, mock
`updateReviewStatus` to resolve and assert the call args — never depend on real
timers or network.

**Regression-test shape:** derived average + real counts (no fabricated numbers);
four-status Tabs with "all"; card cardinality + author + body precedence; empty/
loading state; optional moderation-action call assertion.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/reviews-restyle.test.tsx`
- Regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/reviews-page.test.tsx tests/vitest/admin/reviewsClient.test.ts`
- State explicitly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-18-L02`.
- No contract-doc change expected (tests only); note the new suite path in the
  changelog entry.
