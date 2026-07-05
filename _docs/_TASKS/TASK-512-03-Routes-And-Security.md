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
extended `MediaMeta`+`mediaUpdateSchema` flow through once validated) — VERIFY and adjust the
`UploadBody` forwarding to include `folderId`/`tags`; and (b) adds a NEW
`registerMediaFolderRoutes(router, deps)` function in THIS file, invoked from inside
`registerMediaRoutes` so **`core/server/routes/index.ts` is NOT touched** (preserves one-owner).

ZERO edits to `routes/index.ts`, services, client, UI. **Land order:** after 512-02, before 512-04.

---

## Grounded anchors (verified 2026-07-05)

- `mediaRoutes.ts:104` `registerMediaRoutes(router, deps)`; deps = `{ requirePermission, validate }`
  (line 38). PATCH `/media/:id` (line 154) already: `validate(mediaUpdateSchema, ctx.body)` then
  `updateMedia(ctx.params.id, ctx.body as MediaMeta)` — new keys flow AUTOMATICALLY once 512-02
  widens the type + schema. POST `/media` (line 111) reads `body.alt/title/caption` explicitly —
  ADD `folderId`/`tags` forwarding here.
- Errors mapped in `mapMediaError` (line 65) switch — ADD new cases: `media_folder_not_found`
  (404), `media_folder_slug_conflict` (409), `media_folder_cycle` (400),
  `media_folder_depth_exceeded` (400), `media_focal_invalid`/`media_tags_invalid` (400),
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

In `registerMediaRoutes`, extend POST `/media` body forwarding:
```ts
return uploadMedia(body.file, {
  alt: ..., title: ..., caption: ...,
  folderId: typeof body.folderId === "string" ? body.folderId : undefined,
  tags: Array.isArray(body.tags) ? body.tags : undefined,
}, ctx.user?.id);
```
(Extend `UploadBody` type with `folderId?: unknown; tags?: unknown`.) PATCH `/media/:id` needs
NO change beyond the widened `mediaUpdateSchema`/`MediaMeta` — confirm it forwards the whole body.

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
Call `registerMediaFolderRoutes(router, deps)` at the END of `registerMediaRoutes`. Import the
folder-service fns + folder schemas at top of `mediaRoutes.ts`. **Route ordering caveat:**
register `/media/folders*` (static) BEFORE `/media/:id` if the router matches greedily —
VERIFY the router impl (`routes/index.ts` / router type) to ensure `/media/folders` is not
captured by `/media/:id` with `id="folders"`. If the router is order-sensitive, register folder
routes FIRST inside `registerMediaRoutes` (before the `/media/:id` group). Confirm by reading the
router matching logic before finalizing order.

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
  per-key, siblings survive, focal out-of-range → 400, unknown key → 4xx;
  (d) delete folder → assigned media survives with `folderId` null (200, not 404/cascade);
  (e) `/media/folders` not shadowed by `/media/:id` (GET returns folder list, not media_not_found).
  Shared-DB safety: unique slugs, per-test teardown, no cross-suite row-count coupling.
- **Vitest lane:** none (route wiring is Bun-runtime).

## Acceptance Criteria

1. Folder CRUD/reorder routes live under `/media/folders*`, registered WITHOUT editing
   `routes/index.ts`; static path not shadowed by `/media/:id`.
2. Media PATCH persists all new fields (reject-unknown 4xx; focal clamp/reject enforced).
3. All writes behind `media:write`, reads behind `media:read`; CSRF envelope intact.
4. Folder delete un-files media (never deletes). Error codes correct (404/409/400/413).
5. Bun route tests green; `lint:types` + root `tsc` green.
