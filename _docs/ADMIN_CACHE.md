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

List clients that keep module-level in-memory rows use
`createMemoryBackedLocalCache` from `core/admin/utils/storageCache.ts`. The TTL
applies to both the storage envelope and the in-memory envelope. Expired memory
is cleared before storage/network fallback, so a stale module variable cannot
keep serving rows after `localStorage` expired or was patched by another cache
owner.

### Cache keys
Defined in `core/admin/services/cachePolicy.ts`:
- `pages:list`
- `pages:detail:<id>`
- `entries:list:all`
- `entries:list:<typeSlug>`
- `entries:detail:<typeSlug>:<id>`
- `customScreens:list`
- `customScreens:detail:<id>`
- `customScreens:entryOverrides:<bounded-screen-id>:<bounded-entry-id>`
- `contentTypes:list`
- `contentTypes:detail:<id>`
- `contentTypes:collectionWorkspace:<contentTypeId>`
- `detailPages:list`
- `detailPages:list:contentType:<contentTypeId>`
- `detailPages:detail:<id>`
- `menus:list`
- `menus:detail:<id>`
- `seo:list`
- `seo:detail:<id>`
- `search:recent`
- `search:results:<queryKey>`
- `analytics:overview:<rangeDays>`
- `analytics:topContent:<rangeDays>:<limit>:<type>`
- `analytics:traffic:overview:<rangeDays>`
- `analytics:traffic:topPages:<rangeDays>:<limit>`
- `dashboard:layout`
- `dashboard:widgetData`
- `backups:list:<page>:<limit>:<queryKey>`
- `backups:schedule`
- `tools:import:history`
- `redirects:list`
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
- `pageTemplates:list`
- `pageTemplates:detail:<id>`
- `media:list`
- `media:folders`
- `adminThemeTemplates:list`
- `adminThemeProfiles:list`
- `settings:redacted`

Page detail cache payloads use the Pages v2 document contract:
`currentData`/`publishedData` are `schemaVersion: 2` documents with
`sections[]`; the old Page `blocks[]` shape is rejected for fresh writes and
legacy stored rows are normalized before admin caching.

## Prefetch
- Sidebar navigation can trigger optional prefetch on hover/focus.
- Prefetch only hits cached list endpoints (safe, no editor state).
- Prefetch is cache warmup only (`force: false`), never forced refetch.
- Prefetch skips the currently active route/module.
- Prefetch skips entries considered fresh (`freshMs`) and applies cooldown throttling.
- Prefetch uses a low-priority queue with max parallelism to avoid request bursts.
- Implemented via `AdminLink` + `prefetchAdminRoute`.
- `/advanced/listings` prefetch warms both Listings list caches with
  `{ force: false }`: saved queries and templates. The list shell hydrates both
  caches immediately, revalidates in the background when cache exists, and uses
  a foreground load only when no cache is present.
- `/advanced/commerce` prefetch warms both Commerce list caches with
  `{ force: false }`: products and collections. The Commerce list shell
  hydrates both caches immediately, refreshes product/collection cache-bus
  events in the background, and uses foreground loading only when a required
  cache is missing.
- `/advanced/engine/:contentTypeId/collection` prefetch uses a predicate
  matcher ahead of the generic `/advanced/engine` prefix entry. It warms
  `contentTypes:list` and `contentTypes:collectionWorkspace:<contentTypeId>`
  with `{ force: false }`, so the workspace shell hydrates from the current
  Engine cache family without a parallel `collections:*` namespace.
- Tools route prefetch warms the same cached resources used by the page shells:
  `/admin/search` warms `search:recent`, `/admin/seo` warms `seo:list`,
  `/admin/analytics` warms the default overview, Top Content, and real
  traffic-overview caches,
  `/admin/backups` warms the first backup page plus schedule cache,
  `/admin/tools/import-export` hydrates the local import history cache, and
  `/admin/redirects` warms `redirects:list`.
- `/settings` prefetch warms only `settings:redacted` with `{ force: false }`.
  `/settings/site` additionally warms `pages:list` and `contentTypes:list` for
  selectors, also with `{ force: false }`. The Site shell pickers moved to the
  Menus-surface `SiteShellDialog` (TASK-458-01), which loads `menus:list` and
  `pageTemplates:list` lazily on dialog open instead of via prefetch.

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
- The Custom Screen entry preference deliberately uses isolated
  `GET/PATCH /user-settings/customScreens.entry.preferences` calls and does not
  read from or merge into this aggregate `getUserSettings()` cache. Its
  user-keyed coordinator is in-memory only; no Screen preference is stored in
  `localStorage`.

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
- Permission-gated shell reads:
  - `AdminApp` only calls `getSettingsCached()` when the current permission
    snapshot has `settings:read`; cache hits hydrate from `settings:redacted`
    and then revalidate through `/settings`.
  - `AdminApp` only refreshes admin theme token caches when the snapshot has
    `themes:read`.
  - `AdminShell` only hydrates/revalidates custom screen shortcuts with
    `content:read` and solution-kit navigation context with
    `solution-kits:read`.
  - Missing permissions clear route-local shell state instead of issuing
    avoidable 403-producing reads.

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
- During the compatibility window, each publication uses both the canonical
  `coderso.admin.cache` transport and the legacy `nextless.admin.cache`
  transport (or both matching storage keys). A subscription correlates the
  canonical/legacy copies by `sourceId`, `ts`, `key`, and `action`, so one
  logical remote publication is delivered exactly once while repeated events
  observed through only one transport remain distinct. Correlation state is
  bounded and scoped to the subscription.
