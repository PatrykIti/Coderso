# TASK-479-22-L02: Widget Library Tests
# FileName: TASK-479-22-L02-Widget-Library-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Widgets / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-22-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-22
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Add a Vitest render test that locks the restyled Widget Library's structure and
proves the restyle preserved behavior: the **category tabs** render only real
registry categories, the **widget card gallery** renders `rounded-2xl` cards with
abstract previews + name + category Badge + Insert/Preview affordances, and the
preserved scaffolding (sr-only section list, table/grid view toggle, status line,
empty state) is intact. The widget metadata registry and lazily-split editor
loading (TASK-467) must remain untouched.

- **Goal:** Guard L01 against regressions with a focused, deterministic render
  test in the Bun-free admin Vitest lane.
- **Owning module/service:** `tests/vitest/ui/widget-library-restyle.test.tsx`
  (new), exercising `core/admin/ui/widgets/WidgetLibraryPage.tsx` + `WidgetCard`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/DESIGN_TOKENS.md`.
  Pattern reference: existing `tests/vitest/ui/widget-library.test.tsx`,
  `tests/vitest/ui/widget-card.test.tsx`,
  `tests/vitest/ui/widget-library-preview-feedback.test.tsx`.
- **Out of scope:** No runtime/Bun coverage moves; no new product code (that is
  L01); no API/contract tests beyond what the UI render already exercises; no
  change to the widget registry or editor bundles.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests render through the shared admin
harness exactly as the existing widget suites do; no real network, secrets, or
RBAC bypass.

---

## Implementation Pseudocode

Reuse the established harness `renderAdminUi` from
`tests/utils/adminRouterRender` (the existing `tests/vitest/ui/widget-library.test.tsx`
renders `WidgetLibraryPage` to an HTML string and asserts structure). Do NOT
invent a new render utility. To exercise the **grid** branch + cards, seed the
catalog cache so visible rows exist, then switch the test to the grid view (or
assert the grid markup that L01 emits) the same way the preview-feedback suite
drives state.

```tsx
// tests/vitest/ui/widget-library-restyle.test.tsx
import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";
// If seeding the catalog cache is needed for card assertions, reuse the cache
// helpers the existing preview-feedback / widget-library suites use
// (getCachedWidgetCatalog seed via cacheKeys + writeCache), NOT a new mock.

test("toolbar card uses the soft rounded-2xl chrome", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);
  expect(html).toContain("Widget Library");
  expect(html).toContain("rounded-2xl");                 // prototype card chrome
  expect(html).toContain("shadow-soft");                 // soft shadow token
  // Preserved scaffolding (must NOT regress from widget-library.test.tsx):
  expect(html).toContain("Available widget library sections:");
  expect(html).toContain("Section:");
  expect(html).toContain("Default view: table");
  expect(html).toContain("Show widgets as table");
  expect(html).toContain("Show widgets as grid");
});

test("category tabs render only real registry categories (no fabricated Marketing)", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);
  // Real taxonomy from widgetCategoryLabels: Layout/Content/Forms/Navigation/Media.
  // The prototype's "Marketing" tab has NO registry equivalent and must be absent.
  expect(html).not.toContain("Marketing");
});

test("grid view renders rounded-2xl widget cards with abstract preview + Insert/Preview", () => {
  // Seed catalog cache with >=1 item, render, drive view -> "grid"
  // (reuse the state-driving approach from widget-library-preview-feedback.test.tsx).
  // Assert a card carries: rounded-2xl chrome, the category Badge text, the
  // widget name, an abstract preview frame ("rounded-xl" + "bg-muted"), and the
  // Insert + Preview affordances (WidgetLibraryRowActions in the `actions` slot).
});

test("preview frames use the warm muted token, not a hard bordered frame", () => {
  // With a seeded catalog + grid view, assert renderPreview output contains
  // "rounded-xl" + "bg-muted" (ported PreviewFrame) and NOT the old
  // "border bg-background/80 shadow-sm" frame.
});
```

**Data flow:** render `WidgetLibraryPage` through `renderAdminUi`; for the card
assertions, seed the catalog cache (lazy initial-cache path) so
`pagination.visibleRows` is non-empty, then assert the grid-view markup L01
emits. Keep each `test` independent (clear any seeded cache between tests).

**Error handling (test concerns):** the SSR string harness has no real timers or
network; do not assert async refetch. Assert the empty-state panel ("No items
match your search.") still renders when the catalog is empty.

**Regression-test shape:** toolbar soft chrome (`rounded-2xl` / `shadow-soft`);
real-only category tabs (no "Marketing"); grid card structure (preview + name +
category Badge + Insert/Preview); ported preview frame token; preserved sr-only
section list, view toggle, status line, and empty state.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/widget-library-restyle.test.tsx`
- Regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widget-card.test.tsx tests/vitest/ui/widget-library-row-actions.test.tsx tests/vitest/ui/widget-library-preview-feedback.test.tsx`
- State explicitly in the closeout if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-22-L02`.
- No contract-doc change expected (tests only); note the new suite path in the
  changelog entry.
