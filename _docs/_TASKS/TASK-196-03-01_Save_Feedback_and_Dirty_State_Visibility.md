# TASK-196-03-01: Save Feedback and Dirty-State Visibility
# FileName: TASK-196-03-01_Save_Feedback_and_Dirty_State_Visibility.md

**Priority:** Medium
**Category:** CMS/Menus + Admin/UI + Mutation Feedback
**Estimated Effort:** Medium
**Dependencies:** TASK-196-03
**Status:** To Do

---

## Overview

Make save outcomes visible.

Today the Menus editor changes a small badge from `Unsaved changes` to
`All changes saved`, but that is too subtle to confirm an important mutation.
This leaf adds explicit success/failure feedback while preserving the existing
dirty-state indicator.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/app/AdminApp.tsx` if the shared toaster is not already mounted
- `core/admin/components/ui/sonner.tsx` only if a tiny mount or theme tweak is
  required for Menus to reuse it
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`

## Implementation Direction

- Preferred path:
  - reuse the shared `sonner` infrastructure,
  - mount `Toaster` once at the admin root if it is still missing,
  - emit success feedback only after the awaited save completes.
- Keep the existing badge:
  - it remains useful for passive draft state,
  - it is not sufficient as the only confirmation surface.
- Failure feedback should remain actionable and visible.
- Do not add a Menus-only global event bus or a Menus-only toast host.

## Security Contract

- Visibility: internal admin save feedback only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - success feedback fires only after a real successful response,
  - failure copy must stay user-readable without leaking internal stack traces.

## Testing Requirements

- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - save success shows visible confirmation
  - save failure shows visible error feedback
  - dirty-state badge still transitions correctly around the save lifecycle
- `tests/vitest/admin/adminApp.test.tsx`
  - if `AdminApp` mounts the shared toaster

## Documentation Updates Required

- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Successful save produces explicit visible confirmation.
2. Failed save is not hidden behind subtle shell state.
3. Dirty-state signaling stays correct before and after save.
