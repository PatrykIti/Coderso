# TASK-512-02: Services, Validation & Storage Quota

# FileName: TASK-512-02-Services-Validation-Storage-Quota.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** Services / Validation / Settings / Model Contract
**Estimated Effort:** Large
**Dependencies:** TASK-512-01 (media columns + `media_folders` table + migration `0066`).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**512-02 is the SOLE WRITER of:**
- `core/services/media/mediaService.ts` (extend `MediaMeta`, `buildMediaPatch`, `uploadMedia`).
- `core/services/media/mediaFoldersService.ts` (**NEW** — folder CRUD/reorder/list).
- `core/server/validation/mediaSchemas.ts` (extend update schema + NEW folder schemas).
- `core/services/settings/storageSettings.ts` (add quota keys + normalize + public/internal shape).
- `core/server/validation/settingsSchemas.ts` (SCOPED, single-key): add the nested `quota`
  object to `storageSettingsSchema` so the `PATCH /settings/storage` route validator (which is
  `additionalProperties:false`) accepts the quota write. Owner of this file for 512 = 512-02 only;
  append-only, no existing storage property touched.

Consumes 512-01 columns. Consumed by 512-03 (routes). ZERO edits to routes/client/UI.

**Land order:** after 512-01, before 512-03.

---

## Grounded anchors (verified 2026-07-05)

- `mediaService.ts:11` — `export type MediaMeta = { alt?; title?; caption? }`; `buildMediaPatch`
  (line 73) uses `Object.prototype.hasOwnProperty.call(meta, key)` present-only gating — the
  EXACT pattern new keys must follow. `updateMedia` (line 169) sets only `buildMediaPatch`
  output; empty patch → returns `getMediaById` (no write). `uploadMedia` (line 116) inserts alt/
  title/caption.
- `mediaSchemas.ts` — `mediaUpdateSchema` (line 13) is `additionalProperties:false` with
  `alt/title/caption` as `["string","null"]`. `mediaUploadSchema` line 1.
- `storageSettings.ts` — `STORAGE_KEYS` map (line ~94) `{ maxSizeBytes:"storage.maxSizeBytes",
  allowedMime:"storage.allowedMime", ... }`; `StorageSettingsPublic` (line 18) /
  `StorageSettingsInternal` (line 42) / `StorageSettingsUpdate` (line 66) types; `getStorageSettings`
  (261), `getStorageSettingsInternal` (316), `setStorageSettings` (399) with `queueValue(...)`
  writes + `resolveNumberWithFallback`/`normalizeNumber` helpers already present.
- `db.select().from(media)` uses drizzle; `listMedia` (line 160) `orderBy(desc(media.createdAt))`.
- `settingsSchemas.ts` — `storageSettingsSchema` (lines 25-75) is the ROUTE-LEVEL validator with
  `additionalProperties:false` and properties `driver/local/publicBaseUrl/maxSizeBytes/allowedMime/
  delivery/s3/azure` — **no `quota`**. `settingsRoutes.ts:151` calls `validate(storageSettingsSchema,
  ctx.body)` BEFORE `setStorageSettings(payload)` (line 153), so an unknown `quota` key is rejected
  at the route boundary before the service ever runs. GET side (`getStorageSettings`) needs no schema
  change. This is the file the quota save path depends on — it MUST gain a `quota` property here.

---

## Implementation

### A. mediaService.ts — extend metadata

Extend `MediaMeta`:
```ts
export type MediaMeta = {
  alt?: string | null; title?: string | null; caption?: string | null;
  description?: string | null; credit?: string | null;
  folderId?: string | null;
  tags?: string[] | null;
  focalX?: number | null; focalY?: number | null;
};
```
Extend `buildMediaPatch` — add a present-only branch PER new key (same
`hasOwnProperty` guard). Add a `normalizeMediaMeta(meta)` helper (pure, Bun-free — export for
Vitest) that clamps/sanitizes BEFORE patch build:
- `folderId`: if present and non-null, must be a uuid string that EXISTS in `media_folders`
  (validate against DB in the service layer; a bad id → throw `media_folder_not_found`); null
  clears membership.
- `tags`: coerce to `string[]`, trim each, drop empties, dedupe (case-insensitive), cap at
  `MAX_TAGS = 30` and each tag `MAX_TAG_LEN = 40` chars (throw `media_tags_invalid` if over, or
  clamp — DECISION: clamp/truncate silently to stay lenient, but reject non-array).
