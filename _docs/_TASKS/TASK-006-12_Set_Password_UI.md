# TASK-006-12: Set Password UI (Visual)
# FileName: TASK-006-12_Set_Password_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-004, TASK-024
**Status:** Done (2026-01-26)

---

## Overview

Implement the set new password screen with strength checklist and confirm
password field.

## Reference UI

- `_docs/UI/admin_panel/12-set-password-form/code.html`
- `_docs/UI/admin_panel/12-set-password-form/screen.png`

## UI Composition

**Wrapper:** `AuthShell` (centered card)

**Sections:**
- Header with icon and instructions.
- New password + confirm password inputs with show/hide.
- Password strength checklist.
- Submit action + back link.

## Shadcn Components

- `Card`, `Button`, `Input`, `Badge`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/layouts/AuthShell.tsx` | use | shared auth layout |
| `core/admin/ui/auth/SetPasswordPage.tsx` | create | screen layout |
| `core/admin/ui/auth/PasswordStrengthList.tsx` | create | checklist |

## Data + State

- `POST /auth/set-password` with reset token + new password.
- Inline validation for strength rules.

## Unit Tests

- `tests/unit/ui/set-password.test.tsx` renders checklist + inputs.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-set-password-ui.md`
