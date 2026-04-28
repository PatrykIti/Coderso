# Admin/public base URLs

## Summary
- Added `site.adminBaseUrl` and `site.publicBaseUrl` settings with validation.
- Enforced host-based routing (admin/public separation) in the HTTP server.
- Added admin UI fields for base URLs in General Settings.
- Preview URLs now prefer `site.publicBaseUrl` before falling back to `PUBLIC_BASE_URL`.

## Files touched
- `core/services/settings/settingsService.ts`
- `core/server/middleware/hostPolicy.ts`
- `core/server/httpServer.ts`
- `core/server/utils/baseUrl.ts`
- `core/server/routes/pageRoutes.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/admin/ui/settings/BaseUrlCard.tsx`
- `core/admin/ui/settings/GeneralSettingsPage.tsx`
- `core/admin/app/AdminApp.tsx`
- `tests/unit/server/hostPolicy.test.ts`
- `tests/unit/settings/settingsService.test.ts`
- `tests/unit/ui/general-settings.test.tsx`
- `_docs/CMS_API.md`
- `_docs/SITE_RUNTIME.md`
