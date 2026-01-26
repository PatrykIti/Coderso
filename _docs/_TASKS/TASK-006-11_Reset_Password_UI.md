# TASK-006-11: Reset Password UI
# FileName: TASK-006-11_Reset_Password_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-004, TASK-024
**Status:** To Do

---

## Overview

Build the reset password request screen with email input and security note.

## Reference UI

- `_docs/UI/admin_panel/11-reset-password-form/code.html`
- `_docs/UI/admin_panel/11-reset-password-form/screen.png`

## UI Composition

**Wrapper:** `AuthShell` (centered card)

**Sections:**
- Brand header.
- Info banner with instructions.
- Email input + helper text.
- Primary action + back to login link.
- Footer security note.

## Shadcn Components

- `Card`, `Button`, `Input`, `Alert`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/layouts/AuthShell.tsx` | use | shared auth layout |
| `core/admin/ui/auth/ResetPasswordPage.tsx` | create | screen layout |
| `core/admin/ui/auth/InfoBanner.tsx` | create | reusable banner |

## Data + State

- `POST /auth/reset-password` with email.
- Show success state after submission.

## Unit Tests

- `tests/unit/ui/reset-password.test.tsx` renders form + banner.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-reset-password-ui.md`