- Subscribers receive an explicit `local` or `remote` origin. A same-context
  publication may also carry a symbol operation token so an editor can
  recognize its own mutation event. That token is process-local: neither the
  origin nor the token joins the wire payload, `BroadcastChannel`, or
  `localStorage`, and remote subscribers always receive no token.
- Consumers must treat broadcasts as hints, not truth: the Page Editor
  rehydrates from `pages:detail:<id>` events only when the cached record is
  strictly newer (`updatedAt`) than the loaded page (TASK-449-02). Stale,
  same-timestamp, or unparsable records are ignored so a replayed/poisoned
  cache event can never replace newer live editor content; the dirty-state
  guard is unchanged.
- Dashboard layout saves update `dashboard:layout` and invalidate
  `dashboard:widgetData`; reset does the same. The builder ignores same-draft
  remote hints while dirty/saving and asks for explicit reload instead of
  overwriting unsaved panel changes. Draft widget preview POST payloads are not
  stored in localStorage.
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
5. On cache update events, hydrate from the patched cache when available.
6. On true invalidation or explicit refresh, use `force: true` in background.

### Editors
1. Hydrate from cache when a detail cache exists.
2. Treat cached detail as provisional on mount.
3. Revalidate in background.
4. If a remote update arrives and there are unsaved changes:
   - Do not overwrite.
   - Show a “remote update” hint.
   - Allow manual refresh to apply the latest data.

### Page Editor Detail Mounts
The shared Page Editor v2 host contract verifies detail cache on every mounted
resource (TASK-454):

- Pages and Page Templates may render `pages:detail:<id>` or
  `pageTemplates:detail:<id>` immediately, then run one forced detail read with
  `{ force: true }`.
- Timestamp-authoritative hosts apply the forced detail only when the editor is
  clean and the server `updatedAt` is strictly newer than the loaded detail.
  Same, older, or unparsable timestamps fail closed.
- Menu Design uses an explicit clean forced-replace mode because its editor
  adapter does not yet expose a reliable menu `updatedAt`; replacement is still
  blocked while the editor is dirty.
- Forced read failures keep the current editor view and surface bounded inline
  copy instead of blanking the document.
- Page Editor dirty state and pending recoverable autosaves register the shared
  admin dirty-navigation guard. Admin SPA navigation, popstate, and hard
  browser navigation require confirmation while blocked. Confirming navigation
  discards only local editor state; it does not delete server autosave
  revisions.
- Pages check existing autosave revisions after the fresh detail baseline is
  known. A newer autosave revision shows a recovery prompt with restore,
  discard, and keep-current actions; recovery uses the existing internal
  revision routes and does not silently promote autosave data into
  `currentData`.

### Settings
Settings uses a dedicated redacted cache because raw settings payloads can
contain credentials or security-sensitive material.

- Cache key: `settings:redacted`.
- TTL: `cacheTtlMs.detail`.
- Owner: `core/admin/services/settingsCache.ts`.
- Cached wrappers:
  - `getSettingsCached()` / `getCachedSettings()` for safe general/runtime/
    assistant values.
  - `getSiteSettingsCached()` / `getCachedSiteSettings()` for Site settings.
- Stored payload is schema-versioned and allowlisted:
  - general site name/locale/public base URL,
  - runtime auth/session TTL and setup completion flags,
  - assistant non-secret configuration, with token-limit field names stored as
    `llmInputLimit` / `llmOutputLimit`,
  - Site routing/cache values needed by the Site Settings page,
  - boolean-only configured flags for bot protection and password pepper.
- The cache validator rejects unknown keys and keys matching
  `password`, `secret`, `token`, `accessKey`, `connectionString`, or `apiKey`.
- Raw storage, email, integration, webhook, API-key, bot-protection secret, and
  provider credential payloads are not cached in browser storage.
- `updateSettings()` and `updateSiteSettings()` prime `settings:redacted` from
  the server response and broadcast `settings:redacted` `update`.
- `updateSecuritySettings()` only patches boolean configured flags when a safe
  cache entry exists; otherwise it broadcasts `invalidate` and clears the
  redacted settings cache.
