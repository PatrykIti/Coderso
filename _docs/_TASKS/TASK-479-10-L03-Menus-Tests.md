# TASK-479-10-L03: Menus Tests
# FileName: TASK-479-10-L03-Menus-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Menus / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-10-L01, TASK-479-10-L02
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-10

---

## Overview

Add/extend Vitest render tests that lock the restyled Menus surfaces in place
without coupling to exact Tailwind class strings. The tests assert the new
**structure** (card grid, AdminLink hrefs, inspector rows, nested-item indent,
dashed add-item affordance) and re-confirm that the visual restyle did NOT change
behavior (selection/bulk, filters, pagination, drag/order, dirty-state, save).

- **Goal:** Guarantee the restyle is structurally correct and behavior-preserving
  via the Bun-free admin/UI Vitest lane.
- **Owning module/service:** `tests/vitest/ui/` (menu suites) — extend the
  existing files rather than duplicating coverage.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane), the
  prototype sources the restyle ports from
  (`_docs/_PROTOTYPE/src/pages/content/MenuListPage.tsx`,
  `_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx`).
- **Out of scope:** No runtime-lane tests (do not move runtime coverage to
  Vitest). No snapshot-of-classnames assertions; assert text/hrefs/`data-*`/
  `aria-label` markers (via SSR-string `toContain` or live-DOM `host.querySelector`)
  only. No Testing-Library/`user-event` (not installed). No new menu fixtures
  beyond what the existing suites already provide.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Extend the existing suites; only add cases that assert the restyled structure +
unchanged behavior. This repo has **no** `@testing-library/react`/`jest-dom`/
`user-event` — use the lanes the real menu suites already use: STATIC renders via
the SSR `renderAdminUi` helper (`tests/utils/adminRouterRender`) asserting on the
returned HTML string (`expect(html).toContain(…)`), and INTERACTIVE renders via
`createRoot` + `React.act` querying the live DOM (`host.querySelector`,
`host.textContent`, native `click()`/`dispatchEvent`) — see
`menu-list-page.test.tsx` (static) and `menu-list-page-actions.test.tsx`
(interactive). Prefer text/href substrings and stable `data-*`/`aria-label` hooks
over class strings.

```tsx
// tests/vitest/ui/menu-list-page.test.tsx — STATIC card-grid markers via the SSR
// `renderAdminUi` helper (returns an HTML string; no Testing-Library). Seed the
// list cache first, exactly like the existing "renders cached menus" test
// (write { value, savedAt } under cacheKeys.menusList into a stubbed localStorage).
test("renders a menu card per cached row with Edit + Design AdminLinks", () => {
  seedMenusCache([menuA, menuB]); // existing localStorage cacheKeys.menusList pattern
  const html = renderAdminUi(<MenuListPage />, { path: "/admin/menus" });
  expect(html).not.toContain("<table");                         // card grid, not a data table
  expect(html).toContain(`/admin/menus/${menuA.id}`);           // canonical Edit href (renderAdminUi prefixes /admin)
  expect(html).toContain(`/admin/menus/${menuA.id}/design`);    // canonical Design href
  expect(html).toContain(menuB.location ?? "Not assigned");     // real location chip / fallback
  expect(html).toContain("Published");                          // status label (draft|published only)
});
```

```tsx
// tests/vitest/ui/menu-list-page-actions.test.tsx — INTERACTIVE via createRoot +
// React.act (reuse the existing `mount()` + `menuListState` harness; no user-event).
test("selection + bulk bar still work after the card restyle", async () => {
  const view = mount(); // createRoot(host); React.act(() => root.render(<MenuListPage/>))
  try {
    await flush();
    const select = view.host.querySelector('[aria-label="Select Primary"]') as HTMLElement;
    await React.act(async () => { select.click(); await Promise.resolve(); });
    expect(view.host.textContent).toContain("Apply"); // bulk actions bar surfaced
  } finally { view.cleanup(); }
});
test("filters + pagination still narrow the rendered card set", async () => {
  // dispatch "change" on the status <select>; assert host.textContent drops the filtered-out
  // card and the pagination footer ("Showing 1-1 of …") still renders
});
```

```tsx
// tests/vitest/ui/menu-item-row.test.tsx — createRoot render; query the live DOM.
test("renders the nested indent affordance for child items", () => {
  // mount a child row; host.querySelector the CornerDownRight indent marker; a root row omits it
});
test("marks the active/selected item row", () => {
  // active row carries the primary-soft marker hook (data-*/aria), inactive rows do not
});

// tests/vitest/ui/menu-item-form.test.tsx — inspector fields bound to MenuItemFormValue.
test("renders Navigation Label / URL / Visibility bound to the form value", () => {
  // mount MenuItemForm with an onChange spy; editing Label fires onChange with the new label;
  // the Visibility <select> lists the REAL enum (all | logged_in | logged_out →
  // "Show to everyone" / "Only logged-in users" / "Only logged-out users");
  // assert there is NO "open in new tab"/Switch control (field does not exist)
});

// tests/vitest/ui/menu-editor.test.tsx — behavior preserved after restyle.
test("dashed add-item button calls the real add handler", () => {
  // host.querySelector the add-item button; .click() inside React.act; a new draft row appears
});
test("saving a reordered tree still calls replaceMenuItems/updateMenu", () => {
  // mock the services; reorder + save; assert the spies fire (no contract change)
});

// tests/vitest/ui/menu-design-editor-flow.test.tsx — host wiring intact (happy-dom + createRoot).
test("design page mounts the shared PageEditor with the menu host", () => {
  // host.mode === "menu"; settings sheet saves via updateMenu; canvas chrome states render
});
```

**Data flow:** tests render the real components with the existing cached-menu /
mock harnesses already used by these suites; no new network mocks.

**Error handling:** include one assertion that the list error `Alert` and the
editor inline error still render (restyle must not drop error surfaces).

**Hooks rules:** N/A (tests) — but assert no console warnings about effect
setState if the suite already enforces a console guard.

**Regression-test shape:**
- List: card-per-row, Edit/Design AdminLink hrefs, location/status chips,
  selection→bulk bar, filters + pagination, error Alert.
- Structure editor: nested indent, active marker, inspector field binding,
  add-item handler, reorder→save services, dirty-state guard.
- Design editor: shared `PageEditor` mount with `mode: "menu"`, settings save,
  canvas chrome loading/error/ready.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-item-form.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-design-editor-flow.test.tsx tests/vitest/ui/menu-editor-refresh-policy.test.tsx`

Record in the summary which suites ran and that all passed; flag any skip.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-10-L03`.
- No contract-doc edits (tests + restyle only).
