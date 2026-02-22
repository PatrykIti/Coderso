# TASK-059-02: Posts Domain Service Extraction
# FileName: TASK-059-02_Posts_Domain_Service_Extraction.md

**Priority:** High  
**Category:** Services/Domain  
**Estimated Effort:** Large  
**Dependencies:** TASK-059-01  
**Status:** To Do

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
- `core/services/posts/postsService.ts` (new lub refactor z `content/postsService.ts`)
- `core/services/posts/postsValidation.ts` (new)
- `core/services/posts/postsPreviewService.ts` (optional split)
- `core/services/posts/postsRevisionsService.ts` (optional split)
- `tests/unit/posts/postsService.test.ts`
- `tests/unit/posts/postsRevisions.test.ts`
- `tests/unit/posts/postsValidation.test.ts`

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