- Site Settings hydrates from `settings:redacted`, `pages:list`, and
  `contentTypes:list`, revalidates Settings in the background when cache
  exists, and no longer force-refetches selector lists on every mount when
  those selector caches are fresh. The Site shell pickers (TASK-455) moved to
  the Menus-surface `SiteShellDialog` (TASK-458-01): the dialog hydrates from
  `settings:redacted`, `menus:list`, and `pageTemplates:list` lazily on open,
  revalidates Settings in the background, and saves through a scoped partial
  `updateSiteSettings()` PATCH carrying exactly the two shell keys.
- Site shell reference keys (`site.navigationMenuId`, `site.footerTemplateId`)
  are part of the redacted Site settings cache (nullable id strings only; no
  secrets). Their server-side write path has an additional invalidation
  trigger: because public page HTML embeds the rendered shell, any settings
  write or delete touching either key clears the whole server-side public site
  cache (`clearSiteCache()` in `core/services/settings/settingsService.ts`) so
  the change propagates on the next render instead of waiting out the TTL.
  This is the Bun runtime LRU (`core/site/cache/siteCache.ts`), not a browser
  cache.
- `settings:redacted` cache-bus updates hydrate from storage first, so same-tab
  and cross-tab mutations see the patched cache. Dirty Settings forms ignore
  background cache updates to avoid draft overwrites.

## Invalidation Rules
Clients update caches and broadcast events on:
- Create / update / delete / publish / unpublish.
- Content type create, duplicate, save draft, publish, and delete mutate
  `contentTypes:list` and the touched `contentTypes:detail:<id>` key. Delete
  invalidates list/detail; duplicate inserts the new draft into the cached list.
- Content type update/delete invalidates
  `contentTypes:collectionWorkspace:<contentTypeId>` because the workspace
  summary projects content-type metadata and canonical links from existing owner
  seams. The workspace page owns route-local pending/refresh UX for those cache
  events.
- Server responses are treated as source of truth for cache updates.
- Assistant action execution invalidates known resource-family caches from
  validated execution results. Failed and `noop` results do not broadcast cache
  mutations. Detail keys are derived from the strict planned action or the
  sanitized execution `resourceId`, never provider text.
- Assistant execution cache event coverage:
  - `content-type.upsert`, `content-type.field.add`, `content-type.delete` -> `contentTypes:list`, touched `contentTypes:detail:<id>`
  - `entry.*` -> `entries:list:all`, `entries:list:<typeSlug>`, touched `entries:detail:<typeSlug>:<id>`
  - `custom-screen.*` -> `customScreens:list`, touched `customScreens:detail:<id>` through the lightweight `customScreensCache` helpers; assistant browser code must not import the full Custom Screens client only to invalidate caches
  - `page.*` -> `pages:list`, touched `pages:detail:<id>`
  - `detail-page.upsert` -> `detailPages:list`, `detailPages:list:contentType:<contentTypeId>`, touched `detailPages:detail:<id>`
  - `form.*` -> `forms:list`, touched `forms:detail:<id>`
  - `form.automation.upsert` -> `forms:actions:<id>`, `forms:action-runs:<id>`
  - `listing-query.*` -> `listings:queries:list`, touched `listings:queries:detail:<id>`
  - `listing-template.*` -> `listings:templates:list`, touched `listings:templates:detail:<id>`
  - `menu.item.*` -> `menus:list`, touched `menus:detail:<menuId>`
  - `seo.document.*` -> `seo:list`, touched `seo:detail:<id>`
- `media.reference.attach`, `setting.content-route.upsert`, and `site-kit.*`
  do not currently emit assistant client cache events because their safe cache
  address is either not represented in the admin cache key contract or is
  handled by the existing site-kit execution surface.
- Tools cache event coverage:
  - `seo.document.*` writes `seo:list` and touched `seo:detail:<id>`.
  - Search recent/results caches are browser-local read caches; explicit search
    calls patch the relevant result key and recent-search list.
  - Analytics overview and Top Content caches are range-scoped read caches and
    are refreshed explicitly by range changes or route prefetch. The real
    traffic caches (`analytics:traffic:overview:<rangeDays>`,
    `analytics:traffic:topPages:<rangeDays>:<limit>`) follow the same
    range-scoped, read-only pattern; ingestion never invalidates them.
  - Backups create/delete/restore and schedule updates patch or selectively
    invalidate `backups:list:<page>:<limit>:<queryKey>` and
    `backups:schedule`. Create patches first-page matching caches and
    invalidates later pages where pagination can shift. Delete patches caches
    only when the visible page can stay correct; otherwise it invalidates the
    affected query/page cache so the next read refetches. Browser cache stores
    local backup artifacts with `artifactPath: "local"` only; raw filesystem
    paths and backup JSON content are never persisted in cache.
  - Import / Export caches only session-local Recent Imports in
    `tools:import:history`; downloaded export bundle content is not cached.
    Successful imports invalidate the imported resource families such as menus,
    admin theme templates/profiles, and redirects.
  - Redirect create/update/delete patches `redirects:list` and broadcasts an
    update so other tabs refresh public-routing-affecting rows promptly.

