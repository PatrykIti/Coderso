# TASK-006-10: Two Factor UI
# FileName: TASK-006-10_Two_Factor_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-004, TASK-020, TASK-024
**Status:** To Do

---

## Overview

Implement the 2FA setup and verification screen with QR code, OTP input, and
recovery codes section.

## Reference UI

- `_docs/UI/admin_panel/10-mfa-form/code.html`
- `_docs/UI/admin_panel/10-mfa-form/screen.png`

## UI Composition

**Wrapper:** `AuthShell` (centered card, optional top bar slot)

**Sections:**
- QR code panel and instructions.
- OTP input (6 digits with separator).
- Verify button.
- Recovery codes panel with copy/download actions and warning banner.

## Shadcn Components

- `Card`, `Button`, `Input`, `Badge`, `Alert`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/layouts/AuthShell.tsx` | use | shared auth layout |
| `core/admin/ui/auth/TwoFactorPage.tsx` | create | screen layout |
| `core/admin/ui/auth/OtpInput.tsx` | create | 6-digit input |
| `core/admin/ui/auth/RecoveryCodesPanel.tsx` | create | codes + actions |

## Data + State

- `POST /auth/2fa/setup` for QR + secret.
- `POST /auth/2fa/verify` for OTP validation.
- `POST /auth/2fa/recovery-codes` to regenerate codes.

## Unit Tests

- `tests/unit/ui/two-factor.test.tsx` renders steps and recovery panel.
- `tests/unit/ui/otp-input.test.tsx` handles digit input.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-two-factor-ui.md`

