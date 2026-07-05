# TASK-512: Media Library — Prototype Fidelity & Schema Extension

# FileName: TASK-512_Media_Library_Prototype_Fidelity_And_Schema.md

**Parent Task:** TASK-512 (board umbrella)
**Priority:** High
**Category:** Admin UI / Media / DB Schema / Services / Routes / Prototype Fidelity
**Estimated Effort:** Large
**Dependencies:** TASK-479 (Soft-Violet admin redesign; the current Media screen already ports the prototype folder rail + `PageHeader`/`Card` shell — TASK-512 extends, not rewrites). Rides the existing `media:read`/`media:write` RBAC buckets (`permissionsCatalog.ts:56/61`) and the existing `PATCH /media/:id` + `GET /media` routes. No dependency on any other in-flight task.
**Status:** ⏳ To Do

---

## Overview

The admin Media Library screen (`core/admin/ui/media/MediaLibraryPage.tsx`, live at
`http://coderso-a.localhost:5173/admin/media`) does **not** match the prototype
(`_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx`, live at
`http://localhost:5180/#/media`), and the media model lacks the organizational + metadata
fields the owner mandates (folders/collections, tags, focal point, richer metadata) for
maximum end-user configuration flexibility.

This task (a) reproduces the prototype layout/structure/tokens FAITHFULLY and (b) extends the
media schema/model + service/route/client/UI to deliver FULL functionality (not a cosmetic
shell): real user-defined **folders**, **tags**, **focal point**, and **richer metadata**
(description + credit), plus a configurable **storage quota** so the prototype's storage
progress card is data-backed rather than hardcoded.

### Prototype-vs-current gap analysis (LIVE-verified 2026-07-05, screenshots in `_docs/_workflows/_smoke/wf512-proto-media.png` + `wf512-admin-media.png`)

Verified by reading BOTH sources AND comparing the two running screens side-by-side
(session `wf512author`, chromium, 1440×900):

| Area | Prototype (`:5180/#/media`) | Current admin (`:5173/admin/media`) | Gap |
|------|------------------------------|--------------------------------------|-----|
| Storage card | `SectionCard` with **Progress bar** (62%), "6.2 GB of 10 GB used", **"Manage plan"** action, "62% used" / "3.8 GB available" footer | Flat `Card`: icon + "N assets · N KB", NO progress, NO quota, NO action | Storage QUOTA card missing (no quota model; hardcoded in proto) |
| Folder rail | All files / Images / Videos / Documents / Audio (type-based, static counts) | Same type-based rail (`folderDefs`, counts derived) — GOOD baseline | Rail is MIME-type only; owner mandate = real user **folders/collections** |
| Toolbar | `FilterBar`: search + **"Filters"** button + grid/list toggle | search + grid/list toggle only | **"Filters" control missing** (no tag/type/folder facet UI) |
| Grid card | aspect-square muted preview, **type Badge top-left**, name, size + small tone chip bottom-right | aspect-[4/3] preview, tone Badge in details row, "Missing alt" affordance (functional extra) | Card structure/tokens diverge from proto (top-left type badge, tone chip) |
| Bulk bar | (none in proto) | "N selected / Select visible / Download / Delete / Clear" | Current is a FUNCTIONAL superset — KEEP, integrate tastefully |
| Details drawer | (proto has no drawer) | Full drawer: preview, title/alt/caption, file info, usage | KEEP; EXTEND with tags, focal point, description, credit, folder assignment |
| Model | (mock) | `media` table: alt/title/caption + dimensions | **No folders, tags, focal point, description, credit, quota** |

**Design principle (owner mandate):** reproduce the prototype LAYOUT/STRUCTURE/TOKENS faithfully
(storage progress card, "Filters" affordance, top-left type badge grid card), then ADAPT +
EXTEND functionality (real folders, tags, focal, richer metadata, configurable quota). Do NOT
strip the current functional supersets (bulk bar, details drawer, upload dropzone, usage panel,
dimension recovery) — fold them into the prototype-faithful shell.

---