### Commerce collections manager cache note (TASK-488)
The collections manager (`CommerceCollectionsPage.tsx`) is a cached-resource
admin UI over the existing `commerce:collections:list` family:
- Mount reads `listCommerceCollectionsCached({ force: true })` and hydrates the
  list from the patched memory/local cache.
- `createCommerceCollection` / `updateCommerceCollection` patch the local
  `commerce:collections:list` cache (`upsertCollection`) and broadcast an
  `update` cache-bus event; `deleteCommerceCollection` removes the row
  (`removeCollection`) and broadcasts an `invalidate` event. The page re-reads
  with `{ force: true }` after every mutation, so the shared list stays the
  source of truth for other tabs and the Commerce list shell.

### Page templates cache note (TASK-420-03)

- Page Templates are owned by `core/admin/services/pageTemplatesClient.ts`
  with keys `pageTemplates:list` and `pageTemplates:detail:<id>` (default
  list/detail TTLs).
- Create/update/duplicate broadcast `{ key: pageTemplates:list, action:
  "update" }` plus the touched `pageTemplates:detail:<id>`; delete broadcasts
  `invalidate` for the list and the detail key.
- The list page (`/advanced/page-templates`) hydrates from cache, revalidates
  in the background, and subscribes to `pageTemplates:list` cache-bus events.
  TASK-460 moves the visible entry point to the Pages list header while keeping
  this technical route and cache ownership unchanged.
- The editor (`/advanced/page-templates/:id`) is the shared Page Editor v2
  surface bound through the editor host: it hydrates from
  `pageTemplates:detail:<id>`, revalidates via cache-bus events, and keeps
  dirty-state protection (background revalidation never overwrites unsaved
  edits).
- Route prefetch warms `pageTemplates:list` with `{ force: false }` only.
- Detail-driven merges (`getPageTemplateCached`, create/update/duplicate
  responses) update `pageTemplates:list` only when a full list cache already
  exists. They never ESTABLISH the list cache: a single-item partial written
  while the full list was missing/expired would look authoritative and hide
  published templates in pickers (client-readiness FIX 3). With no cached
  list, only `pageTemplates:detail:<id>` is written and the next list call
  fetches the complete set.
- Template documents contain no secrets; nothing secret-bearing enters
  browser cache/localStorage/debug payloads.
- Retired with the widget-template surface: `widgetTemplates:list`,
  `widgetTemplates:detail:<id>`, `widgetTemplateCategories:list`, their cached
  clients, and the `/advanced/widgets/templates/:id` prefetch/route entries.

### Retired widget-library compatibility cache note

- The hidden support-only compatibility catalog state is owned by
  `core/admin/ui/widgets/WidgetLibraryPage.tsx` and is backed by
  `widgetCatalog:list` and `pages:list` (the catalog is core-widget-only after
  the Page Templates rewrite).
- This cache seam must not be reused to add a Page/Form/Menu/Post/Screen
  authoring flow. Active editors cache their own section/block documents;
  configurable Dashboard widgets use the Dashboard cache family.
- The page hydrates catalog and pages from `getCachedWidgetCatalog()` and
  `getCachedPages()` on first render, then revalidates in the background when a
  cache entry exists.
- Cache-bus events for `widgetCatalog:list` and `pages:list` refresh the list
  model in the background. The section dropdown, table/grid mode, and selected
  row ids remain shell-owned UI state and are not persisted into browser cache.

### Media cache note

- Media list cache (`media:list`) is owned by
  `core/admin/services/mediaClient.ts`.
- `listMediaCached()` de-duplicates only the exact active non-forced request.
  Success publishes only while that request still owns the pending slot, and
  `finally` clears only that same request. Rejection therefore remains
  retryable, while a forced/newer read or a successful media mutation cannot be
  cleared or overwritten by an older completion.
- Media folder list cache (`media:folders`) is owned by
  `core/admin/services/mediaFoldersClient.ts`. Network rows are projected to
  exactly `id`, `name`, `slug`, `parentId`, `orderIndex`, and `createdAt` before
  return or persistence; backend-only `createdBy` and every unknown key are
  stripped without invoking unknown accessors.
- Persisted folder rows must already contain exactly those six validated keys.
  A malformed envelope is evicted and falls through to the normal network path.
  A malformed successful response rejects with the fixed, payload-free
  `media_folders_response_invalid` client error and writes no cache.
