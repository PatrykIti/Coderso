# TASK-196-03-02: Location and Icon Guidance Without Contract Expansion
# FileName: TASK-196-03-02_Location_and_Icon_Guidance_Without_Contract_Expansion.md

**Priority:** Medium
**Category:** CMS/Menus + Admin/UI + Form Guidance
**Estimated Effort:** Small
**Dependencies:** TASK-196-03
**Status:** To Do

---

## Overview

Clarify the two most technical-looking Menus fields without changing what they
store.

The report called out two gaps:

- `Location` feels too abstract,
- `Icon Name` feels like a blind token input.

This leaf improves guidance while keeping the existing string-based contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/menus/MenuCreateDialog.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuItemForm.tsx`
- `tests/vitest/ui/menu-item-form.test.tsx`
- `tests/vitest/ui/menu-leaf-components.test.tsx` only if the drawer wiring
  remains the best owner for field-help assertions

## Implementation Direction

- `Location`:
  - explain it in end-user terms,
  - mention realistic examples such as `primary` or `footer`,
  - avoid implying that only a fixed built-in registry is allowed.
- `Icon Name`:
  - give immediate guidance about what kind of token is expected,
  - prefer a low-cost preview or validation hint if it can be done from the
    current icon source,
  - do not turn this leaf into a full icon-browser subsystem.
- Keep helper copy aligned between create and edit contexts when the same field
  appears in both places.

## Security Contract

- Visibility: internal admin form guidance only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - helper copy must not promise unsupported server validation behavior,
  - any preview must derive from safe local icon metadata only.

## Testing Requirements

- `tests/vitest/ui/menu-item-form.test.tsx`
  - helper copy for `Icon Name` is visible and meaningful
  - any icon preview or invalid-token hint is covered if added
- `tests/vitest/ui/menu-leaf-components.test.tsx`
  - only if the real drawer path is needed to prove the updated guidance renders
    in context

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Location` tells the user what the value is for and gives concrete examples.
2. `Icon Name` no longer feels like an unexplained raw token box.
3. The stored menu contract remains string-based.
