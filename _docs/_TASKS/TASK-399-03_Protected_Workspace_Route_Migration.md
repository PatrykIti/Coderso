# TASK-399-03: Protected Workspace Route Migration
# FileName: TASK-399-03_Protected_Workspace_Route_Migration.md

**Priority:** High
**Category:** Admin UI + Route Inventory + Bundle Performance
**Estimated Effort:** Large
**Dependencies:** TASK-399-01, TASK-399-02
**Status:** To Do

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
- Core content: Posts, Pages, Preview, Media, Menus
- Admin governance: Users, Roles
- Themes, Widgets, Widget Templates
- Settings and Security subroutes
- Store and Plugin details

Routes with extra props must keep those props:

- `UsersRolesPage permissions={authPermissions}`
- `PermissionsMatrixPage permissions={authPermissions}`
- `GeneralSettingsPage values/isLoading/isSaving/error/onSave`
- `AssistantSettingsPage values/isLoading/isSaving/error/onSave`

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
  - one Tools route such as `/admin/backups`
  - one editor-heavy route such as `/admin/pages/:id`
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