- `listMediaFoldersCached()` shares the current non-forced request. Resolve and
  reject clear only that exact promise in `finally`; forced reads and explicit
  clears advance a request generation. An older completion may still resolve to
  its original caller, but it cannot prime cache rows or clear a newer request.
- Folder create/update/reorder/delete clear `media:folders` and broadcast its
  `update` event only after the API mutation succeeds. A rejected mutation
  preserves the original error and cache and emits no event. Successful delete
  additionally broadcasts `media:list`, because deleting a folder un-files its
  assets.
- `MediaLibraryPage` uses the folder cache on mount, but every same-tab or
  cross-tab `media:folders` event performs a forced server GET rather than
  trusting storage-first fallback. An event overlapping manual load Retry is
  queued and forced after Retry settles. Load generation and operation identity
  guards preserve the last good tree and prevent stale/unmounted completions
  from replacing newer visible state; a same-tab event emitted before its
  successful mutation call returns is associated with that mutation so a
  reconciliation failure is surfaced separately instead of replaying the write.
- `MediaLibraryPage` hydrates from `getCachedMedia()` on first render. If
  cache exists, route entry uses a background cached read; if cache is missing,
  it performs the foreground list load.
- `MediaPicker` resolves selected media and opened browse states from
  `getCachedMedia()` / `listMediaCached({ force: false })` before network
  fallback. Closed pickers with no selection stay idle.
- `getCachedMediaForEvent()` reads storage first, then fresh memory, so same-tab
  `update` events can apply the row set that was just patched by the mutation
  owner without a redundant full `GET /media`.
- `uploadMedia()` upserts the authoritative uploaded media row into the list
  cache and broadcasts `update`.
- `updateMedia()`, `recoverMediaDimensions()`, and `replaceMedia()` upsert the
  returned media record into the list cache and broadcast `update`.
- `deleteMedia()` removes the record and broadcasts `update`.
- Full-list reload is still allowed for missing/expired cache, explicit refresh,
  or true invalidation.
- Usage lookups (`GET /media/:id/usage`) are read-only, bounded API calls and
  are not stored in browser cache.

### Pages list/detail cache note

- Pages list cache (`pages:list`) is authoritative for author presentation.
- Detail and mutation payloads that do not carry resolved `author` metadata must
  not create or overwrite list summaries with authorless placeholders.
- `createPage()` and `duplicatePage()` keep detail cache warm but invalidate the
  list cache so the next list hydration comes from an authoritative list payload.
- Detail-style updates (`getPageCached`, `updatePage`, revision restore) merge
  title/slug/status fields into an existing list row without dropping the
  current author identity.

### Detail Pages list/detail cache note

- Detail-page caches are owned by `core/admin/services/detailPagesClient.ts`.
- `detailPages:list` covers unfiltered internal reads; filtered workspace/editor
  reads use `detailPages:list:contentType:<contentTypeId>` so one content type's
  template list never hydrates another content type's workspace.
- `detailPages:detail:<id>` stores the normalized detail-page record returned by
  list/detail/mutation responses.
- The manual detail-template editor hydrates `detailPages:detail:<id>` first,
  refreshes it with `getDetailPageCached(id, { force: true })`, and reuses
  `entries:list:<contentTypeSlug>` list caching for the bounded preview sample
  picker.
- Manual create/update/delete, publish/unpublish, and revision restore flows
  update or invalidate the unfiltered list key, the active
  `contentTypeId`-scoped list key, and the touched detail key.
- Assistant `detail-page.upsert` execution results use the same cache-key
  family; failed and `noop` execution results do not mutate cache state.
- Route-link ownership stays outside this client. Canonical public route links
  are still changed through `setting.content-route.upsert`; the detail-page
  client only manages detail-page documents and revision/lifecycle helpers.

### Posts list/detail/revisions cache note

- Posts list/detail cache stays owned by `core/admin/services/postsClient.ts`
  through `posts:list` and `posts:detail:<id>`.
- Post revision history now uses the same shared cache contract with
  `posts:revisions:<id>` and `listPostRevisionsCached()`.
- Autosave, publish, and revision restore responses patch the cached revision
  list with the returned revision payload and broadcast `posts:revisions:<id>`
  instead of forcing the editor drawer to reload the full revisions list.
- The Posts editor hydrates revision drawer state from the cached list and from
  same-tab/cache-bus updates while keeping dirty editor content protected by the
  existing detail-refresh guard.
- TASK-554 adds a bounded per-Post detail authority barrier: generation and
  read-sequence tickets prevent a late detail read, metadata response, autosave,
  restore, or status refresh from overwriting a newer accepted projection.
  A losing mutation reconciles through one guarded detail read; if that read
  fails while still authoritative, the exact detail/list row is removed and the
  ordered `posts:list` then `posts:detail:<id>` invalidation pair is broadcast.
