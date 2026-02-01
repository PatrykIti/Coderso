# TASK-044: Public Pages Rendering and Preview
# FileName: TASK-044_Public_Pages_Rendering.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002 (Pages & preview), TASK-010 (Page builder UI), TASK-043 (entry metadata)  
**Status:** ✅ Done (2026-02-01)

## Overview
Dodaj publiczny frontend do renderowania opublikowanych stron oraz podglądu draftów (preview token). Umożliwia testowanie stron na żywo poza `/admin`.

## Sub-Tasks
1. **Public renderer**
   - Utwórz `core/site/renderPublicPage.tsx` z SSR HTML (renderToString) i obsługą bloków widgetów.
   - Renderuj listę bloków przez `WidgetRenderer`.
2. **Runtime widget registry**
   - Utwórz `core/widgets/runtime.tsx` z rejestracją core widgets (noop editors).
   - Zapewnij, że registry jest zainicjalizowane przed renderem.
3. **Public route handler**
   - Dodaj `core/server/publicSite.tsx`:
     - `GET /preview?type=page&token=...` → render draftu.
     - `GET /` i `GET /:slug` → render published page.
     - Zwróć `404` dla nieopublikowanych stron.
   - Użyj `normalizePath` dla slugów.
4. **Server wiring**
   - W `core/server/httpServer.ts` podłącz `handlePublicRequest` dla ścieżek spoza `/admin` i `/media`.
5. **Docs + Changelog**
   - Zaktualizuj `_docs/CMS_API.md` (public routes).
   - Dodaj wpis do `_docs/_CHANGELOG/`.

## Testing Requirements
- Unit: `tests/unit/site/publicRenderer.test.tsx` (tytuł + preview banner).
- Lint/Types: `bun --cwd core lint` + `bun --cwd core lint:types`.

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/_CHANGELOG/114-2026-02-01-public-pages-preview.md`

## Notes
- CSS ładowany z `dist/client/manifest.json` (admin build) — zapewnia Tailwind dla widgetów.
- Preview token walidowany przez `validatePreviewToken`.
