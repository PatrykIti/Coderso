# TASK-479-19: Commerce Screen Migration
# FileName: TASK-479-19-Commerce-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Commerce
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype for the **Commerce** experience into the
real admin. This covers the products **list** screen and the product **editor** so
both adopt the soft & friendly (Notion-like) language: warm neutral canvas, white
`rounded-2xl` cards, soft shadows, **violet** accent, light default + dark toggle.
Only the presentation layer changes — all data loading, caching, RBAC, routing, the
product schema, and the editor's dirty-state protection are preserved exactly. This
is a self-hosted WordPress-competitor admin, so the editor stays fully functional
(NOT the non-functional preview); only chrome/cards/typography are restyled.

- **Goal:** Make `core/admin/ui/commerce/CommerceListPage.tsx` (+ `CommerceTable`,
  `CommerceFilters`, `CommerceBulkActionsBar`, `CommerceRowActions`) and
  `core/admin/ui/commerce/CommerceEditorPage.tsx` (+ `commerceEditorModel`,
  `components/*`, `hooks/useCommerceCatalog`) match the prototype look while keeping
  every behavior, so a user sees a redesigned products list (soft stat row + warm
  `rounded-2xl` `DataTable`) and a calmer two-column product editor with no
  functional regressions.
- **Owning module/service:** `core/admin/ui/commerce/**` (list page + table +
  filters + bulk bar + row actions; editor page + model + `components/{CommerceEditorSections,CommerceContextPanel,CommerceCollectionsPanel}.tsx`;
  `hooks/useCommerceCatalog.ts`). Shared primitives from TASK-479-05/06
  (`core/admin/styles/globals.css`, `AdminShell`, `EditorShell`,
  `@/ui/shared/PageHeader`, the shared `DataTable`/`StatusBadge`/`FilterBar` patterns).
- **Source-of-truth docs:** `_docs/_PROTOTYPE/README.md`, `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`, the parent
  `TASK-479_Admin_UI_Visual_Redesign_Prototype.md`. Prototype source screens:
  `_docs/_PROTOTYPE/src/pages/advanced/CommercePage.tsx` and
  `_docs/_PROTOTYPE/src/pages/advanced/CommerceEditorPreview.tsx`; prototype
  primitives under `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}`; tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No changes to the commerce API routes, the `commerceClient`
  service, `cachePolicy`/`cacheKeys`, `cacheBus`, the product schema
  (`commerceEditorModel` ↔ `CommerceProductInput`), the variants model, RBAC, or
  `adminPaths`. No new commerce features (no real revenue/orders telemetry, no new
  media uploader, no new inventory-tracking field). The prototype's mock
  revenue/orders stats and switch/price-summary affordances are reproduced only
  from data the real catalog already exposes — see L01/L02. Global token + shell
  redesign land in TASK-479-05 and TASK-479-06 and are consumed here, not
  re-implemented.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-19-L01 | Products List Restyle | ⏳ To Do |
| TASK-479-19-L02 | Product Editor Restyle | ⏳ To Do |
| TASK-479-19-L03 | Commerce Tests | ⏳ To Do |

---

## Testing Requirements

Testing lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Every
leaf must run and pass:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx tests/vitest/ui/commerce-list-page-wave.test.tsx`
  (existing behavioral suites — must stay green) plus the new
  `tests/vitest/ui-integration/commerce-list-restyle.test.tsx` and
  `tests/vitest/ui-integration/commerce-editor-restyle.test.tsx` suites added in L03.

The pre-existing Commerce suites (`commerce-page`, `commerce-list-page-wave`,
`commerceClient`, `commerceSchemas`) must stay green — the restyle must not break a
single behavioral test. Do NOT migrate runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics whenever a leaf or
  this subtask changes status.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` + the leaf id.
- If any shared restyle primitive (e.g. a token-driven `StatusBadge`/stock-badge
  helper or a stat-row pattern) is added/changed for Commerce, note it alongside the
  TASK-479-06 shell/design notes so other list screens reuse it consistently.
