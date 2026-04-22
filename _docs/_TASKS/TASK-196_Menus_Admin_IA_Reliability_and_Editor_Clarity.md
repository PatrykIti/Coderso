# TASK-196: Menus Admin IA, Reliability, and Editor Clarity
# FileName: TASK-196_Menus_Admin_IA_Reliability_and_Editor_Clarity.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-002, TASK-058, TASK-170
**Status:** To Do

---

## Overview

Address the defects and UX gaps captured in
`_docs/PLAYWRIGHT/SUMMARY-MENUS.md` and ship the agreed IA change for Menus:

- `/admin/menus` becomes a list screen like `Pages`,
- `/admin/menus/:id` becomes the editor for exactly one chosen menu,
- the editor no longer contains the dropdown used to switch between different
  menus.

This family is not a redesign of the navigation data model or runtime
navigation widget contract. It is a correctness and clarity wave for the
already-shipped Menus admin surface.

The report findings that still need explicit owner tracking are:

### Bugs

- Critical: menu item deletion still relies on native `window.confirm()`.
- Medium: submenu relationships are not visually clear in `Menu Structure`.
- Medium: `Save changes` does not provide explicit success feedback.
- Medium: the current `Active menu` switcher creates misleading editor state;
  this family resolves that by removing it from the editor and splitting the
  Menus IA into list -> chosen editor.

### UX gaps

- The current Menus surface opens directly into an editor instead of first
  showing a manageable list of menus.
- Row click and explicit edit controls communicate overlapping intent without
  enough affordance clarity.
- Drag-and-drop hints do not have strong visual support.
- `Icon Name` provides no meaningful guidance or preview path.
- `Location` remains too abstract for non-technical admins.

This family must preserve the behaviors the report called out as already good:

- clear empty state and first menu creation,
- rich menu item settings (link type, visibility, badges, parent assignment),
- working page lookup for page-linked items,
- save/discard dirty-state behavior,
- refresh and cache-driven hydration.

## Sub-Tasks

- `TASK-196-01_Menus_List_Screen_and_Single_Editor_Routing.md`
- `TASK-196-02_Menu_Item_Deletion_Safety_and_Tree_Readability.md`
- `TASK-196-03_Editor_Feedback_and_Field_Guidance.md`
- `TASK-196-04_QA_Docs_and_Closure.md`

## Scope

This umbrella covers three owner areas plus closure:

1. Menus IA split:
   - list-first `/menus` surface,
   - explicit `/menus/:id` editor route,
   - removal of the in-editor cross-menu dropdown,
   - route-aware cache hydration instead of editor-local active-menu state.
2. Item safety and tree readability:
   - branded delete confirmation dialog,
   - descendant context before deletion,
   - visible nested hierarchy,
   - clearer drag/edit/delete affordances.
3. Editor feedback and guidance:
   - explicit success/failure feedback for save,
   - clearer `Location` explanation,
   - pragmatic `Icon Name` help without inventing a new icon-management
     subsystem.
4. QA/docs/closure:
   - targeted Vitest/Bun validation,
   - replay of the Menus report checklist,
   - cache/docs/board/changelog synchronization.

Out of scope:

- new public menu endpoints or runtime navigation DSL changes,
- menu schema/database changes beyond the existing `menus` +
  `menu_items.settings` contract,
- theme-level location registry redesign,
- a new whole-menu delete/archive workflow on the list page,
- mega-menu features or layout primitives,
- broad rework of assistant menu actions beyond route alignment for the selected
  resource.

## Architecture

Current owner seams in code:

- Menus editor and menu-item workflow:
  - `core/admin/ui/menus/MenuEditorPage.tsx`
  - `core/admin/ui/menus/MenuCreateDialog.tsx`
  - `core/admin/ui/menus/MenuItemDrawer.tsx`
  - `core/admin/ui/menus/MenuItemForm.tsx`
  - `core/admin/ui/menus/MenuTree.tsx`
  - `core/admin/ui/menus/MenuItemRow.tsx`
- Client cache and refresh behavior:
  - `core/admin/services/menusClient.ts`
  - `core/admin/utils/adminPrefetch.ts`
  - `core/admin/services/cachePolicy.ts`
- Admin routing and selected-surface context:
  - `core/admin/app/AdminApp.tsx`
  - `core/admin/ui/contexts/AdminRouterContext.tsx`
  - `core/admin/ui/assistant/useAssistantAdminContext.ts`
