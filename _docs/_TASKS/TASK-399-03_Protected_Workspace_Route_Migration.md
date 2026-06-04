# TASK-399-03: Protected Workspace Route Migration
# FileName: TASK-399-03_Protected_Workspace_Route_Migration.md

**Priority:** High
**Category:** Admin UI + Route Inventory + Bundle Performance
**Estimated Effort:** Large
**Dependencies:** TASK-399-01, TASK-399-02
**Status:** Done (2026-06-04)

---

## Overview

Migrate the protected admin route inventory to the lazy route registry while
preserving route matching, aliases, permissions, and prop-passing behavior.

This leaf owns the actual route split for the authenticated admin workspace. It
should keep the public auth/bootstrap surface eager and avoid silently moving
route-level behavior into ad hoc dynamic imports.

## Source Findings

Current protected route families in `AdminApp` include:

- Dashboard
- Tools: Analytics, Audit Logs, Access Logs, Backups, Search, SEO, Redirects,
  Import / Export
- Advanced: Forms, Content Types/Engine, Entries, Custom Screens, Listings,
  Filters, Search, Booking, Reviews, Commerce, Popups, Solution Kits
- Core content: Posts, Pages, Media, Menus
- Admin governance: Users, Roles
- Themes, Widgets, Widget Templates
- Settings and Security subroutes
- Store and Plugin details

`/preview` is intentionally not in the protected inventory. It is listed in
`publicRoutes` in `AdminApp` and stays eager with the auth/public route set for
this task family.

Routes with extra props must keep those props:

- `UsersRolesPage permissions={authPermissions}`
- `PermissionsMatrixPage permissions={authPermissions}`
- `GeneralSettingsPage values/isLoading/isSaving/error/onSave`
- `AssistantSettingsPage values/isLoading/isSaving/error/onSave`

## Route Inventory Matrix

The implementation must reconcile every current `AdminApp` route against this
matrix before closure:

| Pattern | Component/export | Permission | Target |
|---|---|---|---|
| `/` | `DashboardPage` | `content:read` | Lazy |
| `/login` | `LoginPage` | Public | Eager |
| `/2fa` | `TwoFactorPage` | Public | Eager |
| `/reset` | `ResetPasswordPage` | Public | Eager |
| `/reset/confirm` | `SetPasswordPage` | Public | Eager |
| `/preview` | `PagePreview` | Public | Eager |
| `/analytics` | `AnalyticsPage` | `content:read` | Lazy |
| `/audit` | `AuditList` | `audit:read` | Lazy |
| `/access-logs` | `AccessLogsPage` | `audit:read` | Lazy |
| `/backups` | `BackupsPage` | `backups:read` | Lazy |
| `/search` | `SearchPage` | `content:read` | Lazy |
| `/seo` | `SeoManagerPage` | `content:read` | Lazy |
| `/redirects` | `RedirectsPage` | `settings:read` | Lazy |
| `/tools/import-export` | `ImportExportPage` | `settings:read` | Lazy |
| `/advanced/forms` | `FormListPage` | `forms:read` | Lazy |
| `/advanced/forms/:id/action-runs` | `FormActionLogsPage` | `forms:read` | Lazy |
| `/advanced/forms/:id` | `FormBuilderPage` | `forms:read` | Lazy |
| `/advanced/engine` | `ContentTypeList` | `content:read` | Lazy |
| `/advanced/engine/:id` | `ContentTypeEditor` | `content:read` | Lazy |
| `/advanced/engine/:id/collection` | `CollectionWorkspacePage` | `content:read` | Lazy |
| `/advanced/engine/:id/collection/detail-template/:detailPageId` | `DetailTemplateEditorPage` | `content:read` | Lazy |
| `/advanced/engine/:id/schema` | `SchemaBuilderPage` | `content:read` | Lazy |
| `/advanced/entries` | `EntryList` | `content:read` | Lazy |
| `/advanced/entries/:type/:id` | `EntryEditor` | `content:read` | Lazy |
| `/advanced/custom-screens` | `CustomScreenListPage` | `content:read` | Lazy |
| `/advanced/custom-screens/:id/entries/:entryId` | `CustomScreenEntryEditor` | `content:read` | Lazy |
| `/advanced/custom-screens/:id/entries` | `CustomScreenEntriesPage` | `content:read` | Lazy |
| `/advanced/custom-screens/:id` | `CustomScreenEditorPage` | `content:read` | Lazy |
| `/posts` | `PostsListPage` | `content:read` | Lazy |
| `/posts/:id` | `PostEditorPage` | `content:read` | Lazy |
| `/advanced/listings` | `ListingListPage` | `content:read` | Lazy |
| `/advanced/listings/:id` | `ListingEditorPage` | `content:read` | Lazy |
| `/advanced/filters` | `ListingFiltersPage` | `content:read` | Lazy |
| `/advanced/search` | `ListingSearchPage` | `content:read` | Lazy |
| `/advanced/booking` | `BookingPage` | `booking:read` | Lazy |
| `/advanced/reviews` | `ReviewsModerationPage` | `reviews:read` | Lazy |
| `/advanced/commerce` | `CommerceListPage` | `commerce:read` | Lazy |
| `/advanced/commerce/:id` | `CommerceEditorPage` | `commerce:read` | Lazy |
| `/advanced/popups` | `PopupsListPage` | `popups:read` | Lazy |
| `/advanced/popups/:id` | `PopupEditorPage` | `popups:read` | Lazy |
| `/advanced/solution-kits` | `SolutionKitsPage` | `solution-kits:read` | Lazy |
| `/pages` | `PageListPage` | `content:read` | Lazy |
| `/pages/:id` | `PageEditor` | `content:read` | Lazy |
| `/media` | `MediaLibraryPage` | `media:read` | Lazy |
| `/menus` | `MenuListPage` | `menus:read` | Lazy |
| `/menus/:id` | `MenuEditorPage` | `menus:read` | Lazy |
| `/users` | `UsersRolesPage` | `users:read` or `roles:read` | Lazy with `authPermissions` |
| `/roles` | `PermissionsMatrixPage` | `roles:read` | Lazy with `authPermissions` |
| `/themes` | `ThemesPage` | `themes:read` | Lazy |
| `/advanced/widgets` | `WidgetLibraryPage` | `widgets:read` | Lazy |
| `/advanced/widgets/templates/:id` | `WidgetTemplateEditorPage` | `widgets:read` | Lazy |
| `/settings`, `/settings/general` | `GeneralSettingsPage` | `settings:read` | Lazy with settings props |
| `/settings/site` | `SiteSettingsPage` | `settings:read` | Lazy |
| `/settings/assistant` | `AssistantSettingsPage` | `settings:read` | Lazy with settings props |
| `/settings/security` | `SecuritySettingsPage` | `settings:read` | Lazy |
| `/settings/security/ip-allowlist` | `IpAllowlistPage` | `settings:read` | Lazy |
| `/settings/security/sessions` | `SessionsPage` | `settings:read` | Lazy |
| `/settings/security/login-alerts` | `LoginAlertsPage` | `settings:read` | Lazy |
| `/settings/api-keys` | `ApiKeysPage` | `settings:read` | Lazy |
| `/settings/webhooks` | `WebhooksPage` | `settings:read` | Lazy |
| `/settings/email` | `EmailSettingsPage` | `settings:read` | Lazy |
| `/settings/storage` | `StorageSettingsPage` | `settings:read` | Lazy |
| `/settings/integrations` | `IntegrationsPage` | `settings:read` | Lazy |
| `/store` | `PluginStorePage` | `store:browse` | Lazy |
| `/store/plugins/:id` | `PluginDetailsPage` | `store:browse` | Lazy |

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/app/adminRouteComponents.tsx` | Add lazy descriptors for every protected route page. |
| `core/admin/app/AdminApp.tsx` | Replace protected static imports and route JSX with descriptors from the registry. |
| `tests/vitest/admin/adminApp.test.tsx` | Expand route samples across migrated route families. |

## Implementation Pseudocode

```tsx
import {
  DashboardRoute,
  AnalyticsRoute,
  PageEditorRoute,
  UsersRolesRoute,
  PermissionsMatrixRoute,
  GeneralSettingsRoute,
} from "./adminRouteComponents";

