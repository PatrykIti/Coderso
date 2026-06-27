# TASK-479-09: Posts Screen Migration
# FileName: TASK-479-09-Posts-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype for the **Posts** experience into the
real admin. This covers the Posts **list** screen and the Post **editor** shell so
both adopt the soft & friendly (Notion-like) language: warm neutral canvas, white
`rounded-2xl` cards, soft shadows, **violet** accent, light default + dark toggle.
Only the presentation layer changes — all data loading, caching, RBAC, routing,
the richtext/block model, and dirty-state protection are preserved exactly.

- **Goal:** Make `core/admin/ui/posts/PostsListPage.tsx` and
  `core/admin/ui/posts/PostEditorPage.tsx` (+ `posts/editor/*`) match the prototype
  look while keeping every behavior, so a user sees the redesigned Posts list and a
  calmer document-style post editor with no functional regressions.
- **Owning module/service:** `core/admin/ui/posts/**` (list, table, create drawer,
  editor shells, editor layout/header/inspector/blocks/richtext). Shared primitives
  from TASK-479-05/06 (`core/admin/styles/globals.css`, `AdminShell`,
  `@/ui/shared/PageHeader`).
- **Source-of-truth docs:** `_docs/_PROTOTYPE/README.md`, `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`, the parent `TASK-479_Admin_UI_Visual_Redesign_Prototype.md`.
  Prototype source screens: `_docs/_PROTOTYPE/src/pages/content/PostsListPage.tsx`
  and `_docs/_PROTOTYPE/src/pages/content/PostEditorPreview.tsx`; prototype
  primitives under `_docs/_PROTOTYPE/src/components/{ui,patterns}`.
- **Out of scope:** No changes to posts API routes, the postsClient service, the
  cache policy/keys, the block schema, the autosave/revision pipeline, or RBAC.
  No new editor features — the editor stays fully functional (this is NOT the
  non-functional preview); only its chrome/canvas/inspector styling changes. The
  global token + shell redesign land in TASK-479-05 and TASK-479-06 respectively
  and are consumed here, not re-implemented.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-09-L01 | Posts List Restyle | ⏳ To Do |
| TASK-479-09-L02 | Post Editor Restyle | ⏳ To Do |
| TASK-479-09-L03 | Posts Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf must run and pass:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/<relevant post-*.test.tsx suites>`
  (the existing Posts editor suites live in `tests/vitest/ui-integration/`; only
  `postsClient.test.ts` is under `tests/vitest/admin/`) and the new
  `tests/vitest/ui-integration/post-list-restyle.test.tsx` /
  `post-editor-shell-restyle.test.tsx` suites added in L03.

The full pre-existing Posts editor suite (the
`tests/vitest/ui-integration/post-*.test.tsx` family) must stay green — the restyle
must not break a single behavioral test. Do NOT migrate runtime tests into Vitest
for coverage.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a leaf or
  this subtask changes status.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` + the leaf id.
- The shared `StatusBadge` / `StatusTabs` and the `PageHeader` `icon`/breadcrumbs
  props are CREATED by TASK-479-06-L02 and the tokens by TASK-479-05 — Posts
  consumes them by exact name, it does not re-invent them. If a Posts-specific
  prop is added to one of these shared primitives, note it alongside the
  TASK-479-06 shell/design notes so other list screens reuse it consistently.
