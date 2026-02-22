# TASK-059-05: Posts Runtime, Listings, and Search Source Cutover
# FileName: TASK-059-05_Posts_Runtime_Listings_Search_Cutover.md

**Priority:** High  
**Category:** Runtime/Query Engine  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059-02, TASK-059-03  
**Status:** To Do

---

## Overview
Przepiac publiczny runtime postow oraz source `posts` w listings/search tak, aby czytal dedykowane tabele `posts*`, nie `entries`.

## Security Contract
- **Visibility:** mixed
- **Admin endpoints:** `internal`, bez zmian auth/rbac
- **Public read endpoints:** bez zmian kontraktu URL, nadal `public_read` bucket
- **Public write:** brak nowych endpointow write w tym tasku
- **Nonce/HMAC/reCAPTCHA:** nie dotyczy (read-only scope)

## Scope
1. Public post resolver:
   - detail i preview oparty o nowe posts service.
2. Listings source `posts`:
   - query execution na nowej tabeli posts.
3. Search source `posts`:
   - indeks i wyszukiwanie title/slug/excerpt z nowego modelu.
4. Widget/runtime binding:
   - `contentList`, `entryTeaser`, `search-box` i `listing-filters` zachowuja kompatybilny output shape.

## Files to Create / Change
- `core/services/content/queryBuilderService.ts`
- `core/services/content/listingExecutionService.ts` (lub analog)
- `core/services/search/searchIndexService.ts`
- `core/services/site/publicPostRenderer.ts` / `publicRenderer.ts`
- `core/server/routes/public.ts` (preview/detail wiring)
- `tests/unit/content/queryBuilderService.test.ts`
- `tests/unit/site/publicRenderer.test.tsx`
- `tests/integration/posts/posts-runtime-flow.test.ts`

## Pseudocode
```ts
if (source === "posts") {
  const rows = await db.select().from(posts).where(applyFilters(query));
  return mapPostsToListingRows(rows);
}

resolvePublicPostBySlug(slug, previewToken?) {
  return postsService.getPublicPostBySlug(slug, { previewToken });
}
```

## Acceptance Criteria
1. Runtime posts detail/preview dziala bez `entries`.
2. Listings/search `source=posts` zwraca poprawne wyniki z nowego storage.
3. Widget payload shape pozostaje kompatybilny.
4. Testy runtime/listing/search przechodza.

## Testing Requirements
- Unit:
  - query source mapping dla posts.
- Integration:
  - public post detail + preview,
  - listings/search with posts source.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
