# TASK-059-06: Posts Data Backfill and Cutover
# FileName: TASK-059-06_Posts_Data_Backfill_and_Cutover.md

**Priority:** High  
**Category:** Migration/Operations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059-01, TASK-059-02  
**Status:** Done (2026-02-22)

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

## Security Contract
- **Visibility:** `internal` (`/admin/api/posts/migration/backfill`)
- **Auth path:** admin session + RBAC permission `settings:write`
- **Rate-limit bucket:** admin authenticated bucket (standard admin API policy)
- **Nonce/HMAC:** nie dotyczy (endpoint internal-only)
- **reCAPTCHA:** nie dotyczy (endpoint internal-only)
- **Internal mode:** tylko authenticated admin (session), bez public exposure

## Files Created / Changed
- `core/services/posts/migration/postsBackfillService.ts` (implemented)
- `core/services/posts/migration/postsBackfillReport.ts` (implemented)
- `core/server/routes/postsRoutes.ts` (added internal trigger endpoint)
- `core/server/validation/postSchemas.ts` (added backfill payload schema)
- `tests/integration/posts/posts-backfill.test.ts` (new)
- `tests/unit/posts/postsBackfillReport.test.ts` (new)
- `tests/integration/routes/postsRoutes.test.ts` (updated route contract)

## Final Pseudocode
```ts
for (const legacyPost of loadLegacyPosts({ slugs: ["post", "posts"], entryIds? })) {
  validateLegacyPayload();
  if (slugConflict || postNewerThanLegacy) {
    markSkippedWithMismatch();
    continue;
  }

  upsertPostById(legacyPost.id, mappedPayload);
  syncRevisions(legacyPost.id);
  syncPreviewTokens(legacyPost.id);
  syncTermAssignments(legacyPost.id);

  if (shadowRead) {
    compareLegacyVsPostParity();
    recordMismatches();
  }
}

return finalizeBackfillReport();
```

## Acceptance Criteria
1. Backfill mozna uruchamiac wielokrotnie bez duplikatow.
2. Migrator zachowuje `id`/`slug` i nie psuje URL preview/public.
3. Raport mismatchy jest czytelny i testowalny.
4. Cutover ma udokumentowany rollback playbook.

## Rollback Playbook
1. Legacy dane (`content_entries`, `content_revisions`, `preview_tokens`, `content_term_assignments`, `seo_documents target=entry`) pozostaja nienaruszone - backfill jest additive/idempotent.
2. Przed apply uruchomic dry-run:
   - `POST /admin/api/posts/migration/backfill` z `{ "dryRun": true }`.
3. Apply uruchamiac z shadow-read:
   - `{ "dryRun": false, "shadowRead": true }`.
4. W razie problemu produkcyjnego:
   - rollback deploymentu do buildu sprzed cutover read path (TASK-059-05),
   - pozostawienie danych backfill bez destrukcyjnych cleanupow,
   - poprawki i ponowny backfill scoped przez `entryIds`.

## Testing Requirements
- Integration:
  - backfill idempotency,
  - parity checks legacy vs new.
- Unit:
  - mapping helpers i raporty.

## Validation Executed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/posts/postsBackfillReport.test.ts tests/integration/posts/posts-backfill.test.ts tests/integration/routes/postsRoutes.test.ts`
  - Uwaga: testy DB (`posts-backfill`) sa auto-skip bez aktywnego `DATABASE_URL`.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (cutover strategy)
- `_docs/_TASKS/README.md`
- `_docs/CMS_API.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes
- Delivered idempotent backfill service for legacy posts (`entries -> posts`) with sync of:
  - revisions (`content_revisions -> post_revisions`),
  - preview tokens (`preview_tokens(content) -> post_preview_tokens`),
  - taxonomy assignments (`content_term_assignments -> post_term_assignments`),
  - SEO (`seo_documents target=entry -> posts.seo`).
- Added `shadowRead` parity checks and structured mismatch/failure report.
- Added internal admin trigger endpoint:
  - `POST /admin/api/posts/migration/backfill` (default `dryRun=true`).
