# TASK-479-23: Page Templates Screen Migration
# FileName: TASK-479-23-Page-Templates-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced (Page Templates)
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06, TASK-479-08
**Status:** ⏳ To Do
**Parent Task:** TASK-479

---

## Overview

Port the finished visual-redesign prototype look (soft & friendly / Notion-like,
violet accent, `rounded-2xl` cards, soft shadows, warm neutrals, light default +
dark toggle) onto the **real Page Templates screens**: the templates library list
and the template editor. Page templates are reusable, configurable Page v2 section
stacks (site-wide chrome like footer/menu, and page-scoped stacks) that **propagate
to every page using them** — so the redesign must keep that mental model visible
while preserving all real template data, the cache contract, RBAC, and canonical
admin routing. The template editor **must remain the same floating-panel Page
Editor** used by Pages (it already binds the shared `PageEditor` through the
`PageEditorHost` seam) — this subtask restyles chrome only, it does **not** fork a
second editor.

- **Goal:** Make the templates list and the template editor adopt the redesign
  while keeping every existing behavior. The list gets the prototype's
  card/grid-or-table look with a scope indicator, a propagation note, and a usage
  hint, plus Edit/Preview/Duplicate/Delete actions. The editor keeps reusing the
  shared restyled `CanvasEditor`/`PageEditor` surface and surfaces the
  propagation/usage context through the existing host seam.
- **Owning module/service:** `core/admin/ui/pages/templates/` —
  `PageTemplatesPage.tsx`, `PageTemplateEditorPage.tsx`, `usePageTemplates.ts`;
  shared chrome in `core/admin/ui/shared/*` and
  `core/admin/ui/layouts/{AdminShell,EditorShell}.tsx`; the shared editor in
  `core/admin/ui/pages/PageEditor.tsx` (restyled by TASK-479-08, reused — not
  forked).
- **Source-of-truth docs:** `_docs/PAGE_MODEL.md` (the template document is a Page
  v2 document — never change block/section shapes), `_docs/PREVIEW_SPEC.md`
  (preview/runtime contract), `_docs/DESIGN_TOKENS.md` (token names),
  `_docs/TESTING_STRATEGY.md` (Vitest lane). **Prototype source to port from:**
  `_docs/_PROTOTYPE/src/pages/advanced/PageTemplatesPage.tsx`,
  `_docs/_PROTOTYPE/src/pages/advanced/PageTemplateEditorPreview.tsx`, and shared
  primitives in `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}`.
- **Out of scope:** No new endpoints, no `PageTemplateSummary`/`PageTemplateDetail`
  schema changes, no permission-model changes, no new template features. The
  prototype's **scope** ("Site-wide / Section / Page"), **"Used on N pages"** count,
  and `CanvasEditor` mock content are non-functional design mocks — adopt the
  **visual structure**, never invent metrics or scope fields the real model does not
  carry (see each leaf's honesty guard). Do not migrate other Advanced screens
  (Redirects, Backups, etc.) — those are separate TASK-479 subtasks.

> Depends on **TASK-479-06** (shell/topbar/sidebar + shared primitives) because both
> screens render inside `AdminShell`/`EditorShell`, and on **TASK-479-08** (Pages
> screen) because the template editor reuses the **same** restyled floating-panel
> `PageEditor`/`CanvasEditor` delivered there — restyle those first so this subtask
> composes against the final chrome, tokens, and editor surface.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). All template nav/hrefs/prefetch continue to
flow through the canonical helpers (`adminPaths`, `AdminLink`,
`prefetchAdminRoute`) and `useAdminRouter().navigate`; RBAC gating, the page-template
cache contract (`cacheKeys.pageTemplatesList` / `cacheKeys.pageTemplateDetail`,
`cachedClient`, `cacheBus`/`subscribeCacheEvents` invalidation, cache-hydrate +
background revalidation, no mount-force refetch loops, no dirty-state overwrites),
and the `PageEditorHost` host-seam gating are preserved unchanged.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-23-L01 | Templates List Restyle | ⏳ To Do |
| TASK-479-23-L02 | Template Editor → Floating-Panel Canvas | ⏳ To Do |
| TASK-479-23-L03 | Page Templates Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Each
leaf lists its own commands; the subtask-level gate is:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/page-templates-list.test.tsx`
- All pre-existing page-template and shared page-editor suites (`page-templates-surface`,
  `page-editor-v2-flow`, `page-authoring-canvas`) must stay green (no runtime tests
  moved to Vitest for coverage).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (move rows between buckets) + **Statistics**
  on every status change for this subtask and its leaves.
- Add a `_docs/_CHANGELOG/` entry on closure, linking **TASK-479** + each leaf id.
- If any documented template behavior changes (it should not — visual restyle only),
  cross-reference `_docs/PAGE_MODEL.md` / `_docs/PREVIEW_SPEC.md`; flag explicitly in
  the changelog if a contract edit was unavoidable.
