# 1225 - TASK-512 Media Library — Prototype Fidelity & Schema Extension

Date: 2026-07-06
Version: Unreleased
Tasks: TASK-512, TASK-512-01, TASK-512-02, TASK-512-03, TASK-512-04, TASK-512-05, TASK-512-06, TASK-512-07

## Key Changes

Reproduces the admin Media Library to prototype fidelity (`_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx`) AND extends the media model/service/route/client/UI to deliver real organization + richer metadata + a data-backed storage quota (not a cosmetic re-skin). Prior functional supersets (bulk bar, details drawer, upload dropzone, usage panel, dimension recovery) are folded into the prototype-faithful shell, not stripped.

- **Schema & migration (512-01, migration `0067_salty_gertrude_yorkes`):** new `media_folders` table (`id, name, slug, parent_id self-ref, order_index, created_at, created_by`) with unique index `media_folders_slug_idx`, `parent_id` index, and `(parent_id, order_index)` index. Six new `media` columns: `folder_id` (fk `media_folders`, `onDelete: set null`, indexed), `tags` (jsonb `string[]` NOT NULL DEFAULT `'[]'`), `focal_x`/`focal_y` (real, nullable), `description`/`credit` (text, nullable). All new columns except `tags` are nullable ⇒ legacy rows read byte-identical; `tags` backfills to `[]`. Journal `idx: 67`, `meta/0067_snapshot.json`.
- **Services, validation & quota (512-02):** `mediaService` gains present-only (`hasOwnProperty`-gated `buildMediaPatch`) persistence of the new fields with `normalize*` for each (tags trim/dedupe/cap; focal clamp to `[0,1]`; text bounds); new `mediaFoldersService` (CRUD + reorder, DB-level + service-level slug uniqueness → `media_folder_slug_conflict`, folder-delete un-files members); `mediaSchemas` extended (`additionalProperties:false`, reject-unknown, upload body rejects `folderId`/`tags`); new `storageSettings` quota model; scoped single-key addition of a nested `quota` object (`totalBytes` number|null, `planLabel` string|null, `additionalProperties:false`) to `storageSettingsSchema` so `PATCH /settings/storage` accepts the quota write.
- **Routes & security (512-03):** `registerMediaFolderRoutes` (invoked from inside `registerMediaRoutes`, so `routes/index.ts` is untouched) adds `GET/POST /media/folders`, `POST /media/folders/reorder`, `PATCH/DELETE /media/folders/:id`, all behind `media:read`/`media:write`; `/media/folders` is registered BEFORE `/media/:id` for correct first-match dispatch. `PATCH /media/:id` accepts the new metadata keys present-only, reject-unknown 4xx on any unknown key, focal clamped (not rejected).
- **Client, cache & types (512-04):** `mediaClient` PATCH new fields; new `mediaFoldersClient` (CSRF on all writes); `types.ts`/`utils.ts` folder/tag/focal derivations; append-only `mediaFolders: "media:folders"` cache key + ttl in shared `cachePolicy.ts`; `quota` shape added to `settingsClient.ts` storage shapes.
- **UI components (512-05):** new `StorageQuotaCard` (progress bar + "% used"/"available" + Manage plan; degrades to count-only when no quota), `MediaFolderRail`, `MediaFilterPanel`, `TagInput`, `FocalPointPicker` (drag marker → `object-position`); `MediaCard` restyled to the prototype (absolute top-left type badge overlay + static in-flow footer tone chip, aspect-square preview); `MediaToolbar` Filters affordance; `MediaDetailsDrawer` + `MediaSettingsDrawer` extended with folder assignment, tags, focal, description, credit, and quota settings. New shared-leaf props (`MediaDetailsDrawer.folders?`, `MediaToolbar.onOpenFilters?`/`activeFilterCount?`) are OPTIONAL for root-tsc/Vitest back-compat; `MediaGrid` public props kept back-compatible so `MediaPicker` is unaffected.
- **Page assembly (512-06):** `MediaLibraryPage` wires the folder rail, storage quota card, filter panel, and new drawer state (folder filter, tag filter, focal/quota) into the prototype layout grid.
- **Tests, docs & closure (512-07):** added the DB-level schema guard `tests/integration/server/media-schema-0067.test.ts` (media_folders round-trip + nesting, tags backfill/byte-safe legacy read, DB slug uniqueness, folder-delete → `folder_id` null) in the globbed Bun lane; verified the Vitest + Bun matrices (schema round-trip, service normalize/reject-unknown, route RBAC/reject-unknown/focal-clamp/upload-reject, client cache, UI fidelity/controls) green; synced docs; closed board + task files.

## Scope

- Migration `0067` (TASK-480 owns `0066`). Storage quota is settings-only (NO DDL). All media + folder writes stay behind the existing `media:write` RBAC bucket; reads behind `media:read` — no new RBAC bucket, no loosened auth path; CSRF on all new client writes.
- Security: reject-unknown 4xx on every new validated key (media PATCH + folder routes + storage-quota settings); present-only update (siblings survive partial PATCH); folder-delete un-files (never cascades); focal clamped `[0,1]`; tag count + per-tag length capped; quota display-only by default (opt-in enforcement).

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run gates:coderso`
- Live ≥5-scenario prototype-fidelity playwright smoke (storage quota data-backed + degrade, folder lifecycle + un-file-on-delete, tags add/remove/filter, focal point, richer metadata round-trip, prototype-parity light+dark, cross-consumer MediaPicker) deferred to the orchestrator post-merge (the running dev host serves the main tree, not this worktree).

## Post-merge live-smoke remediation (orchestrator)

The post-merge live smoke ran green on all core flows (folder create/assign, tag round-trip, all new details-drawer controls, storage-card degrade) and surfaced two fixes:

- **Cache-poisoning bug (fixed) — `mediaClient.ts`:** mutating one asset (assign folder / add tag) *after* the `media:list` TTL had lapsed collapsed the whole library to that single row (a reload then showed "1 of N"). Root cause: `upsertCachedMedia` did `getCachedMedia() ?? []` and, on an empty/expired cache, wrote `[item]` as if it were the complete list (a fresh single-item cache masquerading as full). Now guarded (`if (!current) return`, mirroring `removeCachedMedia`) so an expired-cache mutation leaves the cache unset and the update cache-event forces a full refetch. Added regression test in `tests/vitest/admin/mediaClient.test.ts`. (Latent pre-512, exposed by the new folder/tag drawer controls.)
- **View-toggle fidelity (fixed) — `MediaToolbar.tsx`:** reordered the grid/list toggle to list-then-grid and switched the grid glyph `Grid2X2` → `LayoutGrid` to match the prototype `FilterBar`.
- **Dropzone removed from the page (owner request) — `MediaLibraryPage.tsx` + `UploadDropzone.tsx`:** the large dashed "Upload assets" drop area pushed the asset list below the fold (owner had to scroll to see files). Added a `variant="headless"` to `UploadDropzone` (renders only the hidden file input, keeps the `openFileDialog` handle) and switched the page to it — the header **Upload** button still opens the file dialog, but the big drop area + "Upload assets" header block are gone and the list sits directly under the toolbar. The "Open details after upload" checkbox moved into the "Showing N of N" row. Closer to the prototype (which has no inline dropzone). Test `mediaLibrary.test.tsx` updated to assert the drop area is gone.

Gates re-verified green after the fixes: `test:vitest` (mediaClient + media-toolbar 19/19), `core lint`, `core lint:types`, root `tsc --noEmit`.