## Schema-extension plan (grounded against `core/db/schema.ts:1104-1119`)

Current `media` table columns: `id, key, url, originalName, type, mimeType, size, width,
height, alt, title, caption, createdAt, createdBy`. **New:**

1. **`media_folders` table (NEW):** `id uuid pk`, `name text notNull`, `slug text notNull`
   (unique index), `parentId uuid` self-ref `references(() => mediaFolders.id, {onDelete:"set null"})`
   (nesting), `orderIndex integer notNull default 0`, `createdAt timestamp default now notNull`,
   `createdBy uuid references users.id`. Indexes: unique on `slug`, index on `parentId`, index on
   `(parentId, orderIndex)`.
2. **`media.folderId`** `uuid references(() => mediaFolders.id, {onDelete:"set null"})` nullable —
   asset→folder membership; `set null` so deleting a folder un-files assets (never cascade-deletes
   media). Index on `folderId`.
3. **`media.tags`** `jsonb("tags").$type<string[]>().notNull().default([])` — free-form tags
   (mirrors the existing `custom_screens.tags` / listings `tags` pattern at `schema.ts:770/860`).
4. **`media.focalX`** `real("focal_x")` + **`media.focalY`** `real("focal_y")` — nullable focal
   point in normalized `0..1` coords (image crop/`object-position` focus). Both null = default
   center behavior (present-only).
5. **`media.description`** `text("description")` + **`media.credit`** `text("credit")` — richer
   metadata (long-form description distinct from `caption`; attribution/credit line). Both nullable.
6. **Storage quota (SETTINGS, not schema):** new `storageSettings` keys `storage.quota.totalBytes`
   (number, nullable — null = unlimited/no bar) + `storage.quota.planLabel` (string, nullable) in
   the existing `settings` key/value store — NO DDL for quota. The storage card computes
   `usedBytes = Σ media.size` (already available client-side) against the configured quota.

**DDL artifacts (512-01):** migration `0066_*` — SQL (`CREATE TABLE media_folders` + 6
`ALTER TABLE media ADD COLUMN` + indexes), `meta/0066_snapshot.json`, and a `meta/_journal.json`
entry `idx: 66`. `media.tags` DEFAULT `'[]'::jsonb` NOT NULL. All other new columns nullable ⇒
legacy rows byte-safe on read.

---

## Sub-Tasks

| ID | Title | File | Status |
|----|-------|------|--------|
| TASK-512-01 | Schema & Migration — media_folders + media metadata columns | `TASK-512-01-Schema-And-Migration.md` | ⏳ To Do |
| TASK-512-02 | Services, Validation & Storage Quota | `TASK-512-02-Services-Validation-Storage-Quota.md` | ⏳ To Do |
| TASK-512-03 | Routes & Security — media meta + folders CRUD | `TASK-512-03-Routes-And-Security.md` | ⏳ To Do |
| TASK-512-04 | Admin Client, Cache & Types | `TASK-512-04-Admin-Client-Cache-Types.md` | ⏳ To Do |
| TASK-512-05 | UI Components — Prototype Fidelity & New Controls | `TASK-512-05-UI-Components-Fidelity-And-Controls.md` | ⏳ To Do |
| TASK-512-06 | Media Library Page Assembly & Prototype Layout | `TASK-512-06-Page-Assembly-And-Layout.md` | ⏳ To Do |
| TASK-512-07 | Tests, Docs, Smoke & Closure | `TASK-512-07-Tests-Docs-Smoke-Closure.md` | ⏳ To Do |

### Land order (strictly sequential — each lands green before the next opens)

1. **512-01 (schema + migration)** — model keystone. Sole writer of the `media`/`media_folders`
   region of `core/db/schema.ts` + migration `0066_*` artifacts. Nothing consumes it yet.
