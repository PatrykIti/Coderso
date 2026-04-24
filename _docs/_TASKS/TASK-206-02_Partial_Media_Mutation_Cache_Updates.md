# TASK-206-02: Partial Media Mutation Cache Updates
# FileName: TASK-206-02_Partial_Media_Mutation_Cache_Updates.md

**Priority:** High
**Category:** CMS/Media + Admin/Client + Cache
**Estimated Effort:** Large
**Dependencies:** TASK-206-01
**Status:** To Do

---

## Overview

Make media mutations update `media:list` partially when the changed asset is
known. This is the cache consistency half of the Media reload issue: once mount
stops forcing a full list reload, mutation paths must keep cached rows truthful
without refetching every unchanged asset.

The existing `mediaClient` already has in-place helpers for upserting and
removing media records. This subtask strengthens those helpers and aligns
cache-bus handling so same-tab updates do not immediately trigger a redundant
full `GET /media`.

## Sub-Tasks

- [ ] TASK-206-02-01: Media Client Patch Helpers and Same-Tab Event Semantics
- [ ] TASK-206-02-02: Upload Response Row Contract and Cache Upsert

## Files to Change

- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaPicker.tsx` if it subscribes to media cache events
  after `TASK-206-01-02`.
- `core/services/media/mediaService.ts` if upload returns a full row.
- `core/server/routes/mediaRoutes.ts` if upload response shape changes.
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/integration/routes/media.test.ts` if route response shape changes.
- `tests/unit/media/mediaService.test.ts` if service upload return shape changes.

## Implementation Direction

- Strengthen `mediaClient` first. UI should consume client-owned cache truth.
- Reuse existing `upsertCachedMedia` and `removeCachedMedia`; expose test-only
  behavior through public client methods, not exported internals unless the repo
  already follows that pattern.
- For update-like operations, broadcast `update` only after the cache was
  patched.
- For delete, remove the id from cache before broadcasting.
- For upload, prefer returning a full media row from the existing upload route
  and upserting it. If that would create broad churn, fetch only the uploaded
  detail row and upsert it.
- Do not introduce a bulk media endpoint or a second list invalidation channel.

## Pseudocode

```ts
const upsertCachedMedia = (item: MediaRecord) => {
  const current = cachedMedia ?? readMediaCache() ?? [];
  const next = current.some((media) => media.id === item.id)
    ? current.map((media) => (media.id === item.id ? item : media))
    : [item, ...current];
  primeMediaCacheInternal(next);
};
```

```ts
export async function updateMedia(id: string, payload: MediaUpdatePayload) {
  const updated = await apiRequest<MediaRecord>(`/media/${id}`, ...);
  upsertCachedMedia(updated);
  broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  return updated;
}
```

```ts
export async function deleteMedia(id: string) {
  const result = await apiRequest<{ ok: boolean }>(`/media/${id}`, ...);
  if (result?.ok) {
    removeCachedMedia(id);
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  }
  return result;
}
```

Use `invalidate` only when the client cannot construct a truthful partial cache
state. If delete remains `invalidate` for cross-tab semantics, the current tab
must still avoid immediate full reload when `getCachedMedia()` already contains
the post-delete row set.

## Security Contract

- Visibility: internal admin media API/client/UI.
- Auth model: unchanged.
- RBAC:
  - `media:read` for any optional detail fetch,
  - `media:write` for upload/update/replace/delete/recover.
- CSRF: unchanged for writes.
- Rate-limit bucket: unchanged admin read/write buckets.
- Reject-unknown validation:
  - unchanged for existing mutation payloads,
  - if upload response changes, route/service response shape must be explicit.
- Anti-abuse:
  - no repeated full-list reload after same-tab mutation,
  - no client loop fetching the same media row repeatedly,
  - no storage of privileged data outside the current media record shape.

## Testing Requirements

- `tests/vitest/admin/mediaClient.test.ts`
  - update upserts returned row into cached list,
  - recover upserts returned row,
  - replace upserts returned row,
  - delete removes only the deleted row,
  - upload adds one created row through the chosen partial path.
- `tests/vitest/ui/media-library.test.tsx`
  - cache event `update` hydrates from patched cache without forced full reload,
  - selected/deleted asset state remains truthful.
- Bun route/service tests only if upload response/service shape changes.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Known media mutations patch `media:list` without reloading unchanged assets.
2. Same-tab cache events do not immediately undo partial patching with full
   forced reloads.
3. Cross-tab cache subscribers still become consistent.
4. Upload has a deterministic one-record cache update path.