- `focalX`/`focalY`: numbers clamped to `[0,1]`; NaN/non-number → reject `media_focal_invalid`.
  null clears. If exactly one of X/Y present, the other stays as-is (present-only per axis).
- `description`/`credit`: strings or null; cap length (`MAX_DESC = 2000`, `MAX_CREDIT = 300`).
Keep `normalizeMediaMeta` PURE (no DB) except the folder-existence check which stays in
`updateMedia` (so the pure normalizer is Vitest-testable without Bun/DB).

`uploadMedia` — accept optional `folderId`/`tags` in `meta` on insert (default `tags` to `[]`,
folderId null). Focal/description/credit are set post-upload via PATCH (not on the upload form).

### B. mediaFoldersService.ts (NEW)

```ts
export type MediaFolderInput = { name: string; slug?: string; parentId?: string | null; orderIndex?: number };
export type MediaFolderPatch = Partial<MediaFolderInput>;   // present-only name/slug/parentId/orderIndex
export type MediaFolderOrder = { id: string; orderIndex: number; parentId?: string | null };
export async function listMediaFolders(): Promise<MediaFolderRow[]>   // ordered by parentId, orderIndex
export async function createMediaFolder(input: MediaFolderInput, userId?): Promise<MediaFolderRow>
export async function updateMediaFolder(id: string, patch: MediaFolderPatch): Promise<MediaFolderRow | null>  // present-only name/slug/parentId/orderIndex
export async function deleteMediaFolder(id): Promise<{ ok: true }>    // relies on onDelete:set null — media un-filed, not deleted
export async function reorderMediaFolders(orders: MediaFolderOrder[]): Promise<void>
```
- `slug`: derive from name if omitted (`slugify` — reuse existing slug util if one exists under
  `core/services/**`; grep `slugify`/`toSlug` before writing a new one). Enforce uniqueness at
  service level with a friendly `media_folder_slug_conflict` (DB unique index is the backstop).
- `parentId`: reject self-parent (`id === parentId`) and reject cycles (walk ancestors; throw
  `media_folder_cycle`). Nesting depth cap `MAX_DEPTH = 5` (`media_folder_depth_exceeded`).
- `normalizeMediaFolderInput` — PURE helper (name trim + required, slug normalize, orderIndex
  int ≥ 0) exported for Vitest; cycle/existence checks stay in the DB-touching functions.

### C. mediaSchemas.ts — validation

Extend `mediaUpdateSchema` (keep `additionalProperties:false`), add:
`folderId: {type:["string","null"]}`, `tags: {type:"array", items:{type:"string"}}`,
`focalX: {type:["number","null"]}`, `focalY: {type:["number","null"]}`,
`description: {type:["string","null"]}`, `credit: {type:["string","null"]}`.
Add NEW schemas: `mediaFolderCreateSchema` (`required:["name"]`, name/slug/parentId/orderIndex,
`additionalProperties:false`), `mediaFolderUpdateSchema` (all optional, `additionalProperties:false`),
`mediaFolderReorderSchema` (`required:["orders"]`, `orders: {type:"array", items:{type:"object",
required:["id","orderIndex"], properties:{...}, additionalProperties:false}}`).

### D. storageSettings.ts — quota (SETTINGS, no DDL)

Add to `STORAGE_KEYS`: `quotaTotalBytes: "storage.quota.totalBytes"`,
`quotaPlanLabel: "storage.quota.planLabel"`. Add to `StorageSettingsPublic`/`Internal`:
`quota: { totalBytes: number | null; planLabel: string | null }`. Add to
`StorageSettingsUpdate`: optional `quota?: { totalBytes?: number|null; planLabel?: string|null }`.
- `getStorageSettings`/`getStorageSettingsInternal`: read the two keys via existing
  `resolveNumberWithFallback`/`resolveStringWithFallback` (null default = unlimited/no bar).
- `setStorageSettings`: `queueValue(STORAGE_KEYS.quotaTotalBytes, normalizeNumber(...))` +
  planLabel (trim, cap 60 chars, empty→null). `normalizeNumber` already rejects negatives —
  verify; quota must be ≥ 0 or null.
- **Quota enforcement DECISION (default = display-only):** do NOT reject uploads by default.
  Add an internal helper `checkQuota(usedBytes, incomingBytes)` returning
  `{ exceeded: boolean, over: number }` for the route/UI to consume, but `uploadMedia` does NOT
  auto-reject unless a future `storage.quota.enforce` flag is set — avoids locking out existing
  installs. (Enforcement flag deferred; note as open question if owner wants hard-enforce.)

