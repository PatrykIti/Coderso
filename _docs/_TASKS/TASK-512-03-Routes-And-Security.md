# TASK-512-03: Routes & Security — media meta + folders CRUD

# FileName: TASK-512-03-Routes-And-Security.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** Server Routes / Security / API
**Estimated Effort:** Medium
**Dependencies:** TASK-512-02 (extended `MediaMeta`/schemas, `mediaFoldersService`, quota).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**512-03 is the SOLE WRITER of `core/server/routes/mediaRoutes.ts`.** It (a) already forwards
new update keys (the PATCH handler passes `ctx.body as MediaMeta` straight to `updateMedia`, so
extended `MediaMeta`+`mediaUpdateSchema` flow through once validated) — POST `/media` (upload) is
LEFT UNCHANGED: `folderId`/`tags` are assigned via **PATCH `/media/:id` only**, NOT at upload
time (parity with focal/description/credit, which 512-02 §A already routes through PATCH — see the
Reconciliation note in Implementation); and (b) adds a NEW `registerMediaFolderRoutes(router, deps)`
function in THIS file, invoked from inside `registerMediaRoutes` so **`core/server/routes/index.ts`
is NOT touched** (preserves one-owner).

ZERO edits to `routes/index.ts`, services, client, UI. **Land order:** after 512-02, before 512-04.

---

## Grounded anchors (verified 2026-07-05)

- `mediaRoutes.ts:104` `registerMediaRoutes(router, deps)`; deps = `{ requirePermission, validate }`
  (line 38). PATCH `/media/:id` (line 154) already: `validate(mediaUpdateSchema, ctx.body)` then
  `updateMedia(ctx.params.id, ctx.body as MediaMeta)` — new keys flow AUTOMATICALLY once 512-02
  widens the type + schema. POST `/media` (line 111) reads `body.alt/title/caption` explicitly and
  `validate(mediaUploadSchema, ctx.body)` runs FIRST (line 113).
- `mediaSchemas.ts:1-11` — `mediaUploadSchema` is `additionalProperties:false` with ONLY
  `file/alt/title/caption` (required `file`). 512-02 §C widens `mediaUpdateSchema` (PATCH) but does
  NOT widen `mediaUploadSchema`, so any upload body carrying `folderId`/`tags` is rejected 4xx at
  the route boundary BEFORE `uploadMedia` runs. **Decision (see Reconciliation note): do NOT forward
  `folderId`/`tags` on upload — leave POST `/media` body handling as-is; assign folder/tags via
  PATCH `/media/:id` only** (parity with focal/description/credit, which 512-02 §A already keeps
  PATCH-only). `UploadBody` (mediaRoutes.ts:43) stays `{ file, alt?, title?, caption? }` — unchanged.
- Errors mapped in `mapMediaError` (line 65) switch — ADD new cases: `media_folder_not_found`
  (404), `media_folder_slug_conflict` (409), `media_folder_cycle` (400),
  `media_folder_depth_exceeded` (400), `media_focal_invalid` (400 — thrown by 512-02 ONLY for
  NaN/non-number focal, NOT for out-of-range, which is CLAMPED not rejected), `media_tags_invalid` (400),
  `media_quota_exceeded` (413). (`media_folder_depth_exceeded` is thrown by 512-02's
  `MAX_DEPTH = 5` cap — it MUST be in this closed set or an over-depth create/patch bubbles as a
  generic 500 instead of 400.)
- `routes/index.ts:62` calls `registerMediaRoutes(router, {...})` — DO NOT edit; folder routes
  register from inside `registerMediaRoutes`.
- RBAC: `requirePermission("media:read")` / `"media:write")` — buckets defined at
  `core/services/admin/permissionsCatalog.ts:56` (`media:read`) / `:61` (`media:write`). NO new
  bucket.

---

## Implementation

POST `/media` (upload) — **NO change.** Leave the existing `alt/title/caption` forwarding and the
`UploadBody` type (`{ file, alt?, title?, caption? }`) exactly as-is. Do NOT add `folderId`/`tags`
forwarding: `mediaUploadSchema` is `additionalProperties:false` (owned by 512-02, not widened for
upload), so a body with those keys is rejected 4xx before `uploadMedia` runs — added forwarding
would be dead code. PATCH `/media/:id` needs NO change beyond the widened
`mediaUpdateSchema`/`MediaMeta` — confirm it forwards the whole body (it already does:
`updateMedia(ctx.params.id, ctx.body as MediaMeta)`).

