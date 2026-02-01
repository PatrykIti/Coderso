# Public pages rendering and preview

## Summary
- Added public renderer for published pages (`/` and `/:slug`).
- Added preview rendering for pages via `/preview`.
- Wired server to serve public pages outside `/admin`.
- Preview URLs now default to `/preview` when PUBLIC_BASE_URL is unset.

## Files touched
- `core/server/httpServer.ts`
- `core/server/publicSite.tsx`
- `core/widgets/runtime.tsx`
- `core/site/renderPublicPage.tsx`
- `tests/unit/site/publicRenderer.test.tsx`
- `_docs/CMS_API.md`
