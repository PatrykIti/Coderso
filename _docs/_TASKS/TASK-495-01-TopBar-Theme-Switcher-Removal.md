# TASK-495-01: TopBar Theme-Switcher Removal
# FileName: TASK-495-01-TopBar-Theme-Switcher-Removal.md

**Parent Task:** TASK-495
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Shell (TopBar)
**Estimated Effort:** Small
**Dependencies:** TASK-479-06 (TopBar redesign), TASK-479-06-L04 (this leaf **supersedes** its keep-decision)
**Status:** ✅ Done
**Completed:** 2026-06-30

---

## Overview

The shipped dev TopBar carries a "Soft Violet" theme-**profile** switcher
(`<AdminThemeSwitcher />`) in its right-hand action cluster. The redesign
prototype top bar (`_docs/_PROTOTYPE/src/components/shell/Topbar.tsx`) has **no
such control**. Per the owner's parity decision, **remove `<AdminThemeSwitcher />`
from `TopBar.tsx`** (keep breadcrumbs, Create, the color-mode toggle, host
`{actions}`, notifications, and the user menu). The switcher's only JSX mount is
in `TopBar.tsx`, so this is a one-component edit plus two test updates (and a
one-line dead-mock cleanup in a third test file —
`tests/vitest/ui/admin-breadcrumbs.test.tsx`, see Testing).

Theme management is **not** lost: it stays reachable from the sidebar entry
**Visual → "Admin UI Theme"** → `/admin/themes`
(`core/admin/ui/navigation/sidebarConfig.ts`: label `:86`, `href "/admin/themes"
:87`, `permission "themes:read" :89`). The `AdminThemeSwitcher` component file
itself is **not deleted** — only its mount in the TopBar is removed (it remains
available should a future host re-mount it).

- **Goal:** `core/admin/ui/shared/TopBar.tsx` no longer renders the theme-profile
  switcher; the right cluster matches the prototype (Create · color-mode toggle ·
  `{actions}` · notifications · user menu). The two vitest suites that assert the
  switcher's presence are updated to assert its **absence** while keeping their
  color-mode-toggle coverage intact.
- **Owning module/service:** `core/admin/ui/shared/TopBar.tsx` (import line 25,
  render line 218). Tests: `tests/vitest/admin/topbar-color-mode-toggle.test.tsx`
  and `tests/vitest/ui-integration/admin-shell/topbar.test.tsx` (both inverted),
  plus a dead-mock cleanup in `tests/vitest/ui/admin-breadcrumbs.test.tsx` (it
  mounts the real `TopBar` and mocks the switcher but never asserts it).
- **Source-of-truth docs:** prototype top bar
  `_docs/_PROTOTYPE/src/components/shell/Topbar.tsx` (no theme-name switcher;
  only Create, the `ThemeToggle` color-mode control, notifications, user menu);
  `_docs/DESIGN_TOKENS.md`; `_docs/TESTING_STRATEGY.md`. The retained theme route
  is `sidebarConfig.ts:86-89` → `/admin/themes`.
- **Out of scope:** No change to `AdminThemeSwitcher.tsx` itself, no change to
  `/admin/themes` (`AdminUiThemePage`) or the theme-profile data/cache/services,
  no change to `AdminColorModeToggle` (the light/dark toggle stays). Color mode
  and theme profile are **distinct** controls — this removes only the latter from
  the chrome.

> **Supersession note (record in the changelog on closure):** TASK-479-06-L04
> (✅ Done 2026-06-29) pseudocode said
> `<AdminThemeSwitcher /> {/* KEEP existing admin theme-PROFILE dropdown */}`.
> TASK-495-01 **supersedes** that specific keep-decision based on the live
> prototype-parity comparison. Do **not** flip TASK-479-06-L04's status; record
> the supersession in the TASK-495 closure changelog entry.

---

## Security Contract

No endpoint/permission/RBAC/cache changes (visual + control-placement restructure
only). No route is added or removed — `/admin/themes` and its `themes:read` gate
are untouched; this only un-mounts a presentational control from the TopBar.

---

## Implementation Pseudocode

`TopBar.tsx` re-anchor: the import is at line 25 and the mount is at line 218
inside the right-hand action cluster (`<div className="ml-auto flex items-center
gap-2">` at line 216, closing at line 223). Re-anchor by the exact strings below
rather than raw line numbers in case the file shifts.

