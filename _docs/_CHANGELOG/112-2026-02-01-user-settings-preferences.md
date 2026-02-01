# User settings preferences

## Summary
- Added per-user settings storage (`user_settings`) with defaults.
- Exposed `/user-settings` API endpoints for authenticated users.
- Persisted “Open in editor after create” preference for Pages.

## Files touched
- `core/db/schema.ts`
- `core/db/migrations/0027_young_marvel.sql`
- `core/db/migrations/meta/0027_snapshot.json`
- `core/db/migrations/meta/_journal.json`
- `core/services/settings/userSettingsService.ts`
- `core/server/routes/userSettingsRoutes.ts`
- `core/server/routes/index.ts`
- `core/server/validation/settingsSchemas.ts`
- `core/admin/services/userSettingsClient.ts`
- `core/admin/ui/pages/PageCreateDrawer.tsx`
- `core/admin/ui/pages/PageListPage.tsx`
- `tests/unit/settings/userSettingsService.test.ts`
- `tests/integration/routes/userSettings.test.ts`
- `tests/unit/ui/drawers.test.tsx`
- `_docs/CMS_API.md`
- `_docs/DATA_MODEL.md`
