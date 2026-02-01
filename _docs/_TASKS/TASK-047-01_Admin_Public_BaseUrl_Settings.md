# TASK-047-01: Admin/Public Base URL Settings
# FileName: TASK-047-01_Admin_Public_BaseUrl_Settings.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Small  
**Dependencies:** TASK-047  
**Status:** 🟡 To Do

---

## Overview

Dodaj ustawienia do globalnych settings:
- `site.adminBaseUrl` (string, nullable)
- `site.publicBaseUrl` (string, nullable)

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Settings | `core/services/settings/settingsService.ts` | Add defaults + validation |
| Schemas | `core/server/validation/settingsSchemas.ts` | allow keys |
| Docs | `_docs/CMS_API.md` | document keys |

---

## Testing Requirements

- Unit: settingsService accepts URLs / rejects invalid types

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md`
- `_docs/_CHANGELOG/<new>.md`
