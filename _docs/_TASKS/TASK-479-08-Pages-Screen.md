# TASK-479-08: Pages Screen Migration
# FileName: TASK-479-08-Pages-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Pages)
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Task:** TASK-479

---

## Overview

Port the finished visual-redesign prototype look (soft & friendly / Notion-like,
violet accent, `rounded-2xl` cards, soft shadows, warm neutrals, light default +
dark toggle) onto the **real Pages screens**: the page list and the visual page
builder. This subtask restyles presentation only and **must preserve all real
data, page-builder logic, the `PAGE_MODEL` document model, cache contract, RBAC,
and canonical admin routing**.

- **Goal:** Make the Pages list and the Page editor adopt the redesign while
  keeping every existing behavior. The list gets the new `PageHeader` + status
  tabs + `FilterBar` + `DataTable` + `StatusBadge` + pagination look. The editor
  adopts the prototype's floating-panel `CanvasEditor` model (canvas is the
  primary surface; one floating, dockable panel is the sole control surface, with
  a show/hide toggle) without changing the underlying block/section operations.
- **Owning module/service:** `core/admin/ui/pages/` —
  `PageListPage.tsx` (+ `PageFilters.tsx`, `PageTable.tsx`,
  `PageBulkActionsBar.tsx`), `PageEditor.tsx` (+ `pages/editor/*`, `pages/builder/*`,
  `pages/editorControls/*`); shared chrome in `core/admin/ui/shared/*` and
  `core/admin/ui/layouts/{AdminShell,EditorShell}.tsx`.
- **Source-of-truth docs:** `_docs/PAGE_MODEL.md` (document model — never change
  shapes here), `_docs/PREVIEW_SPEC.md` (preview/runtime contract),
  `_docs/DESIGN_TOKENS.md` (token names), `_docs/TESTING_STRATEGY.md` (test lane).
  Prototype source: `_docs/_PROTOTYPE/src/pages/content/PageListPage.tsx`,
  `_docs/_PROTOTYPE/src/pages/content/PageEditorPreview.tsx`, and shared primitives
  in `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}`.
- **Out of scope:** No `PAGE_MODEL`/schema changes, no new endpoints, no
  permission-model changes, no new page-builder features. The prototype's
  `CanvasEditor` is a non-functional preview; we adopt its **visual structure and
  the floating-panel control model**, not its mock content. Do not migrate other
  content screens (Posts, Menus, Media) — those are separate TASK-479 subtasks.
  The `/preview` route (`PagePreview`, which renders front-end page content, not
  admin chrome) is **out of scope** here — this group restyles only the admin Pages
  list and the in-admin Page editor.

> Depends on **TASK-479-06** (shell/topbar/sidebar adoption) because both Pages
> screens render inside `AdminShell`/`EditorShell`; restyle the shell first so the
> page-level restyle composes against the final chrome and tokens. Also depends on
> **TASK-479-05** (design tokens) — the soft/violet tokens and the `soft`/`success`
> Badge variants these screens consume are defined there.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). All page nav/hrefs/prefetch continue to flow
through the canonical helpers (`adminPaths`, `AdminLink`, `prefetchAdminRoute`);
RBAC gating, the pages cache contract (`cacheKeys.pagesList`, `cachedClient`,
`cacheBus` invalidation, cache-hydrate + background revalidation), and dirty-state
protection are preserved unchanged.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-08-L01 | Page List Restyle | ⏳ To Do |
| TASK-479-08-L02 | Page Editor → Floating-Panel Canvas | ⏳ To Do |
| TASK-479-08-L03 | Pages Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Each
leaf lists its own commands; the subtask-level gate is:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx`
- All pre-existing page-editor and page-list suites under `tests/vitest/ui/*` and
  `tests/vitest/ui-integration/*` must stay green (no runtime tests moved to Vitest
  for coverage).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (move rows between buckets) + **Statistics**
  on every status change for this subtask and its leaves.
- Add a `_docs/_CHANGELOG/` entry on closure, linking **TASK-479** + each leaf id.
- If the editor chrome or panel placement changes any documented behavior, note it
  in `_docs/PAGE_MODEL.md` / `_docs/PREVIEW_SPEC.md` cross-references (visual-only
  changes should require no contract edits — flag explicitly if one is needed).
