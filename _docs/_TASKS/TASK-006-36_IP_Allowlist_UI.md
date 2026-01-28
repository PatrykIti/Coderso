# TASK-006-36: IP Allowlist UI (Visual)
# FileName: TASK-006-36_IP_Allowlist_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020, TASK-024  
**Status:** To Do

---

## Overview

Create the “Security → IP Allowlist” screen with list and add flow. Visual-only
layer until security endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/36-ip-allowlist/code.html`
- `_docs/UI/admin_panel/36-ip-allowlist/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Allowlist table (range, label, status).
- Add IP range drawer.

## Shadcn Components

- `Table`, `Button`, `Input`, `Badge`, `Sheet`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/IpAllowlistPage.tsx` | create | main layout |
| `core/admin/ui/settings/IpAllowlistTable.tsx` | create | list |
| `core/admin/ui/settings/IpAllowlistDrawer.tsx` | create | add flow |
| `core/admin/ui/settings/SettingsSidebar.tsx` | update | keep security nav |
| `core/admin/app/AdminApp.tsx` | update | route `/admin/settings/security/ip-allowlist` |

## Data + State

- `GET /settings/security/ip-allowlist`
- `POST /settings/security/ip-allowlist`
- `DELETE /settings/security/ip-allowlist/:id`

## Unit Tests

- `tests/unit/ui/ip-allowlist.test.tsx` renders table + drawer.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-ip-allowlist-ui.md`
