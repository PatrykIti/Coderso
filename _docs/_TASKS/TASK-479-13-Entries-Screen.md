# TASK-479-13: Entries Screen Migration
# FileName: TASK-479-13-Entries-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06, TASK-479-12
**Status:** ✅ Done (2026-06-29)
**Parent Task:** TASK-479
**Started:** 2026-06-28
**Completed:** 2026-06-29

---

## Overview

Port the finished visual-redesign prototype for the **Entries** experience into the
real admin. This covers the Entries **list** screen (every structured entry across
all content types) and the schema-driven Entry **editor**, so both adopt the soft &
friendly (Notion-like) language: warm neutral canvas, white `rounded-2xl` cards,
soft shadows, **violet** accent, light default + dark toggle. Only the presentation
layer changes — all data loading, caching, RBAC, routing, the schema-driven field
rendering, and dirty-state protection are preserved exactly.

- **Goal:** Make `core/admin/ui/entries/EntryList.tsx` (+ `EntryFilters`,
  `EntryTable`, `EntryBulkActionsBar`) and `core/admin/ui/entries/EntryEditor.tsx`
  (+ `EntryMetadataPanel`) match the prototype look while keeping every behavior, so
  a user sees the redesigned Entries list (type filter, status tabs, soft DataTable,
  violet status badges) and a calmer two-column entry editor with no functional
  regressions.
- **Owning module/service:** `core/admin/ui/entries/**` (list, filters, table, bulk
  bar, create drawer, editor, metadata panel, field renderer). Shared primitives
  from TASK-479-06 (`core/admin/styles/globals.css`, `AdminShell`,
  `@/ui/shared/PageHeader`, the shared restyled `StatusBadge`/`FilterBar`/`DataTable`
  primitives) and the content-type primitives consumed via TASK-479-12.
- **Source-of-truth docs:** `_docs/_PROTOTYPE/README.md`, `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`, the parent
  `TASK-479_Admin_UI_Visual_Redesign_Prototype.md`. Prototype source screens:
  `_docs/_PROTOTYPE/src/pages/advanced/EntriesPage.tsx` and
  `_docs/_PROTOTYPE/src/pages/advanced/EntryEditorPreview.tsx`; prototype primitives
  under `_docs/_PROTOTYPE/src/components/{ui,patterns}` and tokens in
  `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No changes to the entries API routes, `entriesClient`/
  `contentTypesClient`/`taxonomyClient` services, the cache policy/keys
  (`cacheKeys.entriesAllList`, `cacheKeys.entryDetail`, `cacheKeys.contentTypesList`),
  the content-type schema model, the publish/preview/duplicate/delete/bulk flows, the
  checklist logic, or RBAC. The Entry editor stays fully **functional** (NOT the
  non-functional preview); only its chrome/canvas/inspector styling changes. The
  global token + shell redesign land in TASK-479-05 and TASK-479-06 respectively and
  are consumed here, not re-implemented.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-13-L01 | Entry List Restyle | ⏳ To Do |
| TASK-479-13-L02 | Entry Editor Restyle | ⏳ To Do |
| TASK-479-13-L03 | Entries Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf must run and pass:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/entry-list-restyle.test.tsx tests/vitest/ui-integration/entry-editor-restyle.test.tsx`
  (new suites added in L03)

The full pre-existing Entries suites must stay green — the restyle must not break a
single behavioral test. At minimum re-run the existing entries family:
`tests/vitest/ui/entry-list-wave.test.tsx`, `tests/vitest/ui/entry-table-wave.test.tsx`,
`tests/vitest/ui/entry-bulk-actions.test.tsx`, `tests/vitest/ui/entry-list-filters.test.ts`,
`tests/vitest/ui/entry-metadata.test.tsx`, `tests/vitest/ui/content-entry-editor.test.tsx`,
`tests/vitest/ui/entry-editor-shell-wave.test.tsx`, and
`tests/vitest/admin/entriesClient.test.ts`. Do NOT migrate runtime tests into Vitest
for coverage.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a leaf or
  this subtask changes status.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` + the leaf id.
- If any shared restyle primitive (the `StatusBadge` helper, `FilterBar`, or a
  `DataTable` wrapper) is added/changed for Entries, note it alongside the
  TASK-479-06 shell notes so Pages/Posts/Users lists reuse it consistently.