2. **512-02 (services + validation + quota)** — sole writer of `core/services/media/mediaService.ts`,
   NEW `core/services/media/mediaFoldersService.ts`, `core/server/validation/mediaSchemas.ts`,
   `core/services/settings/storageSettings.ts`, and a SCOPED single-key edit to
   `core/server/validation/settingsSchemas.ts` (add nested `quota` to `storageSettingsSchema` so the
   `PATCH /settings/storage` route validator accepts the quota write — otherwise 512-04/05's quota
   save is rejected as an unknown key). Consumes 512-01 columns; reject-unknown +
   `normalize*` for every new validated key; folder-service CRUD/reorder.
3. **512-03 (routes + security)** — sole writer of `core/server/routes/mediaRoutes.ts` (+ a NEW
   `registerMediaFolderRoutes` invoked FROM `registerMediaRoutes` so `routes/index.ts` is NOT
   touched). Security Contract; RBAC `media:read`/`media:write`.
4. **512-04 (client + cache + types)** — sole writer of `core/admin/services/mediaClient.ts`, NEW
   `core/admin/services/mediaFoldersClient.ts`, `core/admin/ui/media/types.ts`,
   `core/admin/ui/media/utils.ts`; scoped edits to shared `core/admin/services/cachePolicy.ts`
   (new `mediaFolders` cache key) + `core/admin/services/settingsClient.ts` (quota shape).
5. **512-05 (UI components)** — sole writer of `MediaCard.tsx`, `MediaGrid.tsx`, `MediaToolbar.tsx`,
   `MediaDetailsDrawer.tsx`, `MediaSettingsDrawer.tsx`, NEW `StorageQuotaCard.tsx`,
   `MediaFolderRail.tsx`, NEW leaf controls (`TagInput.tsx`, `FocalPointPicker.tsx`). Prototype
   fidelity + new controls; consumed by 512-06.
6. **512-06 (page assembly)** — sole writer of `core/admin/ui/media/MediaLibraryPage.tsx`. Wires the
   folder rail, storage quota card, filters, drawer, and all new state (folder filter, tag filter,
   focal/quota). Reproduces the prototype layout grid.
7. **512-07 (closure)** — tests (Vitest + Bun), the **≥5-scenario SMOKE**, docs, changelog, board.

Single-writer map: **schema+migration = 512-01**; **mediaService/mediaFoldersService/mediaSchemas/
storageSettings/settingsSchemas(quota key only) = 512-02**; **mediaRoutes(+folder routes) = 512-03**; **mediaClient/
mediaFoldersClient/types/utils(+cachePolicy,settingsClient) = 512-04**; **all media UI leaf
components = 512-05**; **MediaLibraryPage = 512-06**; **tests/docs/closure = 512-07**. Every source
file has exactly one owner.

---

## Coordination & shared-file notes

- **`core/admin/services/cachePolicy.ts`** (shared, MANY consumers) — 512-04 adds ONE key
  `mediaFolders: "media:folders"` + a ttl; append-only, no existing key touched.
- **`core/admin/services/settingsClient.ts`** (shared) — 512-04 adds `quota` to the storage
  settings request/response shapes; append-only.
- **`core/server/validation/settingsSchemas.ts`** (shared, route-level validators) — 512-02 adds a
  nested `quota` object (`additionalProperties:false`, `totalBytes` number|null, `planLabel`
  string|null) to `storageSettingsSchema` ONLY. This is the write-path gate: `settingsRoutes.ts:151`
  validates this schema before `setStorageSettings`, so WITHOUT this the client/UI quota save
  (512-04/05) is rejected as an unknown key. Append-only, no existing storage property touched;
  single owner = 512-02.
- **`core/admin/ui/media/MediaGrid.tsx`** is ALSO imported by `MediaPicker.tsx` (`mediaClient`
  consumer, line 17) — 512-05 must keep `MediaGrid`'s public props back-compatible (additive only)
  so the picker is unaffected; verify `MediaPicker.tsx` compiles unchanged.
- **`core/server/routes/index.ts`** is NOT edited — folder routes register from inside
  `registerMediaRoutes` (512-03) to preserve the one-owner rule.
- **Changelog pin (closure only):** **1224**.

---

## Security Contract (task-level; per-subtask contracts in 512-02/03/04)

