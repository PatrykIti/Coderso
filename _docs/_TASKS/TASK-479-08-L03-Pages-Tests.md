# TASK-479-08-L03: Pages Tests
# FileName: TASK-479-08-L03-Pages-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Pages) / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-08-L01, TASK-479-08-L02
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-08

---

## Overview

Add and adjust Vitest coverage for the restyled Pages screens: assert the list
renders its new structure across states (loading / cached / empty / selection) and
that the page editor renders the restyled chrome + the floating control panel with
a working show/hide toggle — while keeping every pre-existing page-list and
page-editor suite green.

- **Goal:** Lock the L01/L02 visual-structure changes behind Vitest so the
  redesign cannot silently regress, and protect the canvas `data-*` hooks and the
  floating-panel control model.
- **Owning module/service:** `tests/vitest/ui/page-list.test.tsx`,
  `tests/vitest/ui/page-editor.test.tsx`, plus a new
  `tests/vitest/ui/page-editor-floating-panel.test.tsx` (or
  `tests/vitest/ui-integration/` if it needs the admin router harness).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane is the
  Bun-free admin/UI lane; do not move runtime tests here for coverage),
  `_docs/PAGE_MODEL.md` / `_docs/PREVIEW_SPEC.md` for behavior invariants the tests
  must not contradict.
- **Out of scope:** No new product code, no runtime (Bun) tests, no E2E coverage
  beyond the optional real-input playwright check called out in L02. Do not add
  network mocks that exercise endpoints — these are render/state tests using the
  existing `renderAdminUi` harness and cache-localStorage seeding.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests assert presentation/structure and the
preserved routing/cache hooks only; they introduce no new auth or network surface.

---

## Implementation Pseudocode

```tsx
// tests/vitest/ui/page-list.test.tsx  (extend the existing file)
import { renderAdminUi } from "../../utils/adminRouterRender";
import { PageListPage } from "../../../core/admin/ui/pages/PageListPage";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

test("PageListPage renders restyled header, status tabs, and columns", () => {
  const html = renderAdminUi(<PageListPage />);
  // keep existing: "Pages", "Templates", "New", "Loading pages",
  //   href="/admin/advanced/page-templates", Templates-before-New ordering
  // add structure: description line, the REAL status tab labels
  //   (All/Published/Drafts/Scheduled/Archived — no "Trash"/"Review", which are
  //   not in the PageStatus enum), and the column headers
  //   Title/Status/Author/Updated/Views
  expect(html).toContain("Status");
  expect(html).toContain("Author");
  expect(html).toContain("Updated");
  expect(html).toContain("Views");
});

test("PageListPage cached render shows StatusBadge + Views without loading", () => {
  // reuse the existing localStorage(cacheKeys.pagesList) seeding pattern already
  // in this file; assert a seeded page title renders, "Loading pages" does NOT,
  // and the StatusBadge label for its status is present (published/draft/…).
});
// Tab switch must NOT trigger a network/refetch. The SSR `renderAdminUi`
// (renderToString) harness renders a single snapshot and CANNOT simulate clicking
// a tab / driving setStatusFilter — do not assert post-click inactive-tab content
// here. Cover the "filter the already-loaded items, no fetch" property by unit-
// testing the pure `filterPages(items, query, status, author)` in
// tests/vitest/ui/page-list-filters.test.ts (status === "all" || page.status ===
// status), which is the actual no-refetch contract.
```

```tsx
// tests/vitest/ui/page-editor.test.tsx (extend) — KEEP existing data-* assertions:
//   data-page-editor-canvas-scroller / -canvas-frame / -canvas-device="desktop"
//   and "Add section", "Layers", "Page settings", "Preview", "History", "Publish".
// Add restyle assertions: status/Unsaved pill chrome present; the floating control
// panel container renders; the panel show/hide toggle is present (aria-pressed).

// tests/vitest/ui/page-editor-floating-panel.test.tsx (NEW)
test("Page editor renders the floating control panel and a show/hide toggle", () => {
  const html = renderAdminUi(<PageEditorPage />);
  // assert the floating panel wrapper + toggle button (by aria-label
  // "Hide panel"/"Show panel" or aria-pressed) exist, and that the legacy
  // dark side-rails are not the control home for the page builder.
});
// If asserting toggle BEHAVIOR (open->closed) is needed, render with a testing
// renderer that supports state (not just renderToString); otherwise assert the
// default-open structure only and leave interaction to the v2-flow suite.
```

**Data flow:** tests use the existing `renderAdminUi` SSR-string harness and the
established `cacheKeys.pagesList` localStorage seeding; no new harness. Assertions
target stable text/`data-*`/`aria-*` hooks, never Tailwind class strings (which
change with the restyle).

**Error handling:** none added; tests are deterministic render/state assertions.
If the chosen harness cannot exercise the panel toggle interaction, assert the
default structure and document the gap rather than introducing a flaky interaction
test.

**Regression-test shape:**
- List: header + description + status tabs (All/Published/Drafts/Scheduled/Archived)
  + five column headers; cached-vs-loading branch; StatusBadge label; selection/
  bulk-bar appearance; Templates href intact; no refetch on tab switch (asserted via
  the pure `filterPages` unit test in `page-list-filters.test.ts`, not SSR interaction).
- Editor: restyled chrome + status/Unsaved pill; floating panel + show/hide toggle;
  all canvas `data-*` hooks intact; existing v2-flow/authoring-canvas suites green.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-list-filters.test.ts tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-floating-panel.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx`
- Full pages/page-builder Vitest sweep before closure:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-editor-* tests/vitest/pageBuilder tests/vitest/pages`
- State clearly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + **TASK-479-08-L03**
  (and note the new `page-editor-floating-panel` suite).
- No contract-doc changes (test-only leaf).
