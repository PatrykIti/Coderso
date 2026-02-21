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
- `forms:actions:<id>`
- `forms:action-runs:<id>`
- `booking:resources:list`
- `booking:resources:<id>:schedules`
- `booking:services:list`
- `booking:services:<id>:resources`
- `booking:blackouts:list`
- `booking:reservations:list`
- `popups:list`
- `popups:detail:<id>`
- `reviews:list`
- `reviews:detail:<id>`
- `solutionKits:list`
- `solutionKits:detail:<id>`
- `solutionKits:runs:list:<kitId|all>`
- `solutionKits:runs:detail:<runId>`
- `listings:queries:list`
- `listings:queries:detail:<id>`
- `listings:templates:list`
- `listings:templates:detail:<id>`
- `commerce:products:list`
- `commerce:products:detail:<id>`
- `commerce:collections:list`
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

## Diagnostics and Baselines
- Request instrumentation is available via `core/admin/utils/requestMetrics.ts` and is wired in `core/admin/services/apiClient.ts`.
- Dev debug handle:
  - `window.__NEXTLESS_ADMIN_NET_DEBUG__.events()`
  - `window.__NEXTLESS_ADMIN_NET_DEBUG__.snapshot(windowMs?)`
  - `window.__NEXTLESS_ADMIN_NET_DEBUG__.reset()`
  - `window.__NEXTLESS_ADMIN_NET_DEBUG__.setEnabled(boolean)`
- Instrumentation is enabled by default on localhost and disabled by default outside localhost.
- Baseline perf gate:
  - `tests/perf/admin-request-baseline.test.ts`
  - env budget: `CODERSO_PERF_ADMIN_REQUEST_SNAPSHOT_P95_MS` (default `25ms`).

## Global Read Dedupe (Admin Shell)
Shared in-memory read-through cache is used for high-frequency global reads to prevent duplicate calls across mounted components:
- `getUserSettings()` -> `core/admin/services/userSettingsClient.ts`
- `getAssistantStatus()` -> `core/admin/services/assistantClient.ts`
- `listAdminThemeProfiles()` -> `core/admin/services/adminThemeClient.ts`

Contract:
- Read-through cache includes TTL and in-flight request dedupe.
- Mutations invalidate relevant read-through caches (`setUserSetting`, assistant reindex, admin theme profile mutations).
- This layer complements list/detail localStorage cache and does not replace entity mutation invalidation.

## Release Gate Link
- Admin cache/SPA transition behavior is part of Coderso release gates:
  - performance suite: `tests/perf/codersoPerformanceGate.test.ts`
  - gate contract: `_docs/CODERSO_RELEASE_GATES.md`
- Transition helper budget baseline:
  - admin route transition helper p95 under `CODERSO_PERF_ADMIN_NAV_P95_MS` (default `150ms`).


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
