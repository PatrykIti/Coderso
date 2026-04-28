# TASK-208-01: Shared Sonner Token Contract
# FileName: TASK-208-01_Shared_Sonner_Token_Contract.md

**Priority:** High
**Category:** Admin/UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-208
**Status:** Done (2026-04-24)

---

## Overview

Make the one shared Admin UI toaster token-driven before any resource list adds
new notification calls.

The implementation must keep a single `<Toaster />` host in `AdminApp` and make
normal, success, error, warning, and info toasts derive their visual treatment
from Admin UI Theme variables. Info uses the neutral popover token set unless a
separate token-contract task adds a first-class Admin UI Theme info state.
Sonner's documented `richColors` prop should
remain enabled because Sonner uses it to apply typed success/error/warning/info
state selectors. The shared wrapper must override the Sonner state CSS variables
with Admin UI Theme tokens so new list toasts do not reproduce the current
black/green/red/yellow/blue bundled palette under a light Admin UI Theme. The
variables must stay dynamic so any custom Admin UI Theme template/profile update
flows into every toast state through the active CSS variable set instead of a
hard-coded wrapper palette.

This round also owns the full visible floating-toast surface, not only the state
swatches. The toast shell, title, description text, border, close button,
action/cancel controls, loading indicator, shadow, hover, focus ring, and typed
state colors must all resolve from Admin UI Theme variables or scoped shared
admin CSS. If Sonner's bundled stylesheet hard-codes a visible sub-part, this
task must override it in the shared wrapper or in `core/admin/styles/globals.css`
with selectors scoped to the shared `.toaster` host.

## Sub-Tasks

- [x] `TASK-208-01-01_AdminApp_Toaster_Host_and_Rich_Color_Token_Ownership.md`
- [x] `TASK-208-01-02_Sonner_State_Token_Style_Mapping.md`
- [x] `TASK-208-01-03_Shared_Toaster_Token_Regression_Tests.md`

## Implementation Round

1. Update the `AdminApp` toaster host so it remains top-right, accessible, and
   `richColors` enabled, while the shared wrapper prevents Sonner's bundled rich
   color values from being the visual source of truth.
2. Update the shared Sonner wrapper to expose token-backed state styles.
3. Add scoped shared CSS only for Sonner sub-parts that cannot be controlled
   from the host style map, such as description text or close-button styling.
4. Add a direct wrapper regression test for token variables and keep
   `AdminApp` coverage focused on the single host configuration.
5. Add focused regression tests before resource list work starts.

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
- `tests/vitest/admin/sonner.test.tsx`

## Testing Requirements

- Update `tests/vitest/admin/adminApp.test.tsx`:
  - assert one shared toaster is mounted,
  - assert `position="top-right"`, `closeButton`, `duration={4000}`, and
    `containerAriaLabel="Admin notifications"` remain,
  - assert `richColors` is passed intentionally and the wrapper test proves that
    rich-color state variables are token-backed.
- Add `tests/vitest/admin/sonner.test.tsx`:
  - assert the Sonner wrapper receives token-backed style variables for success,
    error, warning, info, and normal states,
  - assert a custom Admin UI Theme template/profile can drive the visible toast
    shell, foreground, description, border, close button, action/cancel
    controls, loading indicator, shadow, hover, and focus states through CSS
    variables or scoped shared selectors,
  - assert no test-covered visible toast part still relies on Sonner's bundled
    HSL/hex palettes unless that exact color comes from the active Admin UI
    Theme token fixture,
  - assert the wrapper preserves the current `useTheme()`-derived theme instead
    of hard-coding a specific mode.

## Documentation Updates Required in This Round

- `_docs/DESIGN_TOKENS.md`
  - add or update the shared Admin UI toast token contract after implementation.
- `_docs/_TASKS/TASK-208*.md`
  - update status and validation notes when the round is complete.

## Acceptance Criteria

1. The app still mounts exactly one shared Admin UI toaster.
2. The toaster stays top-right, closeable, duration-bound, and accessible.
3. Sonner rich/default bundled state palettes no longer control admin toast state
   surfaces.
4. Toast state colors, shell, title, description, border, focus/close affordance,
   action/cancel controls, loading indicator, shadow, hover, and icon-adjacent
   text are controlled by Admin UI Theme tokens or shared admin CSS variables.
5. Custom Admin UI Theme templates/profiles update toast visuals through dynamic
   variable values without resource-specific styling changes.
