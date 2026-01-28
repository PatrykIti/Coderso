# TASK-006-18: Settings Security UI (Visual)
# FileName: TASK-006-18_Settings_Security_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-020, TASK-024  
**Status:** Done (2026-01-28)

---

## Overview

Add the “Settings → Security” screen: password policy, MFA enforcement,
session TTL, IP allowlist, login alerts.

## Reference UI

- `_docs/UI/admin_panel/18-security-settings/code.html`
- `_docs/UI/admin_panel/18-security-settings/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Security policy cards (password, MFA, session TTL).
- IP allowlist table + add action.
- Login alerts preferences.

## Shadcn Components

- `Card`, `Button`, `Input`, `Switch`, `Select`, `Table`,
  `Badge`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/SecuritySettingsPage.tsx` | create | main layout |
| `core/admin/ui/settings/SecurityPolicyCard.tsx` | create | policy block |
| `core/admin/ui/settings/IpAllowlistTable.tsx` | create | table |
| `core/admin/ui/settings/LoginAlertsCard.tsx` | create | alerts toggles |

## Data + State

- `GET /settings/security` (policy + alerts).
- `PATCH /settings/security` (updates).
- `GET /settings/security/ip-allowlist`.
- `POST /settings/security/ip-allowlist`.
- `DELETE /settings/security/ip-allowlist/:id`.

## Unit Tests

- `tests/unit/ui/security-settings.test.tsx` renders cards + table.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-settings-security-ui.md`
