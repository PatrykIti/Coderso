# TASK-479-10: Menus Screen Migration
# FileName: TASK-479-10-Menus-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Menus
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06 (shell + tokens adopted in `core/admin`)
**Status:** ⏳ To Do
**Parent Task:** TASK-479

---

## Overview

Port the finished visual-redesign prototype for the **Menus** screens into the
real admin. This covers the menu list, the menu structure editor, and the menu
design editor. The work is a **presentation-only restyle**: every screen keeps
its real data, services, RBAC gating, cache contract, drag/order behavior, and
dirty-state protection. Only the visual layer (cards, rounded-2xl surfaces, soft
shadows, violet accent, warm neutrals, soft/badge variants, light + dark) is
ported from the prototype.

- **Goal:** Make the Menus list, structure editor, and design editor match the
  soft & friendly (Notion-like) violet design language from
  `_docs/_PROTOTYPE/`, without changing any menu data, routing, permission, or
  cache behavior.
- **Owning module/service:** `core/admin/ui/menus/` (`MenuListPage.tsx`,
  `MenuEditorPage.tsx`, `MenuDesignEditorPage.tsx`, plus the leaf row/tree/form
  components they compose).
- **Source-of-truth docs:**
  - Design language + tokens: `_docs/_PROTOTYPE/src/styles/theme.css`,
    `_docs/DESIGN_TOKENS.md`.
  - Shared primitives/patterns: `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}`.
  - Prototype screens: `_docs/_PROTOTYPE/src/pages/content/MenuListPage.tsx`,
    `_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx`.
  - Canonical nav helpers: `core/admin/ui/navigation/sidebarConfig.ts`,
    `core/admin/ui/shared/AdminLink.tsx`, `adminPaths`, `prefetchAdminRoute`.
  - Testing lane: `_docs/TESTING_STRATEGY.md`.
- **Out of scope:** Any change to menu endpoints, the `menusClient` cache keys
  (`cacheKeys.menusList`, `cacheKeys.menuDetail`), the menu item schema, the
  drag-and-drop ordering logic, publish/draft state machine, or the shared
  `PageEditor` host contract used by the design editor. No new fields and no new
  data fetches (the menu list endpoint does NOT return a per-menu item count —
  do not invent one). Token/shell adoption is owned by TASK-479-05/06.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-10-L01 | Menu List Restyle | ⏳ To Do |
| TASK-479-10-L02 | Menu Editor & Design Editor Restyle | ⏳ To Do |
| TASK-479-10-L03 | Menus Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = Vitest (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf runs the standard gate:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx`

All pre-existing menu suites must stay green (they assert behavior, not pixels).
New/extended assertions added under TASK-479-10-L03 verify the restyled surface
markers (card grid, soft variants, AdminLink hrefs) without coupling to exact
Tailwind class strings.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a
  leaf status changes.
- `_docs/_CHANGELOG/` — add an entry on each leaf closure, cross-linking
  `TASK-479` + the leaf id.
- Note the new design language in any Menus UX/contract reference doc touched;
  the `menusClient` cache + API contract docs are unchanged (restyle only) and
  must NOT be edited to imply otherwise.
