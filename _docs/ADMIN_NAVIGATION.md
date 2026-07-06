# Admin Navigation (SPA)

## Summary
The admin panel uses a lightweight SPA router to avoid full page reloads between
internal screens. This reduces loading flashes and keeps cached data warm.

## Advanced IA (TASK-226)
- Sidebar includes a single expandable technical group: `Advanced`.
- Advanced modules are sourced from registry: `core/admin/ui/navigation/advancedModules.ts`.
- Active custom screens can also expose direct shortcuts **after** the `Advanced` group:
  - source: `custom_screens`
  - conditions: `status=active` and `showInSidebar=true`
  - target route: `/admin/advanced/custom-screens/:screenId/entries`
  - label: `sidebarLabel ?? name`
  - applies to **every** screen mode (collection-only, dashboard, editor) — there is
    **no** editor-capability requirement. A `draft` + pinned (`showInSidebar=true`)
    screen is a valid "will publish on activation" state: it is hidden from the
    sidebar while Draft and appears automatically on activation with **no manual
    reload** (the `custom_screens` list cache-event invalidation on
    `cacheKeys.customScreensList` re-derives the nav shortcuts).
  - Historical note (TASK-515): a previously-implied `"requires_editor_setup"`
    editor-capability gate was **removed** as an intentional simplification. The
    code (`sidebarConfig.ts` + `customScreenListModel.ts`) had over-filtered pinned
    non-editor screens against this already-documented contract, silently dropping
    Active + pinned dashboard/collection-only screens from the sidebar; the fix
    restores the contract above.
- Default (enabled) Advanced modules:
  - `Engine` -> `/admin/advanced/engine`
  - `Entries` -> `/admin/advanced/entries`
  - `Forms` -> `/admin/advanced/forms`
  - `Posts` -> `/admin/posts`
  - editor route: `/admin/posts/:id` (default `blocks` mode),
  - emergency fallback: `?editor=classic` (legacy entry editor for posts),
  - global setting key: `posts.editor.mode` (`blocks` | `classic`).
- Tiered catalog (v1-v3) is documented in `_docs/CODERSO_MODULES.md`.
- Sidebar can expose future modules through feature flags passed to
  `buildDefaultNavSections(flags)` (`AdvancedFeatureFlags`).
- Hidden compatibility routes can remain registered after their default nav
  entry is removed. TASK-461 hides `Widgets` from the Advanced sidebar while
  keeping `/admin/advanced/widgets` reachable for direct compatibility.
- When an active `Solution Kit` is selected in admin UI, `AdminShell` may derive
  `AdvancedFeatureFlags` from the kit and narrow only the `Advanced` group.
- No active solution kit means the default full `Advanced` group remains visible.
- Group collapse state is persisted in local storage (`coderso.admin.navGroupState`)
  with legacy read fallback from `nextless.admin.navGroupState`.
- On mobile, selecting an Advanced child route closes the drawer automatically.

## Route Aliases (Backward Compatibility)
Legacy bookmarks are still accepted and normalized to canonical Advanced paths:
- `/admin/content-types` -> `/admin/advanced/engine`
- `/admin/content` and `/admin/entries` -> `/admin/advanced/entries`
- `/admin/widgets` -> `/admin/advanced/widgets`
- `/admin/forms` -> `/admin/advanced/forms`
- `/admin/coderso/*` -> `/admin/advanced/*`
- `/admin/coderso/posts*` -> `/admin/posts*`

Nested routes are normalized with the same prefix mapping
(e.g. `/admin/content-types/:id` -> `/admin/advanced/engine/:id`).

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
