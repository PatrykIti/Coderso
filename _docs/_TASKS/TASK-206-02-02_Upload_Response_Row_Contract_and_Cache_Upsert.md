# TASK-206-02-02: Upload Response Row Contract and Cache Upsert
# FileName: TASK-206-02-02_Upload_Response_Row_Contract_and_Cache_Upsert.md

**Priority:** High
**Category:** CMS/Media + Domain/Service + API + Admin/Client
**Estimated Effort:** Medium
**Dependencies:** TASK-206-02-01
**Status:** To Do

---

## Overview

Make uploads add the newly uploaded asset to `media:list` through a one-record
cache update path instead of invalidating the list and forcing a full gallery
reload.

Current owner truth:

- `mediaService.uploadMedia` inserts the row but returns only `{ id, url, key }`.
- `mediaClient.uploadMedia` clears/invalidate `media:list` after success.
- `MediaLibraryPage` then calls a forced refresh after upload.

This leaf chooses a deterministic partial update strategy and wires it through
the existing service/route/client chain.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/media/mediaService.ts`
- `core/server/routes/mediaRoutes.ts`
- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaLibraryPage.tsx`
- `tests/unit/media/mediaService.test.ts`
- `tests/integration/routes/media.test.ts`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/ui/media-library.test.tsx`

## Implementation Direction

Preferred path:

- Change `mediaService.uploadMedia` to return the full inserted media row.
- Keep route orchestration unchanged: `POST /media` returns the service result.
- Change `mediaClient.uploadMedia` return type to `MediaRecord`.
- Upsert the created record into `media:list` and broadcast `update`.
- Change `MediaLibraryPage.handleUploadFiles` to use returned records and avoid
  forced full refresh after upload.

Fallback path only if full-row upload return creates unacceptable churn:

- Keep upload result as `{ id, url, key }`.
- Add/reuse a client `getMedia(id)` wrapper for `GET /media/:id`.
- After upload, fetch only that one media row and upsert it.
- Do not fetch the full list.

Do not introduce a second upload flow, bulk upload endpoint, or client-side fake
media row with incomplete metadata.

## Pseudocode

Preferred service shape:

```ts
export async function uploadMedia(file: UploadFile, meta: MediaMeta, userId?: string) {
  // validate, store, insert...
  const [row] = await db.insert(media).values(...).returning();
  return row;
}
```

Client shape:

```ts
export async function uploadMedia(file: File, meta?: MediaUpdatePayload) {
  const created = await apiRequest<MediaRecord>(
    "/media",
    { method: "POST", body: formData },
    { withCsrf: true }
  );

  if (created) {
    upsertCachedMedia(created);
    broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
  }

  return created;
}
```

Page upload orchestration:

```ts
const uploaded: MediaRecord[] = [];
for (const file of files) {
  uploaded.push(await uploadMedia(file));
}
setItems((prev) => mergeMediaItems(prev, uploaded.map(toMediaItem)));
if (uploaded[0]?.id) {
  setSelectedId(uploaded[0].id);
  setIsDrawerOpen(openAfterUpload);
}
```

If state reads from patched cache after the client broadcasts, this page-local
merge can be skipped to avoid duplicate merge logic. Prefer one owner for the
merge and keep UI state consistent with `getCachedMedia()`.

## Security Contract

- Visibility: internal admin `POST /media`.
- Auth model: unchanged admin auth.
- RBAC: `media:write`.
- CSRF: unchanged and required for multipart upload.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation:
  - request schema remains `mediaUploadSchema`,
  - response shape is service-owned and must be the existing media row fields
    needed by `MediaRecord`.
- Anti-abuse:
  - no extra upload endpoint,
  - no public write surface,
  - no repeated full-list fetch after upload,
  - no fake cached row missing authoritative MIME/type/size/dimensions fields.

## Testing Requirements

- `tests/unit/media/mediaService.test.ts`
  - upload returns full media row fields used by the admin client,
  - existing validation, dimensions, title fallback, and delete cleanup still pass.
- `tests/integration/routes/media.test.ts`
  - `POST /media` route response includes id, url, key, type, mimeType, size,
    createdAt, and metadata fields expected by `MediaRecord`,
  - route error mapping remains bounded.
- `tests/vitest/admin/mediaClient.test.ts`
  - upload upserts created row into cached media list,
  - upload broadcasts update, not full invalidation unless fallback path requires
    it and is documented.
- `tests/vitest/ui/media-library.test.tsx`
  - upload success reveals the new row without calling forced full refresh.

## Documentation Updates Required

- `_docs/CMS_API.md` if upload response shape is documented there.
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Upload creates one authoritative media row for cache upsert.
2. Upload does not invalidate `media:list` only to reload the full gallery.
3. New upload appears in the Media Library immediately.
4. Existing upload validation, storage, dimensions, and CSRF behavior remain
   unchanged.