const routes: RouteDefinition[] = [
  {
    pattern: "/",
    permission: "content:read",
    render: () => <DashboardRoute.Component />,
  },
  {
    pattern: "/pages/:id",
    permission: "content:read",
    render: () => <PageEditorRoute.Component />,
  },
  {
    pattern: "/users",
    anyPermissions: ["users:read", "roles:read"],
    render: ({ authPermissions }) => (
      <UsersRolesRoute.Component permissions={authPermissions} />
    ),
  },
  {
    pattern: "/settings",
    permission: "settings:read",
    render: ({ settingsState, settingsSaving, saveGeneralSettings }) => (
      <GeneralSettingsRoute.Component
        values={settingsState.values}
        isLoading={settingsState.status === "loading"}
        isSaving={settingsSaving}
        error={settingsState.error}
        onSave={saveGeneralSettings}
      />
    ),
  },
];
```

Route inventory migration rule:

```text
for each route in AdminApp route table:
  if route is auth/public/bootstrap:
    keep eager
  else:
    create lazy descriptor in adminRouteComponents.tsx
    use descriptor in route render(ctx)
    preserve permission/anyPermissions exactly
    preserve props exactly
```

Data flow:

- Canonical admin path and route matching remain in `AdminApp`.
- Lazy descriptors only own component module loading.
- Pages continue to own their internal data fetching and admin shell rendering.
- Existing admin data prefetch remains separate from chunk loading unless a
  later task explicitly wires chunk preload.
- `AdminLink` / router prefetch remains data-prefetch only in this family.
  Do not add hover/focus route chunk preloading until a follow-up defines an
  RBAC-aware preload policy.

Error handling:

- Missing lazy descriptor export fails tests through `lazyNamedRoute`.
- Route inventory drift is caught by AdminApp route sample tests and the bundle
  guard from `TASK-399-04`.
- Permission-denied paths must not call the lazy descriptor `preload` or render
  `Component`.

## Security Contract

- Endpoint visibility: no endpoint changes.
- Auth model: unchanged session-based admin UI.
- RBAC: all existing `permission` and `anyPermissions` metadata must be copied
  exactly.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: unchanged.
- Anti-abuse: no new public write path.
- Secret handling: no privileged Settings payloads or assistant state should be
  moved into route registry constants or preload metadata.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx`
- Route sample assertions for at least:
  - `/admin/menus`
  - `/admin/menus/:id`
  - `/admin/advanced/engine/:id/collection`
  - `/admin/advanced/engine/:id/collection/detail-template/:detailPageId`
  - `/admin/users`
  - `/admin/roles`
  - `/admin/settings`
  - `/admin/settings/general`
  - `/admin/settings/assistant`
  - `/admin/settings/site`
  - `/admin/settings/security`
  - one Tools route such as `/admin/backups`
  - one editor-heavy route such as `/admin/pages/:id`
- Denied settings subroutes do not call their lazy loader.
- Public `/admin/preview` stays eager and is not asserted as a protected lazy
  route.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.
- Changelog entry when this leaf is closed, either standalone or through the
  parent TASK-399 closure changelog.

## Acceptance Criteria

- All protected route pages are imported through dynamic route descriptors.
- Auth/public/bootstrap routes remain eager.
- Route permissions and aliases are unchanged.
- Settings and Users/Roles prop-passing routes behave exactly as before.
- Denied route tests prove protected lazy chunks are not loaded before RBAC.
- No first-step chunk preloading is wired into `AdminLink` hover/focus behavior.
