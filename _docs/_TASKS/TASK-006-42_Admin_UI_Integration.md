# TASK-006-42: Admin UI Integration (Routing + Navigation)
# FileName: TASK-006-42_Admin_UI_Integration.md

**Priority:** High  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-024, TASK-006-01..41  
**Status:** To Do

---

## Overview

Single integration task that connects all visual admin screens into routing
and navigation. This is the only place that touches shared files like
`AdminApp.tsx` and sidebar configs to avoid conflicts across parallel UI work.

## Scope

- Add routes for all admin screens.
- Update sidebar and settings navigation items.
- Ensure settings sub-pages are linked consistently.
- Keep base `/admin/` redirect behavior.

## Files to Update (shared)

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/app/AdminApp.tsx` | update | add routes for all UI pages |
| `core/admin/ui/navigation/sidebarConfig.ts` | update | add nav entries |
| `core/admin/ui/settings/SettingsSidebar.tsx` | update | add settings sub-pages |

## Route Map (summary)

Core:
- `/admin` (dashboard)
- `/admin/pages`, `/admin/pages/:id`
- `/admin/media`
- `/admin/menus`
- `/admin/users`
- `/admin/audit`
- `/admin/search`

Content:
- `/admin/content-types`
- `/admin/entries`
- `/admin/entries/:id`

Store / Plugins:
- `/admin/store`
- `/admin/store/plugins/:id`

Themes & Widgets:
- `/admin/themes`
- `/admin/themes/:id`
- `/admin/widgets`

Tools:
- `/admin/analytics`
- `/admin/backups`
- `/admin/redirects`
- `/admin/tools/import-export`

Settings (sub-pages):
- `/admin/settings`
- `/admin/settings/general`
- `/admin/settings/security`
- `/admin/settings/security/ip-allowlist`
- `/admin/settings/security/sessions`
- `/admin/settings/security/login-alerts`
- `/admin/settings/api-keys`
- `/admin/settings/webhooks`
- `/admin/settings/email`
- `/admin/settings/storage`
- `/admin/settings/integrations`

## Navigation Items

**Main:**
Dashboard, Pages, Entries, Media, Menus, Widgets

**Admin:**
Users, Audit Logs, Roles Matrix

**Settings:**
General, Security, API Keys, Webhooks, Email, Storage, Integrations

**Tools:**
Search, Analytics, Backups, Import/Export, Redirects

## Testing Requirements

- `tests/unit/ui/admin-nav.test.tsx` ensures sidebar renders all core links.
- `tests/unit/ui/settings-sidebar.test.tsx` ensures settings list includes new pages.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-admin-ui-integration.md`
