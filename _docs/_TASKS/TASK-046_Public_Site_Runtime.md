# TASK-046: Public Site Runtime (Index)
# FileName: TASK-046_Public_Site_Runtime.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-044 (Public Pages Rendering), TASK-045-03 (Public CSS Build)  
**Status:** 🟡 To Do

---

## Overview

Rozbuduj publiczny runtime tak, aby był **WordPress‑like** i w 100% sterowany z UI:
1. Obsługa **content entries** (blog, news, produkty, itp.)
2. **Cache/SSR** z rewalidacją
3. Pełna kontrola w UI (homepage, 404, routes, preview)

Założenie: prawie wszystko w UI; tylko krytyczne env po stronie deployu/serwera.

---

## Sub-Tasks

### TASK-046-01: Site Settings Model (routes + homepage) (✅ Done — 2026-02-03)
Ustawienia strony przez `settings`:
- `site.homepageId`, `site.notFoundPageId`
- `site.contentRoutes` (mapa typu → slug/ścieżka)
- `site.previewEnabled` (toggle)
- walidacja + domyślne wartości (settingsService)

### TASK-046-02: Public Routes & Preview (✅ Done — 2026-02-03)
Rozszerz publiczny handler:
- routing dla entries (list + detail) wg `site.contentRoutes`
- `preview` dla entries (token + target type)
- spójne 404/410 stany

### TASK-046-03: Entry Rendering Templates (✅ Done — 2026-02-03)
System template dla content types (list + detail):
- resolve template przez `core/themes/resolver.ts`
- fallback na domyślne template’y, gdy theme nie dostarcza

### TASK-046-04: SSR Cache & Revalidation
Cache HTML na publicznym runtime (memory + TTL):
- cache per path + per theme profile
- rewalidacja po publish/unpublish i po zmianie theme/profile

### TASK-046-05: Admin UI — Site Settings
Nowa sekcja w panelu:
- wybór homepage/404 (select page)
- konfiguracja content routes (per content type)
- preview toggle + info o publicBaseUrl

---

## Testing Requirements

- Unit: route matcher + renderer + cache invalidation
- Integration: site settings API wiring
- UI smoke tests for Site Settings

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md` (new)
- `_docs/CMS_API.md`
- `_docs/DATA_MODEL.md` (new settings keys)
- `_docs/README.md` (docs index)
- `_docs/_CHANGELOG/<new>.md`