```tsx
// core/admin/ui/shared/TopBar.tsx

// 1) REMOVE the import (currently line 25):
- import { AdminThemeSwitcher } from "@/ui/shared/AdminThemeSwitcher";

// 2) REMOVE the mount inside the right-hand cluster (currently line 218).
//    BEFORE (lines 216-223):
   <div className="ml-auto flex items-center gap-2">
     <CreateButton />
-    <AdminThemeSwitcher />
     <AdminColorModeToggle />
     {actions}
     <NotificationsMenu />
     {user ?? <UserMenu />}
   </div>
//    AFTER — cluster order: Create · color-mode toggle · {actions} ·
//    notifications · user menu (matches the prototype top bar).
```

Leave every other line of `TopBar.tsx` unchanged (breadcrumbs render block,
`CommandSearchTrigger`, `CreateButton`, `NotificationsMenu`, `UserMenu`,
`AdminColorModeToggle`, `AdminLink`, the chrome `--admin-topbar-*` tokens). After
the edit, `AdminThemeSwitcher` is no longer imported anywhere in `TopBar.tsx`.
Verify with `grep -rn "AdminThemeSwitcher" core/admin/ui core/admin/app` that the
only remaining references are the component's own file
(`AdminThemeSwitcher.tsx`), its dedicated unit test, and the two **doc comments**
that mention it (`core/admin/ui/shared/AdminColorModeToggle.tsx:10`,
`core/admin/app/AdminApp.tsx:444`) — none of which is a JSX mount.

**Data flow:** unchanged. The TopBar still receives `navToggle / breadcrumbs /
search / actions / user` and renders them identically minus the switcher node.

**Error handling:** none added — removing a presentational node introduces no new
states or effects.

### Test rewrite — `tests/vitest/admin/topbar-color-mode-toggle.test.tsx`

This file (a) mocks the switcher (lines 7-9) and (b) asserts it is present and
that the color toggle sits **after** it in the cluster (lines 46-68). The cluster
was anchored via `switcher?.parentElement`; with the switcher gone, re-anchor the
cluster off the **color toggle**, assert the switcher is **absent**, and verify
ordering relative to the still-present `CreateButton`.

```tsx
// 1) DELETE the now-dead switcher mock (lines 7-9):
- vi.mock("@/ui/shared/AdminThemeSwitcher", () => ({
-   AdminThemeSwitcher: () => <div data-testid="admin-theme-switcher">Theme</div>,
- }));

// 2) REWRITE the single test (rename + invert the presence assertion):
test("TopBar mounts the color-mode toggle and no longer renders the theme switcher", () => {
  const view = mount();
  try {
    const switcher = view.container.querySelector("[data-testid='admin-theme-switcher']");
    const toggle = view.container.querySelector("button[aria-label='Toggle dark mode']");

    // TASK-495-01: AdminThemeSwitcher removed from the TopBar.
    expect(switcher).toBeNull();
    expect(toggle).not.toBeNull();
    // The toggle starts in light mode (Moon shown, click → dark).
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");

    // It still sits in the right-hand action cluster, AFTER the Create button.
    const cluster = toggle?.parentElement ?? null;
    expect(cluster).not.toBeNull();
    const createButton = Array.from(cluster?.querySelectorAll("button") ?? []).find((b) =>
      (b.textContent ?? "").includes("Create")
    );
    expect(createButton).toBeTruthy();
    const children = cluster ? Array.from(cluster.children) : [];
    expect(children.indexOf(toggle as Element)).toBeGreaterThan(
      children.indexOf(createButton as Element)
    );
  } finally {
    view.cleanup();
  }
});
```

> `CreateButton` is `hidden sm:inline-flex` (a CSS class) — the element is still
> in the DOM under happy-dom, so `querySelector` finds it and the index check is
> valid. If a future change drops the Create button under test, fall back to
> asserting `cluster.contains(toggle)` plus the notifications button order.

### Test rewrite — `tests/vitest/ui-integration/admin-shell/topbar.test.tsx`

