# Admin Navigation (SPA)

## Summary
The admin panel uses a lightweight SPA router to avoid full page reloads between
internal screens. This reduces loading flashes and keeps cached data warm.

## Coderso IA (TASK-054)
- Sidebar now includes a single expandable group: `Coderso`.
- Coderso modules are sourced from registry: `core/admin/ui/navigation/codersoModules.ts`.
- Default (enabled) Coderso modules:
  - `Engine` -> `/admin/coderso/engine`
  - `Entries` -> `/admin/coderso/entries`
  - `Widgets` -> `/admin/coderso/widgets`
  - `Forms` -> `/admin/coderso/forms`
  - `Posts` -> `/admin/coderso/posts`
- Tiered catalog (v1-v3) is documented in `_docs/CODERSO_MODULES.md`.
- Sidebar can expose future modules through feature flags passed to
  `buildDefaultNavSections(flags)` (`CodersoFeatureFlags`).
- Group collapse state is persisted in local storage (`nextless.admin.navGroupState`).
- On mobile, selecting a Coderso child route closes the drawer automatically.

## Route Aliases (Backward Compatibility)
Legacy bookmarks are still accepted and normalized to canonical Coderso paths:
- `/admin/content-types` -> `/admin/coderso/engine`
- `/admin/content` and `/admin/entries` -> `/admin/coderso/entries`
- `/admin/widgets` -> `/admin/coderso/widgets`
- `/admin/forms` -> `/admin/coderso/forms`
- `/admin/posts` -> `/admin/coderso/posts`

Nested routes are normalized with the same prefix mapping
(e.g. `/admin/content-types/:id` -> `/admin/coderso/engine/:id`).

## What Is SPA vs Full Reload
### SPA (client-side)
- All `/admin/*` routes in the authenticated UI.
- Sidebar navigation and most internal actions use SPA navigation.
- Browser back/forward works via `popstate`.

### Full Reload (hard redirect)
- Auth/public routes: `/admin/login`, `/admin/reset`, `/admin/2fa`, `/admin/preview`.
- External URLs (http/https/mailto).
- Plugin activation that ships new bundles (requires reload to load new code).

## How To Navigate
Use `AdminLink` for internal links and `useAdminRouter()` for actions.

### AdminLink (preferred)
```tsx
import { AdminLink } from "@/ui/shared/AdminLink";

<AdminLink href="/pages" prefetch>
  Pages
</AdminLink>
```

### Programmatic navigation
```tsx
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

const { navigate } = useAdminRouter();

navigate(`/pages/${pageId}`);
```

## Prefetch
- `AdminLink` with `prefetch` triggers a background cache warmup.
- Prefetch is throttled and only uses list endpoints.
- Implementation: `core/admin/utils/adminPrefetch.ts`.

## Safety
- SPA navigation does not change widget/plugin runtime behavior.
- If a new plugin/widget bundle is installed, a hard reload is still required.