> **Reconciliation note (cross-subtask 02↔03, resolves the upload-schema gap):** folder/tag
> assignment is **PATCH-only**, matching how 512-02 §A keeps focal/description/credit PATCH-only.
> `mediaUploadSchema` is intentionally NOT widened, so upload does not carry `folderId`/`tags`.
> Consequence for 512-02: the `folderId`/`tags` params 512-02 §A adds to `uploadMedia` are reachable
> only by non-route (direct service/test) callers — 512-02 may keep them as an internal capability
> or the owner reconcile pass may trim them; 512-03 does not depend on them. Client flow (512-04/05)
> uploads first, then PATCHes `folderId`/`tags` on the returned media id. This eliminates the
> route-boundary contradiction without any edit to `mediaSchemas.ts` (512-02's file).

Add + call folder routes:
```ts
export function registerMediaFolderRoutes(router: Router, deps: MediaRouteDeps) {
  const { requirePermission, validate } = deps;
  router.get("/media/folders", requirePermission("media:read"), async () =>
    withMediaErrors(async () => listMediaFolders()));
  router.post("/media/folders", requirePermission("media:write"), async (ctx) =>
    withMediaErrors(async () => { validate(mediaFolderCreateSchema, ctx.body);
      return createMediaFolder(ctx.body as MediaFolderInput, ctx.user?.id); }));
  router.patch("/media/folders/:id", requirePermission("media:write"), async (ctx) =>
    withMediaErrors(async () => { validate(mediaFolderUpdateSchema, ctx.body);
      const r = await updateMediaFolder(ctx.params.id, ctx.body as MediaFolderPatch);
      if (!r) throw new Error("media_folder_not_found"); return r; }));
  router.post("/media/folders/reorder", requirePermission("media:write"), async (ctx) =>
    withMediaErrors(async () => { validate(mediaFolderReorderSchema, ctx.body);
      await reorderMediaFolders((ctx.body as { orders: MediaFolderOrder[] }).orders); return { ok: true }; }));
  router.delete("/media/folders/:id", requirePermission("media:write"), async (ctx) =>
    withMediaErrors(async () => deleteMediaFolder(ctx.params.id)));
}
```
Import the folder-service fns + folder schemas at top of `mediaRoutes.ts`.

**Route ordering — HARD REQUIREMENT (not optional):** `registerMediaFolderRoutes(router, deps)`
MUST be invoked FIRST inside `registerMediaRoutes`, BEFORE the `GET /media/:id` group is
registered — do NOT register it at the end. The router is strictly first-match by registration
order: `httpServer.ts:325-328` iterates `router.routes` in order and dispatches the FIRST route
whose method+path matches, and `matchRoute` (`router.ts:75`) matches on EQUAL segment count only
(no static-over-param priority). `GET /media/folders` and `GET /media/:id` (`mediaRoutes.ts:135`)
are BOTH 2-segment patterns, so if `/media/:id` is registered first it captures `/media/folders`
with `id="folders"` → the media-by-id handler runs → `media_not_found` (404), and the folder list
is never reached. Registering the static `/media/folders*` routes before the `:id` group is the
ONLY correct order. The same applies to `PATCH`/`DELETE /media/folders/:id` vs
`PATCH`/`DELETE /media/:id` (both 3- vs 2-segment here so those do not collide, but keep the
folder group ahead for consistency). This ordering is asserted by test (e) below.

---

## Security Contract

- **Auth/RBAC:** all folder reads `media:read`, all folder writes `media:write` — SAME buckets as
  media; NO new RBAC id, NO loosened path. New routes ride the existing session+CSRF envelope
  (client sends `withCsrf:true` — 512-04).
- **Reject-unknown at the edge:** every write validates against a `additionalProperties:false`
  schema BEFORE hitting the service; unknown keys → 4xx. Query/params are string-typed only.
- **Error mapping is closed-set:** new service error strings map to specific ApiError codes
  (404/409/400/413) via `mapMediaError`; unmapped errors bubble as generic (no internal leak).
- **Folder delete never cascade-deletes media** (`onDelete:set null`, enforced 512-01/02).
- **Quota:** if enforcement is enabled (512-02 flag, default off), upload maps
  `media_quota_exceeded` → 413; default install = display-only (no reject).
- **No IDOR surface:** folder ids are server-validated to exist; media folderId assignment
  validates the target folder exists (512-02) — a forged folderId 4xx, never silently persists.

## Testing Requirements

- **Bun lane (route/DB):** `tests/integration/routes/media-folders.test.ts` (NEW) +
  extend `tests/integration/routes/media*.test.ts`:
  (a) folder CRUD via HTTP (create→list→patch→reorder→delete) round-trip;
  (b) `media:read`/`media:write` enforced (unauthorized → 403);
  (c) PATCH `/media/:id` with `tags`/`focalX`/`focalY`/`description`/`credit`/`folderId` persists
  per-key, siblings survive, focal out-of-range is CLAMPED to `[0,1]` and PERSISTED (e.g. PATCH
  `focalX:1.5` → 200, stored `1.0` — per 512-02 §A owner behavior, which clamps not rejects; do NOT
  assert 400 for out-of-range), a non-number focal → 400 (`media_focal_invalid`, schema-rejected at
  the edge and service backstop), unknown key → 4xx;
  (d) delete folder → assigned media survives with `folderId` null (200, not 404/cascade);
  (e) `/media/folders` not shadowed by `/media/:id` (GET returns folder list, not media_not_found);
  (f) upload boundary: POST `/media` with a `folderId`/`tags` key in the body → rejected 4xx by
  `mediaUploadSchema` (reject-unknown), and the PATCH-only path (test (c)) is the sole way to set
  `folderId`/`tags` — proves the 02↔03 reconciliation (no dead upload forwarding).
  Shared-DB safety: unique slugs, per-test teardown, no cross-suite row-count coupling.
- **Vitest lane:** none (route wiring is Bun-runtime).

## Acceptance Criteria

1. Folder CRUD/reorder routes live under `/media/folders*`, registered WITHOUT editing
   `routes/index.ts`; static path not shadowed by `/media/:id`.
2. Media PATCH persists all new fields (reject-unknown 4xx; focal out-of-range clamped to `[0,1]`
   and persisted — NOT rejected; non-number focal → 400).
3. All writes behind `media:write`, reads behind `media:read`; CSRF envelope intact.
4. Folder delete un-files media (never deletes). Error codes correct (404/409/400/413).
5. Bun route tests green; `lint:types` + root `tsc` green.
