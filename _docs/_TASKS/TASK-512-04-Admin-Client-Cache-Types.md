# TASK-512-04: Admin Client, Cache & Types

# FileName: TASK-512-04-Admin-Client-Cache-Types.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** Admin Client / Cache / Types
**Estimated Effort:** Medium
**Dependencies:** TASK-512-03 (routes live: media PATCH new fields + `/media/folders*` + quota
in `/settings/storage`).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**512-04 is the SOLE WRITER of:**
- `core/admin/services/mediaClient.ts` (extend `MediaRecord`, `MediaUpdatePayload`, upload meta).
- `core/admin/services/mediaFoldersClient.ts` (**NEW** — folder CRUD/reorder + cache).
- `core/admin/ui/media/types.ts` (extend `MediaItem`, `MediaMetaUpdate`; add `MediaFolder`).
- `core/admin/ui/media/utils.ts` (extend `toMediaItem`; add folder/tag/focal derivations).
- SCOPED append-only edits to shared `core/admin/services/cachePolicy.ts` (new `mediaFolders`
  key) + `core/admin/services/settingsClient.ts` (quota shape on storage settings).

Consumed by 512-05/06. **Land order:** after 512-03, before 512-05.

---

## Grounded anchors (verified 2026-07-05)

- `mediaClient.ts` — `MediaRecord` type (line 6), `MediaUpdatePayload` (line 33),
  `uploadMedia(file, meta?)` (line 135) sends `{ withCsrf:true }`, `updateMedia` (line 162)
  `{withCsrf:true}` + `broadcastCacheEvent({key: cacheKeys.mediaList, action:"update"})`.
  Cache built at line 81 `key: cacheKeys.mediaList`, `getCachedMedia`/`getCachedMediaForEvent`
  (109/111), `listMediaCached` (122).
- `cachePolicy.ts:28` `export const cacheKeys = {...}`; `mediaList: "media:list"` at line 94 —
  APPEND `mediaFolders: "media:folders"` + its ttl entry (mirror the `mediaList` ttl shape).
- `settingsClient.ts` — `StorageSettingsResponse` (line 62) with `delivery:{accessMode}` (68),
  `StorageSettingsUpdate` (86) with `delivery?` (92); `getStorageSettings`/`updateStorageSettings`
  hit `/settings/storage`. APPEND `quota:{totalBytes:number|null; planLabel:string|null}` to
  BOTH response + update shapes (append-only, no existing field touched).
- `types.ts` `MediaItem`/`MediaMetaUpdate`/`MediaUsageItem`; `utils.ts` `toMediaItem`,
  `formatBytes`, `resolveMediaDisplayName` (all imported by `MediaLibraryPage.tsx:41` +
  `MediaPicker.tsx:19`). **Back-compat mandatory** — `MediaPicker` must keep compiling.

---

## Implementation

### A. mediaClient.ts
Extend `MediaRecord` with server fields: `folderId: string|null`, `tags: string[]`,
`focalX: number|null`, `focalY: number|null`, `description: string|null`, `credit: string|null`.
Extend `MediaUpdatePayload` with the same (all optional — present-only PATCH). Extend
`uploadMedia` meta type to allow `folderId`/`tags`. `updateMedia` already broadcasts the
`mediaList` cache event — keep. When an update changes `folderId`, ALSO broadcast the
`mediaFolders` event (counts may shift) — OR let folder counts derive client-side from the media
list (simpler; DECISION: derive counts client-side, so no extra broadcast needed).

### B. mediaFoldersClient.ts (NEW)
```ts
export type MediaFolder = { id; name; slug; parentId: string|null; orderIndex; createdAt };
export async function listMediaFolders(): Promise<MediaFolder[]>            // GET /media/folders (cached)
export async function listMediaFoldersCached(o?:{force?}): ...              // uses cacheKeys.mediaFolders
export async function createMediaFolder(input): ...                          // POST {withCsrf:true} + broadcast mediaFolders
export async function updateMediaFolder(id, patch): ...                      // PATCH {withCsrf:true} + broadcast
export async function reorderMediaFolders(orders): ...                       // POST /media/folders/reorder
export async function deleteMediaFolder(id): ...                             // DELETE {withCsrf:true} + broadcast BOTH folders+mediaList (un-files media)
```
Mirror `mediaClient`'s cache-builder + `broadcastCacheEvent` + `subscribeCacheEvents` pattern
exactly (use `cacheKeys.mediaFolders`). All writes `withCsrf:true`.

### C. types.ts + utils.ts
Extend `MediaItem` with `folderId/tags/focalX/focalY/description/credit`. Extend `toMediaItem`
to map the new `MediaRecord` fields (default `tags` to `[]`, focal/desc/credit to null when
absent — keeps `MediaPicker` back-compat since it only reads existing fields). Extend
`MediaMetaUpdate` for the drawer. Add `MediaFolder` re-export. Add pure helpers:
`resolveFocalPosition(item): {x:number;y:number}` (default `{0.5,0.5}` when null → CSS
`object-position`), `buildFolderTree(folders): FolderNode[]` (nest by parentId, sort by
orderIndex), `countMediaByFolder(items, folderId): number` (recursive incl. descendants),
`filterByTag(items, tag)`. Keep all PURE (Vitest-testable).

### D. cachePolicy.ts + settingsClient.ts (append-only)
- `cachePolicy.ts`: add `mediaFolders: "media:folders"` to `cacheKeys` + ttl (copy `mediaList`).
- `settingsClient.ts`: add `quota` to `StorageSettingsResponse` + `StorageSettingsUpdate`.

---

## Security Contract

- All new client writes send `{ withCsrf: true }` (matches existing `mediaClient` calls) — CSRF
  token attached exactly as the media/settings clients already do. No auth path changed.
- Client is a thin transport; server (512-03) is the trust boundary (reject-unknown, clamp,
  RBAC). Client does light optimistic normalization only (never authoritative).
- Cache: `mediaFolders` is append-only in `cacheKeys`; no existing key TTL/semantics changed —
  no cross-consumer regression. Deleting a folder broadcasts BOTH `mediaFolders` and `mediaList`
  (media un-filed) so open views reconcile.

## Testing Requirements

- **Vitest lane (Bun-free):** `tests/vitest/ui/media-utils.test.ts` (extend) — `toMediaItem`
  maps new fields + defaults; `buildFolderTree` nesting+order; `countMediaByFolder` recursion;
  `resolveFocalPosition` default center + clamp; `filterByTag`. `mediaFoldersClient` request-shape
  test with mocked `apiRequest` (asserts `withCsrf:true`, correct paths/methods).
- **Bun lane:** covered by 512-03 route tests (client is transport).
- Run `bun --cwd core lint:types` AND root `tsc -p tsconfig.json --noEmit` (prop-signature
  change → verify `MediaPicker.tsx` + `MediaLibraryPage.tsx` still compile; per memory the
  test-glob tsc catches excess-prop breaks the core-only lint misses).

## Acceptance Criteria

1. `MediaRecord`/`MediaItem`/`MediaUpdatePayload` carry all new fields; `toMediaItem` maps them.
2. `mediaFoldersClient` CRUD/reorder + cache works; `withCsrf:true` on all writes.
3. `cacheKeys.mediaFolders` + quota shapes added append-only; `MediaPicker` compiles unchanged.
4. Pure utils tested (tree/count/focal/tag). `lint:types` + root `tsc` green.
