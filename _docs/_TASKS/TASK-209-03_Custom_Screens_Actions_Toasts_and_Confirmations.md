# TASK-209-03: Custom Screens Actions, Toasts, and Confirmations
# FileName: TASK-209-03_Custom_Screens_Actions_Toasts_and_Confirmations.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI + Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-209-02, TASK-208
**Status:** Done (2026-04-25)

---

## Overview

Make Custom Screens row, create, status, delete, and bulk actions follow the
same feedback and destructive-action model as Pages.

This round must reuse the shared list-action toast helper and shared
`ConfirmActionDialog`. It must not add direct `toast.success`/`toast.error`
branches in Custom Screens list code for the targeted list actions.

## Sub-Tasks

- [ ] TASK-209-03-01: Custom Screen List Action Toast Adapter
- [ ] TASK-209-03-02: Custom Screen Row Lifecycle and Status Actions
- [ ] TASK-209-03-03: Custom Screen Bulk Actions and Delete Confirmations

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenCreateDrawer.tsx`
- `core/admin/ui/custom-screens/CustomScreenRowActions.tsx`
- `core/admin/ui/custom-screens/CustomScreenBulkActionsBar.tsx`
- optional resource-local toast adapter file if the config is shared by the
  page and create drawer.
- `core/admin/ui/shared/listActionToasts.ts` only if a resource-neutral gap is
  discovered; do not add Custom Screens-specific behavior there.
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI and existing internal admin API only.
- Auth model: existing authenticated admin session/admin API key.
- RBAC: `content:write` for create, status update, and delete.
- CSRF: writes continue through `createCustomScreen`, `updateCustomScreen`, and
  `deleteCustomScreen`, all with existing CSRF handling.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: status actions submit only `{ status: "active" }`
  or `{ status: "draft" }`; create submits only the existing create schema
  fields.
- Anti-abuse: destructive delete requires confirmation; bulk actions operate on
  visible selected ids only and preserve partial-failure reporting.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-list-wave.test.tsx`
- `bun test tests/integration/routes/customScreensRoutes.test.ts` only if route
  mapping or route registration changes.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md` only if shared toast or dialog token behavior changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Create, activate, move-to-draft, delete, and bulk outcomes use the shared
   toast helper.
2. Row delete and bulk delete cannot run before confirmation.
3. Status actions use the existing `PATCH /custom-screens/:id` contract.
4. Inline partial-failure messages and top-right toasts agree on counts and
   labels.
