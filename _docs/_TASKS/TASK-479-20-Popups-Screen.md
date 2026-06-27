# TASK-479-20: Popups Screen Migration
# FileName: TASK-479-20-Popups-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype for the **Popups** experience into the
real admin. This covers the Popups **list** screen and the Popup **editor** so both
adopt the soft & friendly (Notion-like) language: warm neutral canvas, white
`rounded-2xl` cards, soft shadows, **violet** accent, light default + dark toggle.
Only the presentation layer changes — all data loading, caching, RBAC, routing, the
popup config model (trigger / targeting / frequency / content / settings), and
dirty-state protection are preserved exactly.

- **Goal:** Make `core/admin/ui/popups/PopupsListPage.tsx` (+ `PopupTable.tsx`) and
  `core/admin/ui/popups/PopupEditorPage.tsx` (+ `components/PopupEditorForm.tsx`)
  match the prototype look while keeping every behavior, so a user sees a redesigned
  Popups list (stat row + soft card grid) and a calmer popup editor with a live
  popup preview and grouped trigger/targeting settings — no functional regressions.
- **Owning module/service:** `core/admin/ui/popups/**` (list page, popup table,
  editor page, editor form, hooks, `popupEditorModel.ts`, `popupDefaults.ts`).
  Shared primitives from TASK-479-05/06 (`core/admin/styles/globals.css`,
  `AdminShell`, `@/ui/shared/PageHeader`, restyled shadcn primitives).
- **Source-of-truth docs:** `_docs/_PROTOTYPE/README.md`, `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`, the parent
  `TASK-479_Admin_UI_Visual_Redesign_Prototype.md`. Prototype source screens:
  `_docs/_PROTOTYPE/src/pages/advanced/PopupsPage.tsx` and
  `_docs/_PROTOTYPE/src/pages/advanced/PopupEditorPreview.tsx`; prototype primitives
  under `_docs/_PROTOTYPE/src/components/{ui,patterns}`.
- **Out of scope:** No changes to the popups API routes, the `popupsClient` service,
  the cache policy/keys (`cacheKeys.popupsList`), `cacheBus` invalidation, the
  `PopupRecord`/`PopupCreateInput` schema, or RBAC. **No new analytics**: the
  prototype's per-card `impressions`/`conversion` numbers are mock data with no
  backing field on `PopupRecord` — implementers MUST NOT invent or fabricate them
  (see L01). The global token + shell redesign land in TASK-479-05 and TASK-479-06
  and are consumed here, not re-implemented.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-20-L01 | Popups List Restyle | ⏳ To Do |
| TASK-479-20-L02 | Popup Editor Restyle | ⏳ To Do |
| TASK-479-20-L03 | Popups Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf must run and pass:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/popups-list-restyle.test.tsx tests/vitest/ui-integration/popup-editor-restyle.test.tsx`
  (new suites added in L03)

The existing popups suites (`tests/vitest/ui/popups-page.test.tsx`,
`tests/vitest/admin/popupsClient.test.ts`, `tests/vitest/ui/popup-defaults.test.ts`)
must stay green — the restyle must not break a single behavioral test. Do NOT
migrate runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a leaf or
  this subtask changes status.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` + the leaf id.
- If any shared restyle primitive (e.g. a token-driven `StatusBadge` or a stat-row
  helper) is added/changed for Popups, note it alongside the TASK-479-06 shell notes
  so other Advanced-module list screens reuse it consistently.