- Successful accepted mutations upsert the exact detail and its list summary,
  then broadcast the ordered update pair. Delete installs a per-id tombstone,
  clears detail/revision state and blocks stale reads or responses from
  repopulating it. `clearPostsCache()` resets generations, tombstones, row
  epochs, and in-flight authority as one boundary.
- The Classic editor hydrates from its protected baseline and performs a
  background refresh only when no mutation lease owns the route identity. A
  cache/read continuation that resumes under a lease is deferred, so it cannot
  overwrite a newer metadata draft or clear its remote-update indication.

### Entries list/detail cache note

- Entries first-screen list cache (`entries:list:all`) is the all-content-type
  list payload for `/admin/advanced/entries`. It is hydrated by
  `listAllEntriesCached()` and warmed on `/advanced/entries` prefetch together
  with `contentTypes:list`.
- Type-scoped caches (`entries:list:<typeSlug>`) remain authoritative for the
  editor, widgets, relation fields, and existing type-scoped clients.
- Within each type slug, `entriesClient` assigns one monotonic publication order
  across complete list reads, per-entry detail reads, successful
  create/update/metadata/status/duplicate publications, and delete tombstones. An
  older list cannot overwrite a newer detail, successful mutation, or delete for the
  same entry; list reconciliation preserves that item authority while still accepting
  the returned rows for unrelated entries.
- A newer authoritative complete list cancels/invalidates observed detail publishers
  and cached detail values at or before its version, including cleanup for an omitted
  observed entry. A newer per-entry detail or mutation remains authoritative. Rejected
  reads and mutations publish no cache state; only successful mutations broadcast.
  `clearEntriesCache(typeSlug)` clears the scoped list/detail/authority state and makes
  captured pre-clear list/detail promises ineligible to publish when they settle.
- Entry create/update/metadata/duplicate/delete mutations update or invalidate
  the type-scoped cache and clear/broadcast `entries:list:all` so the cross-type
  list reloads from the joined read model.
- Entry duplicate writes the returned clone into `entries:detail:<typeSlug>:<id>`
  and invalidates/broadcasts `entries:list:<typeSlug>` so the list reloads from
  the authoritative list endpoint.
- Entry metadata server effects run only after the outer DB transaction commits.
  A metadata mutation containing SEO clears the global site cache exactly once;
  another changed metadata/status mutation performs one targeted entry
  invalidation. Rollback and no-op perform neither. A post-commit invalidator
  failure is reported with a stable redacted code while the durable response
  remains successful, preventing an unsafe duplicate mutation retry.
- After a successful metadata HTTP response, `entriesClient` updates and emits
  exactly `entries:list:<typeSlug>`, `entries:list:all`, and
  `entries:detail:<typeSlug>:<id>` in that order. A rejected response emits no
  cacheBus event and leaves list/detail cache state unchanged. These browser
  events remain client-owned and are not server transaction side effects.
- Entry editor background refresh must not overwrite unsaved content or metadata
  edits; the editor defers active reload while either dirty flag is set.

### Entries revisions cache note

- Entry revision history uses the shared cache contract through
  `core/admin/services/entriesClient.ts` with the `entries:revisions:<id>` key
  (entry id, not type-scoped, matching the restore broadcast) and
  `listEntryRevisionsCached()`.
- The cached revision list is sorted by `version` descending; reads hydrate from
  module memory or `localStorage` and revalidate with `{ force: Boolean(cached) }`
  so the drawer opens instantly and refreshes in the background.
- `restoreEntryRevision` POSTs through the internal route (CSRF, `content:write`),
  re-hydrates the editor from the returned entry, then force-refreshes the
  revision list and broadcasts `entries:revisions:<id>` plus the usual
  `entries:list:<typeSlug>`, `entries:list:all`, and
  `entries:detail:<typeSlug>:<id>` events, because restore may write a new
  pre-restore revision and always changes the entry's current data.
- Restore is confirm-gated in the drawer so unsaved editor edits are not silently
  replaced; a schema-incompatible snapshot surfaces the server's
  `entry_validation_failed` message in the drawer's error slot.

### Custom Screens list/detail cache note

- Custom Screens list cache (`customScreens:list`) uses
  `createMemoryBackedLocalCache`, so module memory and `localStorage` share the
  same list TTL.
- Cached custom screen records include nullable `collectionRole` /
  `compositionKey` metadata from the persisted custom-screen owner seam. Cache
  readers must treat missing legacy values as `null` and must not synthesize
  alternate canonical-screen metadata in browser storage.
- Cached Custom Screen definitions are V4 normalized payloads. Fresh admin
  writes use `definition` only; legacy `blocks` / `bindings` are read-migration
  inputs and are not stored in browser caches as active write state.
