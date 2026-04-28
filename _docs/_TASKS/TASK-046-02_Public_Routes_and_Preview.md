# TASK-046-02: Public Routes & Preview
# FileName: TASK-046-02_Public_Routes_and_Preview.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-046-01  
**Status:** ✅ Done (2026-02-03)

---

## Overview

Rozszerz publiczny router:
- Homepage → pageId z ustawień
- 404 page → pageId z ustawień
- `/blog` → list page
- `/blog/:slug` → entry detail
- `/preview` → respektuje `site.previewEnabled`

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Router | `core/server/publicSite.tsx` | use site settings |
| Services | `core/services/content/entryService.ts` | helper: getEntryBySlug |
| Validation | `core/services/pages/previewService.ts` | enforce previewEnabled |
| Tests | `tests/unit/site/publicRoutes.test.ts` | route logic |

---

## Expected Behavior

- Jeśli `site.homepageId` ustawione → `/` renderuje tę stronę.
- Jeśli `site.notFoundPageId` ustawione → 404 renderuje custom page.
- Jeśli `site.previewEnabled=false` → `/preview` zwraca 404.

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md`
- `_docs/_CHANGELOG/<new>.md`
