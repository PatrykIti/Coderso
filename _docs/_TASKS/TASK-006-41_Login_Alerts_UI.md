# TASK-006-41: Login Alerts UI (Visual)
# FileName: TASK-006-41_Login_Alerts_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Create the “Security → Login Alerts” screen with alert toggles and thresholds.
Visual-only layer until security endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/41-login-alerts/code.html`
- `_docs/UI/admin_panel/41-login-alerts/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Toggle cards (email alerts, admin-only alerts).
- Threshold settings (failed attempts).

## Shadcn Components

- `Card`, `Button`, `Switch`, `Input`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/LoginAlertsPage.tsx` | create | main layout |
| `core/admin/ui/settings/LoginAlertsCard.tsx` | create | toggle card |

## Data + State

- `GET /settings/security/login-alerts`
- `PATCH /settings/security/login-alerts`

## Unit Tests

- `tests/unit/ui/login-alerts.test.tsx` renders toggles.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-login-alerts-ui.md`
