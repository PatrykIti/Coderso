# TASK-059-06: Posts Data Backfill and Cutover
# FileName: TASK-059-06_Posts_Data_Backfill_and_Cutover.md

**Priority:** High  
**Category:** Migration/Operations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059-01, TASK-059-02  
**Status:** To Do

---

## Overview
Przeniesc historyczne posts z modelu `entries` do nowego `posts*` storage i wykonac kontrolowany cutover.

## Scope
1. Backfill danych:
   - rekordy posts,
   - revisions,
   - preview tokens,
   - metadata (SEO, featured media, tags/categories).
2. Idempotentny migrator (bez duplikowania przy ponownym uruchomieniu).
3. Strategia cutover:
   - etap `shadow-read` (walidacja zgodnosci),
   - etap `write-new/read-new`.
4. Rollback:
   - mozliwosc tymczasowego powrotu read path,
   - audyt raportu migracji.

## Files to Create / Change
- `core/services/posts/migration/postsBackfillService.ts` (new)
- `core/server/routes/internal/postsMigration.ts` (optional admin/internal trigger)
- `core/services/posts/migration/postsBackfillReport.ts` (new)
- `tests/integration/posts/posts-backfill.test.ts`

## Pseudocode
```ts
for (const legacyPost of listLegacyPostsFromEntries()) {
  const normalized = mapLegacyEntryToPost(legacyPost);
  upsertPostById(normalized.id, normalized);
  upsertPostRevisions(normalized.id, mapRevisions(legacyPost));
  upsertPostPreviewTokens(normalized.id, mapPreviewTokens(legacyPost));
}

report = buildBackfillReport({ total, inserted, updated, skipped, mismatches });
```

## Acceptance Criteria
1. Backfill mozna uruchamiac wielokrotnie bez duplikatow.
2. Migrator zachowuje `id`/`slug` i nie psuje URL preview/public.
3. Raport mismatchy jest czytelny i testowalny.
4. Cutover ma udokumentowany rollback playbook.

## Testing Requirements
- Integration:
  - backfill idempotency,
  - parity checks legacy vs new.
- Unit:
  - mapping helpers i raporty.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (cutover strategy)
- `_docs/_TASKS/README.md`
