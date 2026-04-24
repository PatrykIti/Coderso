# TASK-206: Media Admin Cache Lifecycle and Partial List Updates
# FileName: TASK-206_Media_Admin_Cache_Lifecycle_and_Partial_List_Updates.md

**Priority:** High
**Category:** CMS/Media + Admin/UI + Cache/Performance
**Estimated Effort:** Large
**Dependencies:** TASK-201, TASK-205
**Status:** To Do

---

## Overview

Repair the Media admin cache lifecycle so opening `/admin/media` from the
sidebar behaves like the current Pages and Menus list surfaces: cached rows
render immediately, fresh `media:list` cache is reused, and the screen does not
force a full `GET /media` reload on every route entry.

Posts currently has its own mount policy gap and is not the parity baseline for
this task family. If Posts parity is needed, create a separate Posts cache task
instead of silently expanding TASK-206.

This task also closes the follow-up cache consistency gap created by that same
flow: media mutations should patch the known `media:list` record set when the
changed asset is known. A metadata update, dimension recovery, replace, delete,
or upload should not reload unchanged gallery assets from the full list endpoint
unless the cache is truly missing, expired, invalidated, or the user explicitly
requests a refresh.

The implementation must fit the existing admin cache architecture. Extend the
current `mediaClient`, `MediaLibraryPage`, `MediaPicker`, `adminPrefetch`, and
cache-bus contracts in place. Do not create a second media browser, route-local
cache layer, media-specific event bus, duplicate storage key, or parallel
gallery state manager.

Use shared/generic admin primitives first. If the needed behavior is already
covered by generic cache, prefetch, event, storage, layout, or grid helpers,
wire Media into that contract instead of adding Media-only files or side
managers. Add Media-specific code only where the Media row shape, upload flow,
or picker UI is genuinely different; when a generic helper is almost correct but
missing a capability, extend the generic owner in a backward-compatible way so
the custom case is handled through the shared contract.

## Contract Repair Rules

- Reuse the existing cache contract:
  - `cacheKeys.mediaList`
  - `listMediaCached`
  - `getCachedMedia`
  - `clearMediaCache`
  - `broadcastCacheEvent`
  - `subscribeCacheEvents`
- Match the Pages/Menus mount policy instead of inventing a Media-only rule:
  - cache present -> `force: false`, background hydration,
  - cache missing -> foreground fetch.
- Mutations that return a media row must upsert/remove only that row in
  `media:list`.
- Same-tab cache events from a mutation that already patched the cache must not
  force a redundant full-list reload.
- Prefetch remains warmup-only. It must call cached list APIs with `force:
  false` and must not become a hidden full reload path.
- Expired-cache behavior must be owned by the shared admin cache layer, not by a
  Media-only branch. If implementation claims expired `media:list` falls back to
  a full read, complete the generic in-memory TTL contract in `TASK-206-00`
  first and apply the same pattern to the affected list clients.
- Keep `MediaGrid` reusable for both `MediaLibraryPage` and `MediaPicker`.
- Prefer existing shared primitives (`cacheRefresh`, `storageCache`, `cacheBus`,
  `adminPrefetch`, `MediaGrid`, `Button`/dialog/layout components) before adding
  new Media-specific helpers. If a helper must be shared by library and picker,
  place it in the existing generic owner or keep it inside the existing files;
  do not create a sidecar media policy module for a generic list-cache rule.
- Keep `media.openAfterUpload` owned by `userSettingsClient`; this task does not
  add a second preference key.
- Keep route modules orchestration-only. If upload response shape changes, the
  service owns the domain row shape and route validation/error mapping stays in
  `mediaRoutes`.

## Sub-Tasks

- [ ] TASK-206-00: Admin Cache In-Memory TTL Contract
- [ ] TASK-206-01: Media Mount Hydration and Picker Cache Policy
  - [ ] TASK-206-01-01: Media Library Mount Refresh Policy
  - [ ] TASK-206-01-02: Media Picker Cache Reuse and Shared Policy Helper
- [ ] TASK-206-02: Partial Media Mutation Cache Updates
  - [ ] TASK-206-02-01: Media Client Patch Helpers and Same-Tab Event Semantics
  - [ ] TASK-206-02-02: Upload Response Row Contract and Cache Upsert
- [ ] TASK-206-03: Regression Proof, Prefetch, Docs, and Closure
  - [ ] TASK-206-03-01: Media Cache and Prefetch Regression Matrix
  - [ ] TASK-206-03-02: Docs, Changelog, and Board Closure

## Scope

0. Shared admin cache TTL correctness:
   - fix any in-memory cache path that can keep returning stale rows after the
     storage envelope TTL expired,
   - do this in a shared cache/client helper or existing generic cache owner,
     not as a `mediaClient`-only special case,
   - cover at least Media plus the list surfaces used as parity references
     (Pages and Menus), and include Posts if it shares the same helper or client
     pattern during implementation.