- `useCustomScreens()` follows the shared mount policy:
  - cache present -> `{ force: false, background: true }`,
  - cache missing -> `{ force: true, background: false }`,
  - cache-bus list events -> `{ force: true, background: true }`.
- `/admin/advanced/custom-screens` prefetch warms both `customScreens:list` and
  `contentTypes:list` because the first-screen table and filters display
  content-type labels.
- `/admin/advanced/custom-screens/:screenId/entries` prefetch resolves the
  selected screen from `customScreens:list` / `customScreens:detail:<screenId>`,
  warms `contentTypes:list`, and warms `entries:list:<typeSlug>` for the
  assigned content type. Detail workspace routes additionally warm
  `entries:detail:<typeSlug>:<entryId>` when `entryId` is not `new`.
- Active sidebar shortcuts only resolve screens with
  `supportsDedicatedEditor=true`; non-ready screens stay cached and readable in
  the builder/list catalog, but they are not exposed as active workspace
  shortcuts.
- `contentTypesClient` also uses TTL-backed memory for `contentTypes:list`, so
  Custom Screens label projection cannot be pinned to stale module memory after
  the shared list TTL expires.
- The Custom Screens list subscribes to `contentTypes:list` cache events and
  refreshes labels in the background. Screen records keep their original
  `contentTypeId`; labels are a UI projection only.
- `createCustomScreen()`, `updateCustomScreen()`, and `deleteCustomScreen()`
  update or invalidate `customScreens:list` / `customScreens:detail:<id>` and
  broadcast cache events for the list, sidebar shortcuts, builder, and records
  workflow.
- `customScreensClient` assigns one monotonic publication order across complete list
  reads, per-screen detail reads, successful create/update publications, and delete
  tombstones. An older list cannot overwrite a newer detail, mutation, or delete for
  the same screen; reconciliation preserves that item authority while accepting the
  returned rows for unrelated screens. An authoritative list cleans up observed
  details omitted from that list and primes returned rows without displacing a newer
  per-screen value.
- If a direct detail read falls back to the list endpoint, the client publishes and
  reconciles the complete returned list under that same authority, not only the
  requested row. Reads that ultimately reject and rejected mutations publish and
  broadcast nothing.
  `clearCustomScreensCache()` clears tracked list/detail/pending/authority state and
  known browser detail entries; captured pre-clear list/detail promises cannot publish,
  and corrupt stored-list discovery fails safe while clearing known state.
- Builder previews do not introduce a separate Custom Screens preview API or
  preview-only cache family.
- `Editor View` preview and the mounted builder canvas now share one
  cached-first preview-record owner over `entries:list:<typeSlug>`:
  - warm cache -> render the first cached record immediately,
  - cold cache -> fetch `listEntriesCached(typeSlug, { force: false })` once
    and show schema fallback values until records resolve,
  - cache-bus `entries:list:<typeSlug>` events -> revalidate with
    `force: true` while keeping the last good preview record on background
    refresh failures.
- `CustomScreenEntryEditor` create/edit mode reuses the existing entry cache
  contract. Create/update/delete writes update or invalidate
  `entries:list:<typeSlug>` and `entries:detail:<typeSlug>:<entryId>` through
  `entriesClient`; no Custom Screens-specific entry cache is introduced, and the
  screen-owned records workspace no longer hydrates or opens `EntryCreateDrawer`
  as a parallel create path.
- The screen records workspace reuses the type-scoped Entry list/detail ordering
  defined above; it does not introduce a second Entry authority model.
- Related-list hosts subscribe to every normalized target's
  `entries:list:<typeSlug>` event. Initial loads are non-forced; Retry and
  cache-event revalidation are forced. A target change derives empty/loading
  state immediately instead of showing rows from the prior target. A
  same-target refresh keeps the last good rows while the refresh is pending, and
  request/attempt generations reject stale or unmounted settlements.
- Per-record presentation overrides use the separate
  `customScreens:entryOverrides:<screenId>:<entryId>` detail cache key, with
  bounded dynamic key segments from `cacheKeys.customScreenEntryOverrides`.
  `CustomScreenEntryEditor` hydrates this cache independently from entry content
  data, revalidates the internal override route in the background, and passes
  draft overrides to the renderer for render-only merge.
- `replaceScreenEntryOverrides()` patches the local override cache from the
  server response and broadcasts an `update` cache-bus event for the scoped
  override key. `invalidateScreenEntryOverrides()` clears the scoped cache and
  broadcasts `invalidate`.
- Override cache-bus events refresh the presentation draft only when it is clean.
  Dirty presentation drafts keep local edits, set a presentation-specific
  remote-update warning, and do not overwrite unsaved entry content changes.
- Override and entry content hydrations have independent route/request
  generations. Builder document/binding drafts and entry
  content/presentation drafts register the shared internal-navigation plus
  `beforeunload` guard; a request that began while clean still cannot replace a
  draft that became dirty before settlement. Failed load/save state remains
  visible and retryable.
