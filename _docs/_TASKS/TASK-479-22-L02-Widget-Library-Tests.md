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

Add Vitest render tests that lock the restyled Widget Library's structure and
prove the restyle preserved behavior: the **section `Select`** (via the sr-only
section list) exposes only real registry categories, the **widget card gallery**
renders `rounded-2xl` cards with abstract previews + name + category Badge + the
kebab **actions** trigger, and the preserved scaffolding (sr-only section list,
table/grid view toggle, status line, empty state) is intact. The widget metadata
registry and lazily-split editor loading (TASK-467) must remain untouched.

- **Goal:** Guard L01 against regressions with a focused, deterministic render
  test in the Bun-free admin Vitest lane.
- **Owning module/service:** `tests/vitest/ui/widget-library-restyle.test.tsx`
  (new), exercising `core/admin/ui/widgets/WidgetLibraryPage.tsx` + `WidgetCard`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/DESIGN_TOKENS.md`.
  Pattern reference: `tests/vitest/ui/widget-library.test.tsx` (SSR
  `renderAdminUi` string snapshot) and
  `tests/vitest/ui/widget-library-preview-feedback.test.tsx` (the interactive
  `// @vitest-environment happy-dom` + `vi.mock("@/services/widgetsClient", …)` +
  `createRoot`/`React.act` lane), plus `tests/vitest/ui/widget-card.test.tsx`.
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

Two lanes, both already in the repo (there is **no** `@testing-library/*` — none
is installed):

- **Lane A — SSR snapshot.** `renderAdminUi` from `tests/utils/adminRouterRender`
  renders `WidgetLibraryPage` to an HTML string (default = **table** view). Use it
  for static assertions: toolbar chrome, the sr-only section list, the status
  line, and the empty state. It renders a SINGLE snapshot, so it CANNOT toggle to
  grid or open the kebab — do NOT assert grid / preview / dropdown content here.
- **Lane B — interactive.** `// @vitest-environment happy-dom` + `createRoot` +
  `React.act`, exactly like `widget-library-preview-feedback.test.tsx`: `vi.mock`
  `@/services/widgetsClient` (`getCachedWidgetCatalog` / `listWidgetCatalogCached`
  → a seeded item), plus `sonner`, `@/services/pagesClient`,
  `@/services/userSettingsClient`; mount under `<AdminRouterProvider
  initialPath="/admin/advanced/widgets">`; click the "Show widgets as grid" button
  (by `aria-label`) inside `React.act`; then assert the card markup in the mounted
  container. Do NOT invent a `writeCache` / `cacheKeys` seed — there is no
  widget-catalog cache-seed helper; the `vi.mock` (a mutable hoisted array) IS the
  seed, and `getCachedWidgetCatalog()` returns it at component init.

```tsx
// tests/vitest/ui/widget-library-restyle.test.tsx
// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

// Mutable hoisted seed (mirrors widget-library-preview-feedback.test.tsx): Lane-A
// SSR tests run on an EMPTY catalog; the Lane-B grid test pushes one item.
const catalog = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));
vi.mock("@/services/widgetsClient", () => ({
  getCachedWidgetCatalog: () => catalog,
  listWidgetCatalogCached: async () => catalog,
}));
vi.mock("@/services/pagesClient", () => ({
  getCachedPages: () => [], getPageCached: vi.fn(), listPagesCached: async () => [], updatePage: vi.fn(),
}));
vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: async () => ({ "widgets.favorites": [] }), setUserSetting: vi.fn(),
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { catalog.length = 0; document.body.innerHTML = ""; });

// LANE A (SSR snapshot, empty catalog) — toolbar chrome + preserved scaffolding.
test("toolbar card uses the soft rounded-2xl chrome", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);
  expect(html).toContain("Widget Library");
  expect(html).toContain("rounded-2xl");                 // restyled toolbar chrome
  expect(html).toContain("shadow-soft");                 // soft shadow token (479-05)
  // Preserved scaffolding (must NOT regress from widget-library.test.tsx):
  expect(html).toContain("Available widget library sections:");
  expect(html).toContain("Section:");
  expect(html).toContain("Default view: table");
  expect(html).toContain("Show widgets as table");
  expect(html).toContain("Show widgets as grid");
  expect(html).toContain("No items match your search.");  // empty state preserved
});

// LANE A — the section Select (via its sr-only list) carries only real registry
// categories; the prototype "Marketing" tab has NO registry equivalent.
test("section Select renders only real registry categories (no fabricated Marketing)", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);
  // sr-only "Available widget library sections:" maps sectionOptions:
  // Layout/Content/Forms/Navigation/Media (+ All Items / Favorites / All Widgets).
  expect(html).not.toContain("Marketing");
});

// LANE B (interactive) — seed one item, mount, toggle to grid, assert the card.
test("grid view renders a rounded-2xl card with abstract preview + kebab actions", () => {
  catalog.push({
    id: "hero", source: "core", name: "Hero", description: "Page hero section",
    category: "layout", variants: [], complexity: "composite", audience: "beginner",
    module: "content", presets: [], requires: [], status: "published",
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    React.act(() => {
      root.render(
        <AdminRouterProvider initialPath="/admin/advanced/widgets">
          <WidgetLibraryPage />
        </AdminRouterProvider>
      );
    });
    const gridBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Show widgets as grid"
    );
    React.act(() => { gridBtn?.click(); });
    // The restyled WidgetCard (scope to the grid, not the toolbar's rounded-2xl):
    expect(container.textContent).toContain("Hero");            // widget name
    expect(container.textContent).toContain("Layout");          // category Badge
    expect(container.innerHTML).toContain("rounded-2xl");       // card chrome
    expect(container.innerHTML).toContain("rounded-xl");        // ported PreviewFrame
    expect(container.innerHTML).toContain("bg-muted");          // warm muted token
    expect(container.innerHTML).not.toContain("bg-background/80"); // old frame gone
    // Insert/Preview live INSIDE this kebab (closed) — assert the trigger only:
    const kebab = Array.from(container.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Open widget actions"
    );
    expect(kebab).toBeTruthy();
  } finally {
    React.act(() => { root.unmount(); });
    container.remove();
  }
});
```

**Data flow:** Lane A renders `WidgetLibraryPage` through `renderAdminUi` (SSR
string, default table view, empty catalog). Lane B mocks `@/services/widgetsClient`
so `getCachedWidgetCatalog()` returns one seeded item (lazy initial-cache path) →
`pagination.visibleRows` is non-empty, then mounts via `createRoot`/`React.act`,
clicks "Show widgets as grid", and asserts the grid-view markup L01 emits. Keep
each `test` independent — `afterEach` clears the seeded catalog and unmounts.

**Error handling (test concerns):** the SSR string harness has no real timers or
network; do not assert async refetch. Assert the empty-state panel ("No items
match your search.") in a Lane-A SSR render with the catalog left empty.

**Regression-test shape:** toolbar soft chrome (`rounded-2xl` / `shadow-soft`);
the section `Select`'s sr-only list carries only real registry categories (no
"Marketing"); grid card structure (preview + name + category Badge + the kebab
`actions` trigger); ported preview frame token (`rounded-xl` + `bg-muted`, old
`bg-background/80` frame gone); preserved sr-only section list, view toggle,
status line, and empty state. (Grid/preview/kebab assertions run in the
interactive `createRoot`/`React.act` lane, never the SSR snapshot.)

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
