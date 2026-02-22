# TASK-059-03: Posts Admin API Decoupling
# FileName: TASK-059-03_Posts_Admin_API_Decoupling.md

**Priority:** High  
**Category:** Core/API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059-02  
**Status:** To Do

---

## Overview
Przepiac `/admin/api/posts*` na nowy, niezalezny posts service i usunac API-level dependency na `entries`.

## Security Contract
- **Visibility:** `internal`
- **Auth path:** admin session (`requireAuth`) + RBAC (`content:read`, `content:write`)
- **Rate-limit bucket:** `admin_read` / `admin_write`
- **CSRF:** wymagany dla mutacji (`POST/PUT/PATCH/DELETE`)
- **Public exposure:** brak nowych publicznych endpointow

## Scope
1. Endpointy list/detail/create/update/delete/publish/unpublish/duplicate.
2. Endpointy autosave/revisions/restore/preview token.
3. Error mapping:
   - `post_not_found`,
   - `post_slug_conflict`,
   - `post_revision_not_found`,
   - `post_validation_failed`.
4. Zachowac zgodny payload dla obecnego klienta admin (`postsClient`).

## Files to Create / Change
- `core/server/routes/posts.ts`
- `core/server/router.ts` (jesli wymagane)
- `core/server/validation/postSchemas.ts`
- `core/services/posts/postsService.ts`
- `tests/integration/posts/posts-api.test.ts`
- `tests/unit/admin/postsClient.test.ts` (adjust only if contract changes)

## Pseudocode
```ts
router.get("/posts", requireAuth, requirePermission("content:read"), async (ctx) => {
  return json(await listPosts());
});

router.post("/posts/:id/publish", requireAuth, requirePermission("content:write"), requireCsrf, async (ctx) => {
  return json(await publishPost(ctx.params.id, ctx.actor.id));
});
```

## Acceptance Criteria
1. `/admin/api/posts*` dziala bez warstwy entries/content-types.
2. RBAC/CSRF/rate-limit pozostaja zgodne z obecna polityka.
3. API tests pokrywaja wszystkie endpointy posts.
4. Brak regresji w klientach admin.

## Testing Requirements
- Integration:
  - wszystkie `posts` routes (happy + error paths),
  - auth/rbac/csrf enforcement.
- Unit:
  - schema validation i error mapping.

## Documentation Updates Required
- `_docs/API.md` (jesli istnieje mapa endpointow)
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