- All media + folder writes stay behind the existing `media:write` RBAC bucket; reads behind
  `media:read` (`permissionsCatalog.ts:56/61`) — NO new RBAC bucket, NO loosened auth path. New
  routes ride the app's existing CSRF/session envelope (`withCsrf: true` on the client).
- **Schema-first, reject-unknown:** every new validated payload key gets a JSON-schema entry with
  `additionalProperties:false` (`mediaSchemas.ts` pattern) AND a service-side `normalize*`
  (reject/omit unknown; clamp/validate values). New keys join the update allowlist with a
  round-trip test.
- **Present-only / byte-identity:** all new optional media columns are nullable (except `tags`
  which defaults `[]`); a legacy row with none of them set reads byte-identical. Update is
  present-only (`Object.prototype.hasOwnProperty` gating in `buildMediaPatch`) — an omitted key is
  never written.
- **Folder delete = `onDelete:"set null"`** on `media.folderId` — deleting a folder NEVER deletes
  media; slug uniqueness enforced at DB + service. Focal coords clamped to `[0,1]`; tags length +
  per-tag length capped server-side.
- **Storage quota** is advisory display + optional enforcement: if `storage.quota.totalBytes` is set
  AND `usedBytes + incoming > quota`, upload MAY reject `media_quota_exceeded` (413) — decided in
  512-02 (default: display-only unless enforcement flag set, to avoid locking out existing installs).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

- **Vitest lane (Bun-free, pure):** `mediaSchemas`/`mediaFoldersService`/`storageSettings` normalize
  + reject-unknown; `utils.ts` folder/tag/focal derivations; new UI component render tests
  (`StorageQuotaCard`, `TagInput`, `FocalPointPicker`, folder rail, details drawer new fields).
- **Bun lane (route/runtime/DB):** `tests/integration/routes/media*.test.ts` — media PATCH new
  fields persist per-key (round-trip, siblings survive); folder CRUD/reorder; folder delete sets
  `folderId` null (not cascade-delete of media); quota reject path; reject-unknown 4xx with error
  code. Shared-DB safety: folder/media fixtures created + torn down per-test (unique slugs; no
  global-state leak — see the recurring smoke-DB-pollution note in memory).
- **SMOKE (owner mandate, authored in 512-07): ≥5 DISTINCT real-flow scenarios** asserting VISIBLE
  effect (computed styles/geometry/persisted rows), not control presence — see 512-07.

---

## Acceptance Criteria (measured LIVE vs prototype, light + dark)

1. Admin Media screen layout matches the prototype side-by-side: storage **progress** card
   (quota-backed), "Filters" affordance, top-left type-badge grid cards, folder rail — in light AND
   dark (`:5173` == `:5180/#/media` structure/tokens; gate on `:5173` HTTP 200).
2. Real folders: create / rename / nest / reorder / delete a folder; assign assets; filter grid by
   folder; deleting a folder un-files (never deletes) its media.
3. Tags: add/remove tags on an asset (persisted); filter by tag.
4. Focal point: set focal point on an image (persisted `focalX/focalY`); the preview reflects it.
5. Richer metadata: description + credit persist and round-trip.
6. Storage quota configurable via Media settings (plan label + total bytes); the progress card
   reflects real used/total; unset quota degrades gracefully to the count-only card.
7. Byte-identity: legacy media rows with none of the new fields read unchanged; no-quota installs
   see no regression. Full gates green: `bun --cwd core lint`, `lint:types`, root
   `tsc -p tsconfig.json --noEmit`, `test:bun`, full vitest, `gates:coderso`.

---

## Documentation Updates Required (authored at 512-07 closure)

- `_docs/CONTENT_TYPES_SPEC.md` / media model doc — new `media` columns + `media_folders` table,
  tags/focal/description/credit semantics, storage quota settings keys.
- `_docs/_CHANGELOG/` — new entry, **pinned 1224** (verify still free at closure).
- `_docs/_TASKS/README.md` — parent + 7 child rows + Statistics (owner-managed; NOT edited here).
</content>
</invoke>
