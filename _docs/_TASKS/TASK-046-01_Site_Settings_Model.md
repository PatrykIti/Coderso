# TASK-046-01: Site Settings Model (Routes + Homepage)
# FileName: TASK-046-01_Site_Settings_Model.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-046  
**Status:** ✅ Done (2026-02-03)

---

## Overview

Dodaj konfigurację publicznej strony do DB settings (globalne), aby wszystko było sterowane z admina.

### Kluczowe ustawienia
- `site.baseUrl` (string)
- `site.homepageId` (pageId)
- `site.notFoundPageId` (pageId)
- `site.previewEnabled` (bool)
- `site.contentRoutes` (map: contentType → routing)

Przykład `site.contentRoutes`:
```json
{
  "blog": {
    "basePath": "/blog",
    "listPageId": "uuid",
    "detailPageId": "uuid"
  }
}
```

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Settings | `core/services/settings/settingsService.ts` | Add keys + validation |
| Schemas | `core/server/validation/settingsSchemas.ts` | allow new keys |
| Docs | `_docs/CMS_API.md` | document new settings |

---

## Testing Requirements

- Unit: `settingsService` validates new keys

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SITE_RUNTIME.md`
- `_docs/_CHANGELOG/<new>.md`
