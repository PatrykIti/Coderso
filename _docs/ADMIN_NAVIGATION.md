# Admin Navigation (SPA)

## Summary
The admin panel uses a lightweight SPA router to avoid full page reloads between
internal screens. This reduces loading flashes and keeps cached data warm.

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
