# TASK-208-01: Shared Sonner Token Contract
# FileName: TASK-208-01_Shared_Sonner_Token_Contract.md

**Priority:** High
**Category:** Admin/UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-208
**Status:** To Do

---

## Overview

Make the one shared Admin UI toaster token-driven before any resource list adds
new notification calls.

The implementation must keep a single `<Toaster />` host in `AdminApp` and make
normal, success, error, warning, and info toasts derive their visual treatment
from Admin UI Theme variables. This is the foundation that prevents new list
toasts from reproducing the current black/green/red Sonner default styling under
a light Admin UI Theme.

## Sub-Tasks

- [ ] `TASK-208-01-01_AdminApp_Toaster_Host_and_Rich_Color_Removal.md`
- [ ] `TASK-208-01-02_Sonner_State_Token_Style_Mapping.md`
- [ ] `TASK-208-01-03_Shared_Toaster_Token_Regression_Tests.md`

## Implementation Round

1. Update the `AdminApp` toaster host so it remains top-right and accessible but
   does not opt into Sonner hard-coded rich colors.
2. Update the shared Sonner wrapper to expose token-backed state styles.
3. Add focused regression tests before resource list work starts.

## Security Contract

- Visibility: internal admin UI notification host.
- Auth/RBAC/CSRF/rate-limit: unchanged; this task changes presentation only.
- Reject-unknown validation: unchanged.
- Anti-abuse: no write path is introduced.

## Files to Change

- `core/admin/app/AdminApp.tsx`
- `core/admin/components/ui/sonner.tsx`
- `core/admin/styles/globals.css` only if Sonner state selectors are required.
- `tests/vitest/admin/adminApp.test.tsx`

## Testing Requirements

- Update `tests/vitest/admin/adminApp.test.tsx`:
  - assert one shared toaster is mounted,
  - assert `position="top-right"`, `closeButton`, `duration={4000}`, and
    `containerAriaLabel="Admin notifications"` remain,
  - assert `richColors` is not passed,
  - assert the Sonner wrapper receives token-backed style variables for success,
    error, warning, info, and normal states.

## Documentation Updates Required in This Round

- `_docs/DESIGN_TOKENS.md`
  - add or update the shared Admin UI toast token contract after implementation.
- `_docs/_TASKS/TASK-208*.md`
  - update status and validation notes when the round is complete.

## Acceptance Criteria

1. The app still mounts exactly one shared Admin UI toaster.
2. The toaster stays top-right, closeable, duration-bound, and accessible.
3. Sonner rich/default state palettes no longer control admin toast state
   surfaces.
4. Toast state colors are controlled by Admin UI Theme tokens or shared admin
   CSS variables.
