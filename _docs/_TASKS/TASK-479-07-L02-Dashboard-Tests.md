# TASK-479-07-L02: Dashboard Tests
# FileName: TASK-479-07-L02-Dashboard-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Dashboard / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-07-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-07

---

## Overview

Update/extend the Vitest render test for the restyled Dashboard so it asserts the
new section structure (post-restyle headings + states) instead of the old labels,
covering both the loading and the loaded render. This is the regression net that
locks in the L01 restyle without changing any data contract.

- **Goal:** `tests/vitest/ui/dashboard.test.tsx` reflects the restyled
  `DashboardPage` — it asserts loading and loaded states render the expected
  sections and that no raw prototype hrefs leak.
- **Owning module/service:** `tests/vitest/ui/dashboard.test.tsx` (Vitest UI lane),
  exercising `core/admin/ui/dashboard/DashboardPage.tsx`.
- **Source-of-truth docs:**
  - Existing test: `tests/vitest/ui/dashboard.test.tsx`
  - Render helper: `tests/utils/adminRouterRender.tsx` (`renderAdminUi`)
  - Data contract: `core/services/dashboard/dashboardTypes.ts` (`DashboardPayload`)
  - `_docs/TESTING_STRATEGY.md` (Vitest = Bun-free admin/UI lane)
- **Out of scope:** No runtime/E2E tests; no data-layer test changes
  (`dashboardClient` coverage stays in `tests/vitest/admin/dashboardClient.test.ts`);
  no snapshot churn of unrelated screens.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and admin paths). The test asserts the always-rendered nav
link emits its canonical resolved href (`/admin/pages`), guarding the "no
hand-built hrefs" rule, but does not touch auth, RBAC, or network behavior.

---

## Implementation Pseudocode

```tsx
// tests/vitest/ui/dashboard.test.tsx
import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { DashboardPage } from "../../../core/admin/ui/dashboard/DashboardPage";
// No `adminPaths` object exists: link helpers live in
// core/admin/utils/adminPaths.ts (resolveAdminHref/withAdminBasePath…). The SSR
// helper renders at base "/admin", so AdminLink href="/pages" → "/admin/pages";
// assert that literal directly rather than calling a non-existent builder.

// 1) LOADING STATE — initial server render (fetch not yet resolved under renderToString)
test("DashboardPage renders header + loading affordance", () => {
  const html = renderAdminUi(<DashboardPage />);
  expect(html).toContain("Dashboard");                 // PageHeader title
  expect(html).toMatch(/Loading dashboard|aria-busy="true"/); // loading affordance preserved
});

// 2) RESTYLED SECTIONS — assert new section headings exist in the initial render
test("DashboardPage renders restyled sections", () => {
  const html = renderAdminUi(<DashboardPage />);
  // Real-data sections kept after restyle:
  expect(html).toContain("Recent Edits");
  expect(html).toContain("Content breakdown");
  expect(html).toContain("Site Health");
  expect(html).toContain("Security Status");
});

// 3) LINK CANONICALIZATION — the always-rendered "All pages" link is canonicalized
test("DashboardPage canonicalizes its nav links", () => {
  const html = renderAdminUi(<DashboardPage />);          // base path "/admin"
  expect(html).toContain("/admin/pages");                 // AdminLink href="/pages" → resolveAdminHref
  expect(html).not.toContain('href="/pages"');            // raw prototype literal gone
});

// NOTE: DashboardPage always fetches on mount (no initial-data prop) and the SSR
// `renderAdminUi` helper runs no effects, so a LOADED-STATE assertion is NOT
// achievable here (single snapshot = loading/empty state). If real totals/donut
// coverage is wanted, add a SEPARATE test under `tests/vitest/ui-integration/`
// using happy-dom + `createRoot`/`React.act` with a `globalThis.fetch` stub
// returning a fixture `DashboardPayload` (pattern:
// tests/vitest/ui-integration/admin-shell-request-budget.test.tsx). Keep the
// fixture aligned to dashboardTypes.ts (reject drift).
```

**Data flow:** `renderAdminUi(<DashboardPage />)` server-renders the page through
the real `AdminRouterProvider`; assertions read the returned HTML string. The
mount fetch does not resolve during `renderToString`, so the initial render is the
loading/empty state — assert that explicitly (this is why L01 must keep a loading
affordance and `?? EMPTY_*` fallbacks so the render never throws).

**Error handling:** the test must not mock the network unless a loaded-state
fixture is required; if added, inject the payload through the component's existing
prop/seam (do not reach into module internals). Keep assertions resilient to
copy tweaks by matching headings, not full sentences.

**Regression-test shape:**

- Loading state: header + loading affordance render without throwing.
- Restyled sections: the real-data **static** section headings are present
  (donut segments / stat values / recently-edited rows are data-gated and do NOT
  render under the SSR helper — don't assert them here).
- Link canonicalization: the canonical resolved href (`/admin/pages`) is present
  and the raw prototype literal (`href="/pages"`) is absent.
- (Optional, ui-integration lane) Loaded state: a `globalThis.fetch` stub +
  `createRoot`/`React.act` drives a fixture `DashboardPayload` → real
  totals/donut render — placed under `tests/vitest/ui-integration/`, NOT under
  the SSR `renderAdminUi` helper.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboard.test.tsx`
- Confirm `tests/vitest/admin/dashboardClient.test.ts` still passes (unchanged
  contract).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-07-L02`.
- If a loaded-state fixture is introduced, note the fixture location so future
  Dashboard data changes update it alongside `dashboardTypes.ts`.