- Screen builder writes attach a non-serialized cache-event operation token.
  Matching current-save detail events are self-events; independent local or
  remote `customScreens:detail:<id>` events are external revisions. External
  detail events never overwrite a dirty builder and unresolved revisions block
  stale full-document saves until an authoritative refresh succeeds. Generic
  list events do not claim identity for the open detail resource.
- Direct-image presentation keeps media UUIDs in override/entry caches. The
  entry host resolves only the winning IDs through `listMediaCached()` and
  gives the renderer an ephemeral UUID-to-URL map; resolved URLs are neither
  written into media fields nor persisted as override values.
- `customScreens.entry.preferences` has a separate authenticated-user
  coordinator. Settled snapshots are keyed by user and retained in memory for a
  bounded handoff (30 seconds) after the last subscriber, then pruned. A return
  to the same user revalidates through the isolated endpoint; a generation made
  newer by a local toggle wins over an older read. Auth-identity epochs abort
  dispatched work and prevent queued work for user A from dispatching under
  user B. Failed/malformed writes keep only the normalized local intent as
  unsynced state and retry only after a fresh setter action. No aggregate cache,
  cache-bus event, or browser-storage key is used for this preference.

### Forms list/detail cache note

- Forms list cache (`forms:list`) is owned by
  `core/admin/services/formsClient.ts`.
- `useForms()` follows the shared list mount policy:
  - cache present -> `{ force: false, background: true }`,
  - cache missing -> `{ force: true, background: false }`,
  - cache-bus list events -> hydrate patched cache when available, then
    `{ force: true, background: true }`.
- `/admin/advanced/forms` prefetch warms `forms:list` with
  `listFormsCached({ force: false })`; `/admin/forms` is only a legacy alias
  normalized through admin path helpers.
- `createForm()` and `updateForm()` upsert returned Forms rows into
  `forms:list`, keep touched detail cache warm when available, and broadcast
  list/detail update events.
- `deleteForm()` removes only deletion-safe Forms rows from list/detail/action
  caches and broadcasts invalidation. Retained submissions or action-run
  diagnostics block hard delete through `form_delete_restricted`, so failed
  deletes must not remove rows from browser cache as success.
- Form submissions (`/admin/advanced/forms/:id/submissions`) are intentionally
  UNCACHED: the read-only screen fetches on open through
  `listFormSubmissions()` (no `cachePolicy` key, no localStorage entry —
  submissions carry visitor-provided data). Only the form name/field labels
  hydrate through the existing `forms:detail:<id>` cached client.

### Tools cache note

- Tools pages now follow the same cached-first contract as Pages/Posts where
  the resource is safe to cache:
  - Search caches recent searches and query/date-range result payloads.
  - SEO Manager caches list/detail rows and invalidates public HTML cache after
    writes.
  - Analytics caches range-scoped overview and Top Content rows plus the real
    traffic overview and Top Pages rows; CSV export payloads are not cached.
  - Backups caches redacted list/schedule rows, patches create/delete cache
    state when the cached page can stay correct, selectively invalidates pages
    whose totals/row order can shift, and never stores local filesystem
    artifact paths or download content in browser cache.
  - Import / Export caches only browser-local Recent Imports activity; export
    bundle payloads and uploaded bundle contents are intentionally uncached.
  - Redirects caches list rows and patches create/update/delete cache state so
    admin revisits do not wait for a foreground list refetch.

## Extending The Cache
When adding a new resource:
1. Add cache keys + TTLs to `core/admin/services/cachePolicy.ts`.
2. Use `readLocalCache` / `writeLocalCache` / `clearLocalCache` for
   storage-only cache or `createMemoryBackedLocalCache` when the client also
   keeps module-level in-memory rows.
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
  - route-selected `menus:detail:<id>` cache present ->
    `{ force: false, background: true, reloadActive: false }`
  - route-selected `menus:detail:<id>` cache missing ->
    `{ force: false, background: false, reloadActive: false }`
  - `pages:list` cache may seed link labels, but it must not move the editor
    shell into background loading when the selected menu detail is missing.
- Menu editor detail reload:
  - reloads the route-selected `menus:detail:<id>` entry on contextual remote
    refresh, save completion, publish/draft completion, or cacheBus detail
    event,
  - does not switch to another menu because `menus:list` changed elsewhere,
  - does not auto-force on every route entry when detail cache exists,
  - suppresses its own `menus:detail:<id>` cache events while save/publish is
    in flight so editor mutations do not show as remote updates.


## Route Map
See `_docs/ADMIN_CACHE_MAP.md` for the route -> file -> cached API map.

## Safety Notes
- Cache is per-browser (localStorage) and scoped to the user session context.
- Do not store secrets or long-lived tokens in cache entries.
