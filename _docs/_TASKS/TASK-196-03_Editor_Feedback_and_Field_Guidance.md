# TASK-196-03: Editor Feedback and Field Guidance
# FileName: TASK-196-03_Editor_Feedback_and_Field_Guidance.md

**Priority:** Medium
**Category:** CMS/Menus + Admin/UI + Feedback
**Estimated Effort:** Medium
**Dependencies:** TASK-196-01, TASK-196-02
**Status:** Done (2026-04-22)

---

## Overview

Make the Menus editor more honest after mutation and easier to understand before
mutation.

This task covers two polish areas that remain after the IA and tree work:

- users need visible feedback when menu save succeeds or fails,
- `Location` and `Icon Name` need clearer guidance without turning Menus into a
  new configuration system.

## Sub-Tasks

- `TASK-196-03-01_Save_Feedback_and_Dirty_State_Visibility.md`
- `TASK-196-03-02_Location_and_Icon_Guidance_Without_Contract_Expansion.md`

## Files to Change

- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuCreateDialog.tsx`
- `core/admin/ui/menus/MenuItemForm.tsx`
- `core/admin/app/AdminApp.tsx` if a shared toaster mount is needed
- `core/admin/components/ui/sonner.tsx` only if the shared primitive itself
  requires a tiny compatibility adjustment
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- `tests/vitest/ui/menu-item-form.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`

## Architecture

Current owner seams:

- editor mutation lifecycle:
  - `MenuEditorPage.tsx`
- create dialog wording:
  - `MenuCreateDialog.tsx`
- item-field guidance:
  - `MenuItemForm.tsx`
- shared toast host if needed:
  - `AdminApp.tsx`
  - `core/admin/components/ui/sonner.tsx`

Reuse-first rule:

- keep the current dirty-state badge as passive context,
- add visible success/error feedback on top of it rather than replacing it,
- prefer the existing shared `sonner` primitive over a Menus-only toast host,
- keep `Location` and `Icon Name` bound to the existing string contract unless
  a later product task explicitly approves typed registries or pickers.

## Security Contract

- Visibility: internal admin Menus editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - feedback must not leak raw server stack traces or tokens,
  - helper copy must not imply unsupported `Location` values or fake icon
    validation guarantees.

## Testing Requirements

- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - visible success/failure feedback after save
  - dirty-state badge remains accurate before and after save
- `tests/vitest/ui/menu-leaf-components.test.tsx`
  - create-dialog `Location` helper copy is covered on the real create surface
- `tests/vitest/ui/menu-item-form.test.tsx`
  - new helper or preview guidance renders for `Icon Name`
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - editor-side `Location` helper copy or contextual guidance is covered on the
    real editor surface
- `tests/vitest/admin/adminApp.test.tsx`
  - only if shared toaster mount changes

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Saving a menu gives visible confirmation beyond the small dirty-state badge.
2. Save failure is surfaced in a way users can actually see.
3. `Location` and `Icon Name` become understandable without widening the saved
   contract.