1. Media route entry and list hydration:
   - hydrate from `getCachedMedia()` on first render,
   - do not show foreground `Loading assets...` when valid cached rows exist,
   - do not call `listMediaCached({ force: true })` on every mount,
   - use the same cache/no-cache mount decision shape as Pages and Menus.
2. Media picker behavior:
   - hydrate selected/browsed media from `getCachedMedia()`,
   - avoid forced refresh after cache hydration,
   - still fetch in foreground when no cache exists and the picker must resolve
     selected IDs or an open dialog.
3. Partial cache mutation:
   - metadata update, dimension recovery, and replace upsert returned records,
   - delete removes only the deleted record,
   - upload adds the new record through a deterministic partial path,
   - cache-bus events distinguish cache-patched updates from full invalidation
     needs where the existing action model allows it.
4. Prefetch and navigation:
   - `/media` prefetch stays `force: false`,
   - active-route skip and prefetch cooldown remain intact,
   - no hidden route-entry network burst for the Media module.
5. Docs and validation:
   - update admin cache docs and route/cache map,
   - add focused Vitest coverage for UI and admin client cache behavior,
   - add Bun route/service tests only if the upload response contract changes.

## Non-Goals

- No new public media endpoints.
- No new public runtime `/media/*` delivery semantics.
- No server-side pagination API in this task.
- No media folder/tag taxonomy.
- No new media browser state store.
- No new browser storage key outside the existing admin cache envelope.
- No production fallbacks added only to satisfy tests.
- No migration of unrelated widget/editor media selectors unless a failing test
  proves they are using this broken route-entry flow.

## Architecture

Current owner seams:

- `core/admin/services/cachePolicy.ts`
  - owns `cacheKeys.mediaList`.
- `core/admin/services/mediaClient.ts`
  - owns list/detail API wrappers for media,
  - owns `media:list` localStorage read/write/clear behavior,
  - owns in-memory promise dedupe for list reads,
  - owns any storage-first cache-event read helper needed to avoid stale
    in-memory rows after cross-tab updates,
  - owns mutation-time cache patching and cache-bus broadcasts.
- `core/admin/ui/media/MediaLibraryPage.tsx`
  - owns screen mount hydration, loading state, filters/search/view,
    selected asset state, upload orchestration, and details drawer wiring.
- `core/admin/ui/media/MediaPicker.tsx`
  - owns picker dialog hydration and selected media resolution,
  - must reuse the same cached media data and not create a second list source.
- `core/admin/utils/cacheBus.ts`
  - owns same-tab and cross-tab cache event delivery.
- `core/admin/utils/storageCache.ts`
  - owns shared storage envelope TTL semantics,
  - must be extended or reused if in-memory list caches need timestamp-aware
    expiration; do not add a Media-only TTL workaround.
- `core/admin/utils/cacheRefresh.ts`
  - owns generic background refresh decision helper for hydrated list surfaces.
- `core/admin/utils/adminPrefetch.ts`
  - owns sidebar prefetch matching, active-route skip, cooldown, and queueing.
- `core/server/routes/mediaRoutes.ts`
  - owns internal admin media route orchestration, validation, RBAC, and
    media-domain error mapping.
- `core/services/media/mediaService.ts`
  - owns media domain row creation/update/delete semantics and storage adapter
    calls.

Existing docs already list `media:list` as a cache key and map `/media` prefetch
to `listMediaCached`. This task aligns the implementation with that contract
instead of introducing new documentation-only behavior.

## Implementation Order

1. Complete `TASK-206-00` first so expired-cache behavior stays generic before
   Media route-entry logic starts relying on it.
2. Complete `TASK-206-01-01` so `MediaLibraryPage` stops force-refreshing when
   cache exists.
3. Complete `TASK-206-01-02` so `MediaPicker` uses the same cache mount policy.
4. Complete `TASK-206-02-01` to make client-side mutation cache patches and
   same-tab cache events avoid redundant full-list reloads.
5. Complete `TASK-206-02-02` to make uploads add one new record to cache through
   the existing media service/route/client contract.
6. Complete `TASK-206-03-01` to lock the request/prefetch regression matrix.
7. Complete `TASK-206-03-02` with docs, changelog, board sync, and final
   validation.

## Pseudocode

Shared mount policy shape:

```ts
export function resolveListMountRefreshOptions(hasInitialCache: boolean) {
  return {
    force: !hasInitialCache,
    background: hasInitialCache,
  };
}
```

If this helper is exported, it belongs in the generic
`core/admin/utils/cacheRefresh.ts` owner, not in a Media-only sidecar module.
If the final implementation follows the existing Pages/Menus local helper
pattern instead, keep it inside the existing page/picker files and do not create
a new Media policy file.

Media library mount:

