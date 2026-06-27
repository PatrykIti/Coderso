# TASK-479-10-L03: Menus Tests
# FileName: TASK-479-10-L03-Menus-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Menus / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-10-L01, TASK-479-10-L02
**Status:** ⏳ To Do
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
  Vitest). No snapshot-of-classnames assertions; assert roles/text/hrefs/
  semantic markers only. No new menu fixtures beyond what the existing suites
  already provide.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Extend the existing suites; only add cases that assert the restyled structure +
unchanged behavior. Prefer semantic queries (`getByRole`, `getByText`,
`getByLabelText`) and stable `data-*`/`aria-label` hooks over class strings.

```tsx
// tests/vitest/ui/menu-list-page.test.tsx — add restyle structure cases.
it("renders one menu card per visible row with Edit + Design AdminLinks", async () => {
  renderMenuListWithCachedMenus([menuA, menuB]); // reuse existing harness
  // card grid, not a data table:
  expect(screen.queryByRole("table")).toBeNull();
  // each menu exposes canonical hrefs (never hand-built):
  expect(within(cardFor(menuA)).getByRole("link", { name: /edit/i }))
    .toHaveAttribute("href", expect.stringContaining(`/menus/${menuA.id}`));
  expect(within(cardFor(menuA)).getByRole("link", { name: /design/i }))
    .toHaveAttribute("href", expect.stringContaining(`/menus/${menuA.id}/design`));
  // location chip uses the real value / "Not assigned" fallback:
  expect(within(cardFor(menuB)).getByText(menuB.location ?? "Not assigned")).toBeInTheDocument();
});

it("keeps selection + bulk bar working after the card restyle", async () => {
  // toggling a card checkbox surfaces the bulk actions bar (behavior unchanged)
});

it("still narrows the card set by search/status/location filters and pagination", async () => {
  // filtering reduces rendered cards; pagination footer still present
});
```

```tsx
// tests/vitest/ui/menu-item-row.test.tsx — nested indent + active marker.
it("renders the nested indent affordance for child items", () => {
  // a child item row shows the CornerDownRight indent; root rows do not
});
it("marks the active/selected item row", () => {
  // active row carries the primary-soft marker hook, inactive rows do not
});

// tests/vitest/ui/menu-item-form.test.tsx — inspector rows bound to the draft.
it("renders Label / URL / Open-in-new-tab / Visibility bound to the draft", () => {
  // editing Label updates the draft; Switch + Select reflect/mutate draft fields
});

// tests/vitest/ui/menu-editor.test.tsx — behavior preserved after restyle.
it("dashed add-item button calls the real add handler", () => { /* … */ });
it("saving a reordered tree still calls replaceMenuItems/updateMenu", () => { /* … */ });

// tests/vitest/ui/menu-design-editor-flow.test.tsx — host wiring intact.
it("design page mounts the shared PageEditor with the menu host", () => {
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