This suite renders the **real** switcher and asserts the SSR html contains
`"Admin UI Theme"` (the switcher's `DropdownMenuLabel`, `AdminThemeSwitcher.tsx:108`)
at lines 208-214. Invert that assertion and update the file's leading comment.

```tsx
// 1) Update the header comment (lines 3-7) that says
//    "...the profile switcher vs. color-mode toggle as two distinct controls..."
//    → note the profile switcher was removed from the TopBar in TASK-495-01;
//    only the color-mode toggle remains in the chrome.

// 2) REWRITE the test at lines 208-214:
test("renders the light/dark toggle but no longer the theme-profile switcher", () => {
  const html = renderAdminUi(<TopBar />);
  // AdminColorModeToggle (light/dark) stays in the chrome.
  expect(html).toContain('aria-label="Toggle dark mode"');
  // TASK-495-01: AdminThemeSwitcher removed — theme management now lives only at
  // sidebar "Visual → Admin UI Theme" (/admin/themes), not the top bar.
  expect(html).not.toContain("Admin UI Theme");
});
```

Leave the other tests in this file untouched (color-mode persist, the D1
dark-token-flip gate, the user-menu Settings/Profile route checks, the
command-search trigger, the host-search override, and Sign out wiring) — none of
them reference the switcher.

### Third file — dead-mock cleanup `tests/vitest/ui/admin-breadcrumbs.test.tsx`

This breadcrumb suite mounts the **real** `TopBar` (`:8` imports it, `:24`
renders `<TopBar />`) and `vi.mock`s `@/ui/shared/AdminThemeSwitcher` (`:10-12`),
but it **never asserts the switcher's presence** — it only checks breadcrumb
output. After the mount is removed from `TopBar.tsx`, that mock becomes **inert**:
the module still exists, so vitest does not error on the now-unused mock and the
suite **stays green without any assertion change**. This file is therefore **not**
a presence/absence rewrite — just delete the dead mock for cleanliness, in the
**same commit**:

```tsx
// tests/vitest/ui/admin-breadcrumbs.test.tsx — DELETE the now-dead mock (:10-12):
- vi.mock("@/ui/shared/AdminThemeSwitcher", () => ({
-   AdminThemeSwitcher: () => <div data-testid="admin-theme-switcher" />,
- }));

// This mock is the file's ONLY `vi.*` usage, so also drop `vi` from the import
// (`:5`) or `lint` flags an unused binding:
- import { expect, test, vi } from "vitest";
+ import { expect, test } from "vitest";
```

No breadcrumb assertion changes; the suite must stay green unchanged.

**Regression-test shape:** the two updated tests now (1) prove the switcher is
absent from the rendered TopBar, (2) keep proving the color-mode toggle still
renders, is light-by-default, and is positioned correctly in the right cluster,
and (3) keep the unrelated TopBar coverage green. No assertion is weakened to
"fit" the change — each presence check is **inverted**, not deleted.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/topbar-color-mode-toggle.test.tsx tests/vitest/ui-integration/admin-shell/topbar.test.tsx`
- Confirm no other suite asserts a TopBar-mounted switcher:
  `grep -rn "AdminThemeSwitcher\|admin-theme-switcher" tests/vitest` — beyond the
  two rewritten files above and the component's own dedicated unit test, the grep
  surfaces exactly **one** additional, **inert** hit:
  `tests/vitest/ui/admin-breadcrumbs.test.tsx` (it mounts the real `TopBar` and
  `vi.mock`s the switcher but **never asserts** its presence). That mock is dead
  after the un-mount and must be deleted in the same commit (see the third-file
  cleanup above) — no assertion there is inverted. Any **other** hit (one that
  asserts a TopBar-mounted switcher's presence) must be triaged before closing.
- Full `bun test` / `bun --cwd core test:bun` must stay green (the wider gate that
  TASK-479 validated against).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes
  status.
- On closure, the parent (TASK-495) changelog entry must (a) link **TASK-479** +
  **TASK-495**, and (b) explicitly record that TASK-495-01 **supersedes the
  keep-decision in TASK-479-06-L04** (the switcher is removed from the TopBar;
  theme management remains at sidebar "Visual → Admin UI Theme" → `/admin/themes`).
- No `_docs/DESIGN_TOKENS.md` / contract edits are required (presentational
  removal only) — state this explicitly in the changelog.

Related memory: [[admin-ui-redesign-prototype]] (TASK-479 redesign closure +
prototype location).
