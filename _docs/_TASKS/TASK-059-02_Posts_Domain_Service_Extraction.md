# TASK-059-02: Posts Domain Service Extraction
# FileName: TASK-059-02_Posts_Domain_Service_Extraction.md

**Priority:** High  
**Category:** Services/Domain  
**Estimated Effort:** Large  
**Dependencies:** TASK-059-01  
**Status:** Done (2026-02-22)

---

## Overview
Wyodrebnic posts do osobnej warstwy domenowej, bez wywolywania `entries`/`content-types` dla CRUD, autosave, revisions, publish i preview.

## Scope
1. Wdrozyc nowy posts service oparty o tabele `posts*`.
2. Przeniesc logike:
   - create/update/delete/duplicate,
   - autosave i revisions dedupe,
   - publish/unpublish/schedule,
   - preview token lifecycle.
3. Utrzymac kontrakty payloadow zgodne z obecnym UI (minimalny breaking change).
4. Usunac runtime dependency na `ensurePostContentType`.

## Files to Create / Change
- `core/services/content/postsService.ts` (refactor)
- `core/server/routes/postsRoutes.ts`
- `tests/unit/content/postsService.test.ts`
- `tests/integration/posts/posts-revisions-flow.test.ts`
- `tests/integration/routes/postsRoutes.test.ts`

## Pseudocode
```ts
export async function createPost(input, actorId) {
  const normalized = normalizePostInput(input);
  assertUniqueSlug(normalized.slug);
  return insertPost({
    ...normalized,
    authorId: actorId,
    status: "draft"
  });
}

export async function autosavePost(id, patch, actorId) {
  const current = await getPost(id);
  const next = applyPatch(current, patch);
  const snapshot = buildRevisionSnapshot(next);
  const reusedRevision = await dedupeLastRevision(id, snapshot);
  if (!reusedRevision) await createRevision(id, snapshot, actorId, "autosave");
  await updatePostDraft(id, next);
  return { post: next, reusedRevision };
}
```

## Acceptance Criteria
1. Posts service nie wymaga `content_entries` ani `content_types`.
2. Revisions i autosave zachowuja obecne UX semantics.
3. Publish/preview flow dziala na nowych tabelach.
4. Unit i integration tests dla service przechodza.

## Testing Requirements
- Unit:
  - normalization,
  - revision dedupe,
  - slug uniqueness.
- Integration:
  - CRUD + publish + autosave + restore.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

## Completion Notes (2026-02-22)
1. Reworked `core/services/content/postsService.ts` to use dedicated posts tables only:
   - removed CRUD/revision/metadata dependence on `entryService` and `typeService`,
   - reads/writes now target `posts`, `post_revisions`, `post_term_assignments`, `post_preview_tokens`.
2. Preserved admin contract compatibility:
   - same exported API surface (`create/update/delete/duplicate/autosave/revisions/restore/publish/preview`),
   - retained `typeId` in response shape (`\"post\"`) for UI/client compatibility.
3. Implemented taxonomy mapping on post-owned assignments:
   - validates category/tag term kinds,
   - updates `tags` from assigned tag terms when taxonomy payload is provided.
4. Updated route error mapping:
   - `post_slug_conflict` now maps to 409 response for `/posts` mutations.
5. Validation executed:
   - `bun --cwd core lint`
   - `bun --cwd core lint:types`
   - `bun test tests/unit/content/postsService.test.ts tests/integration/posts/posts-revisions-flow.test.ts tests/integration/routes/postsRoutes.test.ts tests/unit/admin/postsClient.test.ts`
