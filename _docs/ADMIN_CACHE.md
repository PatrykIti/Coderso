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
- `seo:list`
- `seo:detail:<id>`
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
- Prefetch is cache warmup only (`force: false`), never forced refetch.
- Prefetch skips the currently active route/module.
- Prefetch skips entries considered fresh (`freshMs`) and applies cooldown throttling.
- Prefetch uses a low-priority queue with max parallelism to avoid request bursts.
- Implemented via `AdminLink` + `prefetchAdminRoute`.

### Prefetch budgets
- Per-hover burst request budget is gated by:
  - `tests/perf/admin-prefetch-budget.test.ts`
  - env: `CODERSO_PERF_ADMIN_PREFETCH_BURST_MAX` (default `6`)

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
- Dev-mode strict render note:
  - admin React StrictMode is now opt-in via `VITE_ADMIN_STRICT_MODE=true`,
  - default dev behavior keeps it disabled to avoid duplicate mount fetches during request diagnostics.

## Global Read Dedupe (Admin Shell)
Shared in-memory read-through cache is used for high-frequency global reads to prevent duplicate calls across mounted components:
- `getUserSettings()` -> `core/admin/services/userSettingsClient.ts`
- `getAssistantStatus()` -> `core/admin/services/assistantClient.ts`
- `listAdminThemeProfiles()` -> `core/admin/services/adminThemeClient.ts`
- `resolveAuthBootstrap()` -> `core/admin/services/authClient.ts` (single-shot `/auth/me` bootstrap cache)

Contract:
- Read-through cache includes TTL and in-flight request dedupe.
- Mutations invalidate relevant read-through caches (`setUserSetting`, assistant reindex, admin theme profile mutations).
- This layer complements list/detail localStorage cache and does not replace entity mutation invalidation.

### Shell Lifecycle Policy
- `AdminApp` auth bootstrap:
  - resolves auth via `resolveAuthBootstrap()` without per-route `me()` loops.
  - protected/public route transitions reuse bootstrap cache instead of forcing new requests.
- `AssistantPanel` runtime:
  - lazy-loads on first panel open,
  - uses runtime snapshot cache + in-flight dedupe (`loadAssistantRuntimeStateCached`),
  - no status/user-settings read while panel stays closed.
- `AdminThemeSwitcher`:
  - reads profiles via `listAdminThemeProfilesCached()`,
  - fetches on dropdown open instead of every topbar mount.
- `theme:updated` event:
  - refresh scope is limited to admin theme token reload,
  - global settings refresh is not triggered by theme update.

## Release Gate Link
- Admin cache/SPA transition behavior is part of Coderso release gates:
  - performance suite: `tests/perf/codersoPerformanceGate.test.ts`
  - gate contract: `_docs/CODERSO_RELEASE_GATES.md`
- Transition helper budget baseline:
  - admin route transition helper p95 under `CODERSO_PERF_ADMIN_NAV_P95_MS` (default `150ms`).

## TASK-058 Closure Snapshot (2026-02-21)
- Final closure checks executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`
- Full test-suite outcome at closure:
  - `1338 pass`, `0 fail` (`143 skip` for opt-in DB scenarios).
- This snapshot is the baseline after:
  - pages/menus mount refresh loop fixes,
  - prefetch warmup throttling and active-route skip,
  - admin shell global-read minimization (`/auth/me`, assistant runtime, theme profiles).


## Cross-tab Sync
`core/admin/utils/cacheBus.ts` broadcasts cache events:
- Primary: `BroadcastChannel`.
- Fallback: `localStorage` storage event.
- Same-tab subscribers are notified directly after broadcast, so assistant
  executions and other mutations can refresh the current admin surface without
  waiting for a cross-tab storage event or full reload.

Events include:
- `key`: cache key
- `action`: `update` or `invalidate`

Consumers subscribe and revalidate when matching keys change.

## UI Behavior
### Lists
1. Render immediately from cache (if present).
2. If cache is missing, fetch in foreground (`force: false`, empty cache triggers network read).
3. If cache exists, mount does not force network refresh.
4. On explicit user action (Refresh/Save/Publish/Delete) use `force: true`.
5. On cache invalidation/update events use `force: true` in background.

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
- Assistant action execution invalidates known resource-family caches from
  validated execution results. Failed and `noop` results do not broadcast cache
  mutations. Detail keys are derived from the strict planned action or the
  sanitized execution `resourceId`, never provider text.
- Assistant execution cache event coverage:
  - `content-type.*` -> `contentTypes:list`, touched `contentTypes:detail:<id>`
  - `entry.*` -> `entries:list:<typeSlug>`, touched `entries:detail:<typeSlug>:<id>`
  - `custom-screen.*` -> `customScreens:list`, touched `customScreens:detail:<id>`
  - `page.*` -> `pages:list`, touched `pages:detail:<id>`
  - `form.*` -> `forms:list`, touched `forms:detail:<id>`
  - `form.automation.upsert` -> `forms:actions:<id>`, `forms:action-runs:<id>`
  - `listing-query.*` -> `listings:queries:list`, touched `listings:queries:detail:<id>`
  - `listing-template.*` -> `listings:templates:list`, touched `listings:templates:detail:<id>`
  - `widget-template.*` -> `widgetTemplates:list`, `widgetCatalog:list`, touched `widgetTemplates:detail:<id>`
  - `menu.item.*` -> `menus:list`, touched `menus:detail:<menuId>`
  - `seo.document.*` -> `seo:list`, touched `seo:detail:<id>`
- `media.reference.attach`, `setting.content-route.upsert`, and `site-kit.*`
  do not currently emit assistant client cache events because their safe cache
  address is either not represented in the admin cache key contract or is
  handled by the existing site-kit execution surface.

### Pages list/detail cache note

- Pages list cache (`pages:list`) is authoritative for author presentation.
- Detail and mutation payloads that do not carry resolved `author` metadata must
  not create or overwrite list summaries with authorless placeholders.
- `createPage()` and `duplicatePage()` keep detail cache warm but invalidate the
  list cache so the next list hydration comes from an authoritative list payload.
- Detail-style updates (`getPageCached`, `updatePage`, revision restore) merge
  title/slug/status fields into an existing list row without dropping the
  current author identity.

## Extending The Cache
When adding a new resource:
1. Add cache keys + TTLs to `core/admin/services/cachePolicy.ts`.
2. Use `readLocalCache` / `writeLocalCache` / `clearLocalCache`.
3. Add cached `list*Cached` / `get*Cached` wrappers in the service client.
4. Broadcast cache events after mutations.
5. In UI, hydrate from cache then revalidate in background.

## Pages and Menus Lifecycle Policy
- `PageListPage` mount policy:
  - cache present -> `{ force: false, background: true }`
  - cache missing -> `{ force: true, background: false }`
- `MenuListPage` mount policy:
  - cache present -> `{ force: false, background: true }`
  - cache missing -> `{ force: true, background: false }`
- `MenuEditorPage` mount policy:
  - cache present -> `{ force: false, background: true, reloadActive: false }`
  - cache missing -> `{ force: false, background: false, reloadActive: false }`
- Menu editor detail reload:
  - reloads the route-selected `menus:detail:<id>` entry on explicit refresh,
    save completion, or cacheBus detail event,
  - does not switch to another menu because `menus:list` changed elsewhere,
  - does not auto-force on every route entry when detail cache exists.


## Route Map
See `_docs/ADMIN_CACHE_MAP.md` for the route -> file -> cached API map.

## Safety Notes
- Cache is per-browser (localStorage) and scoped to the user session context.
- Do not store secrets or long-lived tokens in cache entries.
