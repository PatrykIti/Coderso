# TASK-006-31: Email Settings UI (Visual)
# FileName: TASK-006-31_Email_Settings_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-024  
**Status:** To Do

---

## Overview

Create the “Settings → Email” screen with SMTP config and test email action.
Visual-only layer until email settings endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/31-email-settings/code.html`
- `_docs/UI/admin_panel/31-email-settings/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- SMTP credentials card.
- From address + sender name.
- Test email card with status.

## Shadcn Components

- `Card`, `Button`, `Input`, `Select`, `Separator`, `Badge`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/EmailSettingsPage.tsx` | create | main layout |
| `core/admin/ui/settings/SmtpCard.tsx` | create | SMTP fields |
| `core/admin/ui/settings/SettingsSidebar.tsx` | update | add “Email” |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/settings/email` |

## Data + State

- `GET /settings/email`
- `PATCH /settings/email`
- `POST /settings/email/test`

## Unit Tests

- `tests/unit/ui/email-settings.test.tsx` renders cards + test CTA.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-email-settings-ui.md`