---

### E. settingsSchemas.ts — route-level quota schema (single-key, scoped)

`storageSettings.ts` (§D) only defines the SERVICE contract; the write path is guarded by the
ROUTE validator `storageSettingsSchema` in `settingsSchemas.ts`, which is `additionalProperties:false`.
Without this edit the `PATCH /settings/storage` route rejects `quota` as an unknown key BEFORE
`setStorageSettings` runs (see grounded anchor) — breaking 512-04's `updateStorageSettings({quota})`,
512-05's settings drawer save, and Acceptance Criterion 6 / 512-07 smoke.

Add a nested `quota` property to `storageSettingsSchema.properties` (keep the parent
`additionalProperties:false`):
```ts
quota: {
  type: "object",
  additionalProperties: false,
  properties: {
    totalBytes: { type: ["number", "null"] },
    planLabel: { type: ["string", "null"] },
  },
},
```
This mirrors the `StorageSettingsUpdate.quota` shape from §D. No existing storage property is
touched (append-only). Service-side `normalizeNumber`/planLabel trim+cap in §D remain
authoritative — the schema only opens the key.

## Security Contract

- **Route-level quota key allowlist:** `storageSettingsSchema` (`settingsSchemas.ts`) gains a nested
  `quota` object with its own `additionalProperties:false` (only `totalBytes`/`planLabel`); the
  parent object stays `additionalProperties:false`. Unknown top-level or nested quota keys still 4xx.
- **Schema-first reject-unknown:** every new update key has a `mediaUpdateSchema` entry under
  `additionalProperties:false`; folder schemas likewise. Any unknown key → validator 4xx (route
  layer, 512-03).
- **Service-side normalize is authoritative:** `normalizeMediaMeta`/`normalizeMediaFolderInput`
  clamp focal to `[0,1]`, cap tag count/length, cap text lengths, reject non-uuid folderId,
  reject cycles/self-parent/over-depth — validation is NOT trusted to the JSON-schema alone.
- **Folder delete = un-file, never cascade-delete media** (`onDelete:"set null"` from 512-01).
- **Present-only:** omitted keys never written (`hasOwnProperty` gating) — legacy rows untouched.
- No new RBAC bucket; writes stay `media:write`, reads `media:read` (enforced at routes, 512-03).

## Testing Requirements

- **Vitest lane (Bun-free, pure):** `tests/vitest/services/mediaMeta-normalize.test.ts` +
  `mediaFolders-normalize.test.ts` + `storageSettings-quota-normalize.test.ts`:
  focal clamp `[0,1]` (out-of-range + NaN reject), tag dedupe/cap/trim, description/credit cap,
  slug derive, orderIndex coerce, quota number normalize (negative→reject, null passthrough),
  reject-unknown shape assertions on the schemas, INCLUDING a `storageSettingsSchema` round-trip
  test: `{ quota: { totalBytes, planLabel } }` validates OK, and `{ quota: { bogus: 1 } }` +
  a top-level unknown key are rejected.
- **Bun lane (DB, SERVICE lane — distinct files, never 512-03's route tests):**
  `tests/integration/services/media-folders-service.test.ts` (NEW) — folder CRUD round-trip, cycle/
  self-parent rejection, over-depth rejection (`media_folder_depth_exceeded`), slug conflict,
  delete-un-files; and `tests/integration/services/mediaMeta-service.test.ts` (NEW) —
  `updateMedia` new-fields round-trip with siblings surviving + quota getter/setter round-trip.
  These are the SERVICE-layer lane and MUST NOT land in 512-03's
  `tests/integration/routes/media*.test.ts` / `media-folders.test.ts` (route lane, owned by 512-03).
  Shared-DB safety: unique slugs + `afterEach` teardown.

## Acceptance Criteria

1. `MediaMeta` + `buildMediaPatch` + `mediaUpdateSchema` cover all new keys (present-only,
   reject-unknown, normalized/clamped).
2. `mediaFoldersService` CRUD/reorder works with cycle/self-parent/depth/slug guards.
3. Quota settings read/write via existing settings store (no DDL); `checkQuota` helper present.
   `storageSettingsSchema` (`settingsSchemas.ts`) accepts the nested `quota` object so
   `PATCH /settings/storage` no longer rejects the quota write (round-trip + reject-unknown test).
4. All new Vitest + Bun tests green; `lint:types` + root `tsc` green.