- Existing list/editor patterns to reuse:
  - `core/admin/ui/pages/PageListPage.tsx`
  - `core/admin/ui/pages/PageEditor.tsx`
- Existing internal API contracts that stay stable unless a later leaf proves
  otherwise:
  - `core/server/routes/menuRoutes.ts`
  - `core/services/menus/menuService.ts`
  - `core/services/menus/treeBuilder.ts`

Reuse-first rule:

- mirror the list -> editor split already used by `Pages` instead of keeping a
  Menus-only active-resource dropdown,
- keep route generation/navigation on shared admin helpers
  (`AdminLink`, `adminPaths`, `prefetchAdminRoute`) instead of hand-building
  Menus-only href logic,
- keep the current `listMenusCached` and `getMenuWithItemsCached` ownership
  split; the list owns summary hydration and the editor owns one menu detail,
- keep deletion confirmation on the existing dialog primitives instead of
  adding a new modal dependency,
- keep confirmation responsibilities explicit:
  - `MenuEditorPage.tsx` owns which item is pending deletion and which
    descendants are affected,
  - the confirmation dialog surface owns only rendering and confirm/cancel UI,
  - row and drawer surfaces stay trigger-only,
- treat `/menus/:id` as the canonical selected-menu route because
  `useAssistantAdminContext.ts` already recognizes that shape,
- keep `Location` as the current free-text contract unless a later task
  explicitly approves a typed registry.

## Security Contract

- Visibility: internal admin Menus UI only.
- Internal endpoints remain `/admin/api/menus*`.
- Auth model: authenticated admin session / admin API key where supported by
  the shared admin stack.
- RBAC: unchanged.
  - `menus:read` for menu list/detail reads.
  - `menus:write` for create/update/item replace.
- CSRF: unchanged for current mutating admin endpoints.
- Rate-limit buckets: unchanged (`admin_read`, `admin_write`).
- Reject-unknown validation: unchanged; this family must not loosen current menu
  payload validation.
- Anti-abuse:
  - no new public write path,
  - delete confirmation UI must not bypass exact server-side validation on save,
  - route changes must not leak menu data outside the authenticated admin
    surface,
  - save feedback must not expose CSRF tokens, internal headers, or raw server
    stack traces.

## Implementation Order

1. Split Menus into list route + chosen editor route first so the rest of the
   UX work lands on the correct IA.
2. Replace native delete confirmation and make tree structure truthful.
3. Add save feedback and field guidance.
4. Re-run the Menus checklist, sync docs, task board, and changelog.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/menu-editor-refresh-policy.test.tsx tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-item-form.test.tsx tests/vitest/ui/menu-item-delete-dialog.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/admin/adminApp.test.tsx`
  - keep list-vs-editor routing proof in `tests/vitest/admin/adminApp.test.tsx`
    or an equivalent route-owner suite; do not treat pure component renders as
    sufficient evidence that `/menus` and `/menus/:id` resolve correctly
  - keep `tests/vitest/ui/menu-item-delete-dialog.test.tsx` as the mandatory
    real `Dialog` wrapper proof for the delete flow; mocked leaf suites are
    wiring-only evidence
  - keep at least one real `MenuItemRow` / `MenuTree` path so hierarchy and
    drag affordance regressions are proven on the actual DOM, not only mocked
    leaf-component wiring
  - if `core/admin/utils/adminPrefetch.ts` changes as part of the route split,
    add the named Vitest owners `tests/vitest/admin/adminPrefetch.test.ts` and
    `tests/vitest/admin/admin-prefetch-policy.test.ts` in addition to any perf
    gate rerun
- Bun only if a leaf widens server/service behavior:
  - `set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts`
- Perf gate only if route-prefetch semantics change materially:
  - `set -a && source .env && set +a && bun test tests/perf/admin-prefetch-budget.test.ts`
- QA replay:
  - replay the scenarios from `_docs/PLAYWRIGHT/SUMMARY-MENUS.md` after the
    family lands; do not close from unit coverage alone

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `docs/screens/menus.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when TASK-196 closes

## Acceptance Criteria

1. `/admin/menus` is a list-first surface and `/admin/menus/:id` edits exactly
   one chosen menu.
2. The editor no longer exposes the dropdown used to switch between unrelated
   menus.
3. Deletion, hierarchy, drag/edit affordances, and save feedback all become
   explicit and user-readable.
4. `Location` and `Icon Name` no longer feel like unexplained technical fields.
5. The Playwright Menus report is covered by named Vitest/Bun proofs and replay
   notes.
