# TASK-512-04: Admin Client, Cache & Types

# FileName: TASK-512-04-Admin-Client-Cache-Types.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** Admin Client / Cache / Types
**Estimated Effort:** Medium
**Dependencies:** TASK-512-03 (routes live: media PATCH new fields + `/media/folders*` + quota
in `/settings/storage`).
**Status:** ✅ Done
**Completed:** 2026-07-06

---

## Scope (single-writer)

**512-04 is the SOLE WRITER of:**
- `core/admin/services/mediaClient.ts` (extend `MediaRecord`, `MediaUpdatePayload`; add a narrow
  `UploadMediaMeta = {alt?,title?,caption?}` and re-type `uploadMedia`'s `meta` param to it so the
  upload meta CANNOT type-accept folder/tag — folder/tag set via upload-first-then-PATCH per 512-03).
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
- `cachePolicy.ts:28` `export const cacheKeys = {...}`; `mediaList: "media:list"` at line 96
  (verified 2026-07-05) — APPEND ONLY `mediaFolders: "media:folders"`. NOTE: `cacheKeys` is a flat key→string map with NO
  per-key ttl; `cacheTtlMs` (lines 23–26) is a shared flat `{ list, detail }` and `mediaList` has
  no dedicated ttl (mediaClient reuses `cacheTtlMs.list` at `mediaClient.ts:82`). Do NOT add any ttl
  entry — the new folders cache reuses the shared `cacheTtlMs.list`.
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
Extend `MediaUpdatePayload` with the same (all optional — present-only PATCH), since `updateMedia`
must carry the new fields.
**`uploadMedia` meta must NOT widen with them — and this must be TYPE-enforced, not convention.**
Today `uploadMedia(file, meta?)` (line 135) types `meta` as `MediaUpdatePayload`, so extending
`MediaUpdatePayload` in place would *silently* widen the upload meta param to also type-accept
`folderId`/`tags`. At runtime that is safe (the body at `mediaClient.ts:138-140` forwards only
`alt/title/caption`, so extras are inert/dropped), but the type would no longer enforce the rule —
and per 512-03 an upload body with `folderId`/`tags` is rejected 4xx at the route boundary
(`mediaUploadSchema` is `additionalProperties:false` and NOT widened; any such forwarding is dead
code that breaks uploads). To keep "extend `MediaUpdatePayload`" and "upload meta stays
`{alt?,title?,caption?}`" NON-contradictory, introduce a dedicated narrow type
`export type UploadMediaMeta = { alt?: string|null; title?: string|null; caption?: string|null }`
(the pre-extension `MediaUpdatePayload` shape) and re-type the signature to
`uploadMedia(file: File, meta?: UploadMediaMeta)` (body still `set`s only `alt/title/caption` per
`mediaClient.ts:138-140`). This makes an `uploadMedia(file, { folderId })` call a *compile error*,
matching 512-06 §4 ("Do NOT pass `folderId` into `uploadMedia` meta").
> **SAME-FILE SIBLING — narrow `uploadClipboardImage` too (verified 2026-07-05).** `mediaClient.ts`
> also exports `uploadClipboardImage(file: File, meta?: MediaUpdatePayload)` (`mediaClient.ts:157`)
> which forwards to `uploadMedia(normalizedFile, meta)`. If its `meta` param keeps the (now-extended)
> `MediaUpdatePayload`, `uploadClipboardImage(file, { folderId })` STILL compiles — the wide payload is
> assignable to the narrow `UploadMediaMeta` param (target props all optional), so the "type-enforced,
> not convention" guarantee (AC1) leaks through this sibling in the very file 512-04 owns. It is NOT a
> compile break today (both real call sites — `usePostEditorState.ts:994` and `MediaLibraryPage.tsx:255`
> — pass NO meta, verified), but 512-04 is the SOLE WRITER of this file, so re-type
> `uploadClipboardImage`'s `meta` to `UploadMediaMeta` as well (it only ever needs `alt/title/caption`)
> so the upload-cannot-carry-folder invariant holds across BOTH upload entry points, not just
> `uploadMedia`.
Folder/tag assignment is **upload-first-then-PATCH**: the UI (512-05/06) calls `uploadMedia`, then
`updateMedia(returnedId, { folderId?, tags? })` on the returned media id. `updateMedia` already
broadcasts the
`mediaList` cache event — keep. When an update changes `folderId`, ALSO broadcast the
`mediaFolders` event (counts may shift) — OR let folder counts derive client-side from the media
list (simpler; DECISION: derive counts client-side, so no extra broadcast needed).