```ts
const initialCached = useMemo(() => getCachedMedia(), []);
const hasInitialCache = initialCached !== null;
const [items, setItems] = useState(() => (initialCached ?? []).map(toMediaItem));
const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
const hasHydratedRef = useRef(hasInitialCache);

const refresh = useCallback(async (options?: RefreshOptions) => {
  const background = resolveCacheRefreshBackground({
    explicitBackground: options?.background,
    hasHydrated: hasHydratedRef.current,
  });
  if (!background) setIsLoading(true);
  const rows = await listMediaCached({ force: options?.force ?? false });
  setItems(rows.map(toMediaItem));
  hasHydratedRef.current = true;
  if (!background) setIsLoading(false);
}, []);

useEffect(() => {
  refresh(resolveListMountRefreshOptions(hasInitialCache));
}, [hasInitialCache, refresh]);
```

Cache event handling should prefer patched cache for updates:

```ts
subscribeCacheEvents((event) => {
  if (event.key !== cacheKeys.mediaList) return;

  if (event.action === "update") {
    const cached = getCachedMediaForEvent();
    if (cached) {
      setItems(cached.map(toMediaItem));
      hasHydratedRef.current = true;
      return;
    }
  }

  refresh({ force: true, background: true });
});
```

Upload partial path if `POST /media` returns a full row:

```ts
export async function uploadMedia(file: File, meta?: MediaUpdatePayload) {
  const created = await apiRequest<MediaRecord>("/media", { method: "POST", body: formData }, { withCsrf: true });
  upsertCachedMedia(created);
  broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  return created;
}
```

Upload partial path if keeping the current upload result requires detail fetch:

```ts
const uploaded = await apiRequest<UploadResult>("/media", ...);
const created = await getMedia(uploaded.id);
upsertCachedMedia(created);
broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
return created;
```

Prefer the first path if it can reuse the existing `mediaService.uploadMedia`
returning row data without broad route churn.

## Security Contract

- Visibility: internal admin media UI and `/admin/api/media*`.
- Auth model: unchanged admin auth.
- RBAC:
  - `media:read` for list/detail/usage reads,
  - `media:write` for upload/update/replace/delete/dimension recovery.
- CSRF:
  - not applicable for `GET /media`,
  - unchanged and required for write endpoints.
- Rate-limit bucket:
  - existing admin read/write buckets; no new public write surface.
- Reject-unknown validation:
  - unchanged unless upload response or request schemas are touched,
  - if upload response shape changes, response construction must be explicit and
    based on the service-owned media row, not ad-hoc route mutation.
- Anti-abuse:
  - no polling loop,
  - no repeated full-list fetch on route entry with fresh cache,
  - no extra browser storage of secrets, provider keys, privileged settings, or
    non-media admin data,
  - public runtime URLs and media delivery access mode remain unchanged.

## Testing Requirements

- Baseline checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest admin/client:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/storageCache.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/menusClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- Vitest UI:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-picker.test.tsx`
- Perf/regression if request instrumentation is updated:
  - `bun test tests/perf/admin-prefetch-budget.test.ts`
  - `bun test tests/perf/admin-request-baseline.test.ts`
- Bun route/service only if upload response/service shape changes:
  - `bun test tests/integration/routes/media.test.ts`
  - `bun test tests/unit/media/mediaService.test.ts`

Before DB-backed Bun tests, load repo env if required:

```sh
set -a && source .env && set +a
```

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
  - add Media lifecycle policy next to Pages/Menus,
  - document update-vs-invalidate behavior for same-tab patched cache events.
- `_docs/ADMIN_CACHE_MAP.md`
  - confirm Media library/picker cached APIs and mutation cache behavior.
- `_docs/_TASKS/README.md`
  - add task family while in To Do,
  - move to Done on closure and update stats.
- `_docs/_CHANGELOG/*`
  - required on completion.

## Acceptance Criteria

1. Entering `/admin/media` with fresh `media:list` does not issue `GET /media`.
2. Cached gallery rows render immediately without foreground loading.
3. `MediaPicker` reuses cached media without forced reload when cache is fresh.
4. `updateMedia`, `recoverMediaDimensions`, `replaceMedia`, and `deleteMedia`
   update visible/cached state without loading unchanged assets.
5. Upload adds the new asset through a partial cache update path.
6. Cache-bus updates from same-tab media mutations do not cause redundant full
   list reloads.
7. Cache-bus updates from another tab hydrate from the storage-backed
   `media:list` value, or deliberately fall back to a background reload if that
   cache is missing/expired, instead of reusing stale module memory.
8. `/media` sidebar prefetch remains warmup-only with `force: false`.
9. Explicit refresh, true invalidation, expired cache, or missing cache can still
   load the full media list through the shared cache TTL contract, not through a
   Media-only TTL branch.
10. Docs and tests describe the actual implementation, not a parallel plan.
