# TASK-006-09: Login UI
# FileName: TASK-006-09_Login_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-004, TASK-024
**Status:** Done (2026-01-26)

---

## Overview

Convert the login screen HTML into a shadcn-based layout. This is a standalone
auth screen (no admin sidebar).

## Reference UI

- `_docs/UI/admin_panel/9-login-form/code.html`
- `_docs/UI/admin_panel/9-login-form/screen.png`

## UI Composition

**Wrapper:** `AuthShell` (split brand panel + form card)

**Sections:**
- Brand panel with logo and headline.
- Login form (email, password, remember me).
- Forgot password link.
- SSO buttons (Google, GitHub).
- Footer links.

## Shadcn Components

- `Card`, `Button`, `Input`, `Checkbox`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/layouts/AuthShell.tsx` | create | shared auth layout |
| `core/admin/ui/auth/LoginPage.tsx` | create | screen layout |
| `core/admin/ui/auth/SsoButtons.tsx` | create | Google/GitHub buttons |
| `core/admin/ui/auth/AuthBrandPanel.tsx` | create | left panel |

## Data + State

- `POST /auth/login` with email + password.
- Remember me toggles session TTL.
- Errors displayed inline under fields.

## Unit Tests

- `tests/unit/ui/login.test.tsx` renders form fields + CTA.
- `tests/unit/ui/sso-buttons.test.tsx` renders providers.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-login-ui.md`
