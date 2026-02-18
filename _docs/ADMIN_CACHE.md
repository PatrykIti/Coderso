# Admin Cache Layer

## Overview
The admin UI uses a shared cache layer to keep lists and editors fast (WordPress-like) while staying consistent across tabs. Data is cached in `localStorage`, revalidated in the background, and synchronized via a cache event bus.

## Goals
- Instant UI hydration when cached data exists.
- Background revalidation to keep data fresh.
- Cross-tab updates (edits in one tab refresh others).
- Safe editing: never overwrite unsaved changes.
- Avoid caching sensitive/auth-only data beyond the current browser context.

## Storage Model
### Cache envelope
Cached values are stored as JSON with a timestamp:
- `value`: the cached payload
- `savedAt`: epoch milliseconds

### TTL policy
Defaults live in `core/admin/services/cachePolicy.ts`:
- `cacheTtlMs.list`: 5 minutes
- `cacheTtlMs.detail`: 5 minutes

### Cache keys
Defined in `core/admin/services/cachePolicy.ts`:
- `pages:list`
- `pages:detail:<id>`
- `entries:list:<typeSlug>`
- `entries:detail:<typeSlug>:<id>`
- `contentTypes:list`
- `contentTypes:detail:<id>`
- `menus:list`
- `menus:detail:<id>`
- `forms:list`
- `forms:detail:<id>`
- `listings:queries:list`
- `listings:queries:detail:<id>`
- `listings:templates:list`
- `listings:templates:detail:<id>`
- `widgetCatalog:list`
- `widgetTemplateCategories:list`
- `widgetTemplates:list`
- `widgetTemplates:detail:<id>`
- `media:list`
- `adminThemeTemplates:list`
- `adminThemeProfiles:list`

## Prefetch
- Sidebar navigation can trigger optional prefetch on hover/focus.
- Prefetch only hits cached list endpoints (safe, no editor state).
- Prefetch uses cache TTL + throttling to avoid repeated requests.
- Implemented via `AdminLink` + `prefetchAdminRoute`.


## Cross-tab Sync
`core/admin/utils/cacheBus.ts` broadcasts cache events:
- Primary: `BroadcastChannel`.
- Fallback: `localStorage` storage event.

Events include:
- `key`: cache key
- `action`: `update` or `invalidate`

Consumers subscribe and revalidate when matching keys change.

## UI Behavior
### Lists
1. Render immediately from cache (if present).
2. Revalidate in background (`force: true`).
3. On cache event, refresh if no local action is in progress.

### Editors
1. Hydrate from cache.
2. Revalidate in background.
3. If a remote update arrives and there are unsaved changes:
   - Do not overwrite.
   - Show a “remote update” hint.
   - Allow manual refresh to apply the latest data.

## Invalidation Rules
Clients update caches and broadcast events on:
- Create / update / delete / publish / unpublish.
- Server responses are treated as source of truth for cache updates.

## Extending The Cache
When adding a new resource:
1. Add cache keys + TTLs to `core/admin/services/cachePolicy.ts`.
2. Use `readLocalCache` / `writeLocalCache` / `clearLocalCache`.
3. Add cached `list*Cached` / `get*Cached` wrappers in the service client.
4. Broadcast cache events after mutations.
5. In UI, hydrate from cache then revalidate in background.


## Route Map
See `_docs/ADMIN_CACHE_MAP.md` for the route -> file -> cached API map.

## Safety Notes
- Cache is per-browser (localStorage) and scoped to the user session context.
- Do not store secrets or long-lived tokens in cache entries.
