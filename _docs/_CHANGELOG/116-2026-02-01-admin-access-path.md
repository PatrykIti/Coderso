# Admin access path and redirect

## Summary
- Added settings-driven admin path (`site.adminPath`) and optional admin-root redirect (`site.adminRedirectEnabled`).
- Updated admin UI navigation/links to respect the configured admin base path.
- Added unit coverage for admin path helpers.

## Tasks
- TASK-047

## Files touched
- `core/admin/utils/adminPaths.ts`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/settings/GeneralSettingsPage.tsx`
- `core/admin/ui/settings/AdminAccessCard.tsx`
- `core/admin/ui/settings/SettingsSidebar.tsx`
- `core/admin/ui/auth/LoginPage.tsx`
- `core/admin/ui/auth/ResetPasswordPage.tsx`
- `core/admin/ui/auth/SetPasswordPage.tsx`
- `core/admin/ui/auth/TwoFactorPage.tsx`
- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/content-types/ContentTypeList.tsx`
- `core/admin/ui/content-types/SchemaBuilderPage.tsx`
- `core/admin/ui/plugins/PluginList.tsx`
- `core/admin/ui/search/searchNavigation.ts`
- `core/admin/ui/shared/AdminThemeSwitcher.tsx`
- `core/admin/services/apiClient.ts`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/contexts/AdminBasePathContext.tsx`
- `core/server/middleware/hostPolicy.ts`
- `core/server/httpServer.ts`
- `core/server/utils/adminPath.ts`
- `core/services/settings/settingsService.ts`
- `tests/unit/admin/adminPaths.test.ts`
- `tests/unit/server/hostPolicy.test.ts`
- `tests/unit/settings/settingsService.test.ts`
- `tests/unit/ui/general-settings.test.tsx`
- `_docs/CMS_API.md`
- `_docs/SITE_RUNTIME.md`
