# TASK-206-02-01: Media Client Patch Helpers and Same-Tab Event Semantics
# FileName: TASK-206-02-01_Media_Client_Patch_Helpers_and_Same_Tab_Event_Semantics.md

**Priority:** High
**Category:** CMS/Media + Admin/Client + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-206-01-01, TASK-206-00
**Status:** To Do

---

## Overview

Harden `mediaClient` and Media UI event handling so update-like mutations patch
`media:list` and same-tab cache events do not trigger a redundant full
`GET /media`.

Current owner truth:

- `updateMedia`, `recoverMediaDimensions`, and `replaceMedia` already receive a
  returned media record.
- `deleteMedia` knows the deleted id.
- `cacheBus` delivers same-tab events synchronously after broadcast.
- `MediaLibraryPage` currently responds to every `media:list` event with
  `refresh({ force: true, background: true })`.

This leaf changes event consumption before adding the upload-specific row
contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaLibraryPage.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/ui/media-library.test.tsx`

## Implementation Direction

- Keep cache patch helpers local to `mediaClient` unless tests require a public
  inspection seam.
- Treat server responses as source of truth for updated media rows.
- Prefer `update` events for patched cache state.
- Do not let cache-event hydration reuse stale module memory. Same-tab events
  can consume the just-patched in-memory list, but cross-tab events must
  re-read the storage-backed `media:list` value first, or fall back to one
  background reload if that cache is missing/expired.
- The missing/expired distinction belongs to the shared TTL owner from
  `TASK-206-00`; do not duplicate TTL math inside the event handler.
- Keep any event-read helper in `mediaClient.ts` or extend the existing generic
  `cacheBus` contract in place; do not add a Media-specific side bus or route
  state owner.
- In `MediaLibraryPage`, for `media:list` `update` events:
  - read the storage-backed event cache helper from `mediaClient`,
  - map rows through `toMediaItem`,
  - update state without forced network reload,
  - fall back to forced background refresh only if cache is unavailable.
- Keep `force: true` for true invalidation or explicit user refresh.

## Pseudocode

```ts
const applyCachedMediaRows = () => {
  const cached = getCachedMediaForEvent();
  if (!cached) return false;
  setItems(cached.map(toMediaItem));
  hasHydratedRef.current = true;
  return true;
};
```

```ts
useEffect(() => {
  return subscribeCacheEvents((event) => {
    if (event.key !== cacheKeys.mediaList) return;

    if (event.action === "update" && applyCachedMediaRows()) {
      return;
    }

    refresh({ force: true, background: true }).catch(() => undefined);
  });
}, [refresh]);
```

Client mutation pattern:

```ts
if (updated) {
  upsertCachedMedia(updated);
  broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
}
```

Delete pattern:

```ts
if (result?.ok) {
  removeCachedMedia(id);
  broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
}
```

If delete keeps `invalidate` for compatibility, the UI must still first apply
the event cache helper when it contains a patched row set.

For `update` events, the event-read helper should prefer `readMediaCache()` over
module-level memory so another tab's patched `media:list` cannot be hidden by
stale in-memory rows in the current tab. If storage is missing or expired, the
helper must not silently return raw `cachedMedia`; it may return memory only
through the timestamp-aware helper from `TASK-206-00`. If no fresh storage or
fresh memory value exists, return `null` and let the UI perform one background
reload.

## Security Contract

- Visibility: internal admin UI/client only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - same-tab updates must not cause immediate full-list reloads,
  - cross-tab updates must not reuse stale in-memory rows,
  - no new polling or route loop.

## Testing Requirements

- `tests/vitest/admin/mediaClient.test.ts`
  - `updateMedia` patches cached row and broadcasts update,
  - `recoverMediaDimensions` patches cached row and broadcasts update,
  - `replaceMedia` patches cached row and broadcasts update,
  - `deleteMedia` removes cached row without fetching full list.
  - event-read helpers prefer storage-backed patched rows over stale module
    memory,
  - event-read helpers return `null`, not raw stale memory, when storage is
    missing/expired and the timestamp-aware memory helper is also expired.
- `tests/vitest/ui/media-library.test.tsx`
  - `media:list` update event with cached rows updates UI state without calling
    forced full refresh,
  - cross-tab-like update event with stale in-memory rows applies the
    storage-backed list or falls back to one background reload,
  - true invalidation/missing cache still supports background reload.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Update-like media mutations patch the known cache row.
2. Delete removes only the known cache row.
3. Same-tab update events do not force `GET /media`.
4. Cross-tab update events do not render stale in-memory rows when storage has
   the patched list.
5. Missing cache still recovers through background list reload.