### B. mediaFoldersClient.ts (NEW)
```ts
export type MediaFolder = { id; name; slug; parentId: string|null; orderIndex; createdAt };
// Client-side reorder item type — declared INDEPENDENTLY here (cannot import the server
// `MediaFolderOrder` from 512-02 across the transport boundary). Must match the server shape
// (512-02 line 142 / 512-03 line 118) EXACTLY so the route's reject-unknown accepts it.
// NOTE (cross-subtask reconcile): this item carries optional `parentId` (drag re-parenting),
// so 512-02's `mediaFolderReorderSchema` per-item `properties` (512-02 line 173) MUST explicitly
// allowlist `parentId: {type:["string","null"]}` under `additionalProperties:false` — otherwise
// the route rejects 4xx any reorder item that sends parentId. (This client's round-trip test mocks
// `apiRequest`, so it cannot catch that schema gap; the real schema check lives in 512-03 route tests.)
export type MediaFolderOrder = { id: string; orderIndex: number; parentId?: string | null };
export async function listMediaFolders(): Promise<MediaFolder[]>            // GET /media/folders (cached)
export async function listMediaFoldersCached(o?:{force?}): ...              // uses cacheKeys.mediaFolders
export async function createMediaFolder(input): ...                          // POST {withCsrf:true} + broadcast mediaFolders
export async function updateMediaFolder(id, patch): ...                      // PATCH {withCsrf:true} + broadcast
export async function reorderMediaFolders(orders: MediaFolderOrder[]): Promise<void> {
  // The 512-03 route reads `(ctx.body as { orders: MediaFolderOrder[] }).orders` (03 line 118),
  // so the body MUST be the `{ orders }` wrapper — a bare array is rejected 4xx.
  await apiRequest<{ ok: boolean }>(
    "/media/folders/reorder",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orders }) },
    { withCsrf: true }
  );
  broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
}
export async function deleteMediaFolder(id): ...                             // DELETE {withCsrf:true} + broadcast BOTH folders+mediaList (un-files media)
```
Mirror `mediaClient`'s client-layer cache pattern EXACTLY: `createMemoryBackedLocalCache({ key:
cacheKeys.mediaFolders, ... })` (as `mediaClient.ts:80`) + a module-level in-flight promise dedupe
(`cachedFoldersPromise`, mirroring `cachedMediaPromise` at `mediaClient.ts:76`) + `broadcastCacheEvent`
on every write (as `mediaClient.ts:152/174/…`). All writes `withCsrf:true`. Do NOT call
`subscribeCacheEvents` here — this transport client only BROADCASTS: `mediaClient.ts` itself never
subscribes (broadcast-only), and subscription lives in the UI (`MediaLibraryPage.tsx:158`). Note
`dashboardClient.ts:3/184` DOES subscribe, but that is a UI-adjacent data-refresh pattern, not the
transport convention we follow here. Subscription to the `mediaFolders`/`mediaList` events belongs in
the 512-06 UI (`MediaLibraryPage.tsx`, which already calls `subscribeCacheEvents` at line 158),
consistent with the media transport pattern.

### C. types.ts + utils.ts
Extend `MediaItem` with `folderId/tags/focalX/focalY/description/credit`. Extend `toMediaItem`
to map the new `MediaRecord` fields (default `tags` to `[]`, focal/desc/credit to null when
absent — keeps `MediaPicker` back-compat since it only reads existing fields). Extend
`MediaMetaUpdate` for the drawer. Add `MediaFolder` re-export. Add pure helpers:
`resolveFocalPosition(item): {x:number;y:number}` (default `{0.5,0.5}` when null → CSS
`object-position`), `buildFolderTree(folders): FolderNode[]` (nest by parentId, sort by
orderIndex), `countMediaByFolder(items, folderId): number` (recursive incl. descendants),
`filterByTag(items, tag)`. Keep all PURE (Vitest-testable). **Also EXPORT the tree node type**
`export type FolderNode = MediaFolder & { children: FolderNode[] }` (it is `buildFolderTree`'s
return element) — 512-06 imports it as `import type { FolderNode } from "@/ui/media/utils"` for its
`folderDescendantIds` DFS, so annotating `buildFolderTree` alone is insufficient; the `export type`
is a required deliverable of this single-writer file.

### D. cachePolicy.ts + settingsClient.ts (append-only)
- `cachePolicy.ts`: add ONLY `mediaFolders: "media:folders"` to `cacheKeys` (no ttl entry — the
  folders cache reuses the shared `cacheTtlMs.list`, exactly as `mediaClient.ts:82`).
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

- **Vitest lane (Bun-free) — pure utils:** EXTEND the REAL existing suite
  `tests/vitest/admin/mediaUtils.test.ts` (verified: it imports `core/admin/ui/media/utils` and
  today covers `resolveMediaDisplayName`/`formatDimensions`/`hasMissingImageAlt` over a `MediaItem`
  — this, NOT `media-restyle.test.tsx`, is where utils coverage lives; do NOT create a
  nonexistent `tests/vitest/ui/media-utils.test.ts`). Add: `toMediaItem` maps new fields +
  defaults; `buildFolderTree` nesting+order; `countMediaByFolder` recursion; `resolveFocalPosition`
  default center + clamp; `filterByTag`.
- **Vitest lane (Bun-free) — client transport (SEPARATE file):** CREATE NEW
  `tests/vitest/admin/mediaFoldersClient.test.ts` alongside the REAL existing
  `tests/vitest/admin/mediaClient.test.ts` (verified: `tests/vitest/admin/` is the client-transport
  lane, globbed by Vitest `tests/vitest/**`; the `tests/vitest/services/` dir holds only menu/page
  suites, no client transport). Mock `apiRequest` and assert `withCsrf:true` + correct method +
  path per call. **Explicitly assert `reorderMediaFolders` serializes its body to the `{ orders: [...] }`
  wrapper** (i.e. `JSON.parse(mockApiRequest.mock.calls[i][1].body)` deep-equals `{ orders }`, NOT a
  bare array) so a future refactor cannot silently regress to a body the 512-03 route rejects. Keep
  transport assertions OUT of `mediaUtils.test.ts` — do not fold them together.
- **Bun lane:** covered by 512-03 route tests (client is transport).
- Run `bun --cwd core lint:types` AND root `tsc -p tsconfig.json --noEmit` (prop-signature
  change → verify `MediaPicker.tsx` + `MediaLibraryPage.tsx` still compile; per memory the
  test-glob tsc catches excess-prop breaks the core-only lint misses).

## Acceptance Criteria

1. `MediaRecord`/`MediaItem`/`MediaUpdatePayload` carry all new fields; `toMediaItem` maps them.
   `uploadMedia`'s `meta` is re-typed to the narrow `UploadMediaMeta` (`{alt?,title?,caption?}`) so
   `uploadMedia(file, { folderId })` fails to compile (type-enforced, not convention).
2. `mediaFoldersClient` CRUD/reorder + cache works; `withCsrf:true` on all writes.
3. `cacheKeys.mediaFolders` + quota shapes added append-only; `MediaPicker` compiles unchanged.
4. Pure utils tested (tree/count/focal/tag). `lint:types` + root `tsc` green.
