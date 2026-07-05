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
  NaN/non-number focal, NOT for out-of-range, which is CLAMPED not rejected), `media_tags_invalid` (400).
  **`media_focal_invalid` is SCHEMA-SHADOWED on the HTTP path (defense-in-depth backstop only):**
  512-02 §C declares `focalX/focalY: {type:["number","null"]}` and `validate(mediaUpdateSchema, ...)`
  runs FIRST (mediaRoutes.ts:159) before `updateMedia` (line 161), so any non-number focal is
  rejected as `validation_error` (400) at the edge, and JSON cannot express NaN — the service
  `media_focal_invalid` throw never fires via HTTP. Like `media_quota_exceeded` below, KEEP the
  mapping (correct service-layer backstop) but do NOT write an HTTP test asserting the specific
  `media_focal_invalid` code; that code is exercised only by the 512-02 service unit test
  (`tests/unit/media/mediaMeta.test.ts`, direct `normalizeMediaMeta` call). Test (c) here asserts
  HTTP 400 / `validation_error` for the non-number focal.
  **`media_tags_invalid` is SCHEMA-SHADOWED on the HTTP path too (same defense-in-depth pattern):**
  512-02 §C declares `tags: {type:"array", items:{type:"string"}}` (validated FIRST at
  mediaRoutes.ts:159), and 512-02 §A throws `media_tags_invalid` ONLY for a non-array value
  (over-length/over-count is CLAMPED/truncated, not rejected — §A DECISION). A non-array `tags` is
  therefore rejected as `validation_error` (400) at the edge before `updateMedia` runs, so the
  service `media_tags_invalid` throw never fires via HTTP. Like `media_focal_invalid`, KEEP the
  mapping (correct service-layer backstop) but do NOT write an HTTP test asserting the specific
  `media_tags_invalid` code — it is exercised only by the 512-02 service unit test
  (`tests/unit/media/mediaMeta.test.ts`, direct `normalizeMediaMeta` call with a non-array).
  (`media_folder_depth_exceeded` is thrown by 512-02's `MAX_DEPTH = 5` cap — it MUST be in this
  closed set or an over-depth create/patch bubbles as a generic 500 instead of 400.)
- **`media_quota_exceeded` (413) — FORWARD-COMPAT / INERT (no producer in this series):** add the
  case for completeness, but there is **NO throw site** in TASK-512. 512-02 §"Quota enforcement
  DECISION" (line 168-172) makes quota **display-only by default** — `uploadMedia` does NOT
  auto-reject unless a future `storage.quota.enforce` flag is set, and 512-03 leaves POST `/media`
  UNCHANGED. So this case only becomes reachable once hard-enforce lands. It is **intentionally
  untested** here (test requirements (a)-(f) correctly assert no 413). An implementer should NOT
  hunt for a nonexistent throw site or write an unpassable 413 test. (Adding the mapping now is
  cheap and avoids a future generic-500 leak when enforcement is enabled; guard the line with a
  `// forward-compat: no producer until storage.quota.enforce` comment.)
- `routes/index.ts:62` calls `registerMediaRoutes(router, {...})` — DO NOT edit; folder routes
  register from inside `registerMediaRoutes`.
- RBAC: `requirePermission("media:read")` / `"media:write")` — buckets defined at
  `core/services/admin/permissionsCatalog.ts:67` (`media:read`) / `:72` (`media:write`). NO new
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
> Consequence for 512-02: 512-02 §A keeps `uploadMedia` **alt/title/caption-only** (it is explicitly
> NOT extended with `folderId`/`tags`), so there is no upload-path forwarding to reconcile and
> 512-03 does not depend on any such params. Client flow (512-04/05)
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
  (404/409/400) via `mapMediaError`; unmapped errors bubble as generic (no internal leak). The
  `media_quota_exceeded → 413` case is present but **forward-compat/inert** (no producer in this
  series — see Grounded anchors); it activates only when the future `storage.quota.enforce` flag
  lands.
- **Folder delete never cascade-deletes media** (`onDelete:set null`, enforced 512-01/02).
- **Quota:** default install = display-only (no reject); `uploadMedia` does NOT throw
  `media_quota_exceeded` in this series (512-02 decision). The `→ 413` mapping is pre-wired for the
  future `storage.quota.enforce` flag, but with enforcement off there is no producer and no 413 is
  ever emitted (intentionally untested here).
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
  assert 400 for out-of-range), a non-number focal (e.g. `focalX:"nope"`) → **HTTP 400 with code
  `validation_error`** (schema-rejected at the edge by `mediaUpdateSchema`'s
  `focalX/focalY: {type:["number","null"]}` — do NOT assert code `media_focal_invalid` here: that
  service backstop is schema-shadowed on the HTTP path, see Grounded anchors, and JSON cannot express
  NaN; the `media_focal_invalid` code is asserted only in the 512-02 service unit test
  `tests/unit/media/mediaMeta.test.ts`, calling `normalizeMediaMeta` directly), unknown key → 4xx;
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
