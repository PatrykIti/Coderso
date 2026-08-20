# TASK-580-03-L03: Detail Page V2 DB Backfill Migration
# FileName: TASK-580-03-L03-Detail-Page-V2-DB-Backfill-Migration.md

**Parent Subtask:** TASK-580-03
**Priority:** High
**Category:** Database / Migration
**Estimated Effort:** Large
**Dependencies:** TASK-580-03-L02
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Non-destructive SQL backfill converting stored v1
`detail_page_documents.current_document` and `published_document` jsonb to
schemaVersion 2 sections, mirroring `0061_custom_screen_v4_backfill.sql`
(define conversion functions → one `UPDATE ... WHERE` → drop functions).
`detail_page_revisions.document` rows are NOT converted (the L02 read adapter
handles them on restore). No columns are dropped or added; the schema snapshot
is unchanged, but full migration artifacts (SQL + `meta/*_snapshot.json` +
`meta/_journal.json`) are still required by AGENTS.md.

## Sub-Tasks

- [x] Allocate the next migration number by re-reading
  `core/db/migrations/meta/_journal.json` immediately before authoring
  (verify by max TAG, not idx: latest TAG is 0078 → allocate `0079`; confirm
  the live journal at implementation time). Merged as `0080` because TASK-493's
  `0079_hot_shadowcat` landed first in `feat/implementations`.
- [x] Author `core/db/migrations/0080_detail_page_v2_backfill.sql`:
  - `_coderso_detail_page_section_v2("block" jsonb)` — per-widget CASE over
    the 42-type map: hero/timeline/faq-accordion/cta-banner/feature-grid/
    testimonials/gallery-mosaic/grid-columns/rich-text-section/divider/
    spacer/content-list/posts-feed/listing-filters/entry-teaser/form-embed/
    contact+newsletter(with formId) → mapped section jsonb; navigation/footer
    → NULL (dropped); everything else → `custom` section + `legacy-widget`
    block (`legacyWidgetType` = original type, `data` = original `data` jsonb
    verbatim). Deterministic ids `<blockId>-<role>`, nulls stripped
    (`jsonb_strip_nulls`), missing ids → `md5(block::text)` fallback (0061
    pattern).
  - `_coderso_detail_page_binding_v2("binding" jsonb, "blocks" jsonb)` —
    binding remap mirroring the TS map (blockId → new block id, propPath →
    V2 prop path); targets of dropped/unmapped blocks → NULL (filtered out).
  - `_coderso_detail_page_document_v2("doc" jsonb)` — envelope copy with
    `schemaVersion = '2'`, `sections` from blocks, `bindings` remapped,
    `blocks` key removed.
  - ONE `UPDATE "detail_page_documents" SET current_document = ...,
    published_document = CASE WHEN published_document IS NULL THEN NULL
    ELSE ... END WHERE current_document->>'schemaVersion' IS DISTINCT FROM
    '2' OR published_document->>'schemaVersion' IS DISTINCT FROM '2';`
  - `DROP FUNCTION` for all three helpers at the end.
- [x] Generate `core/db/migrations/meta/0080_snapshot.json` + update
  `meta/_journal.json` (idx/tag entries) with the repo's migration generator
  (`bunx drizzle-kit generate` flow used by the repo; verify the exact
  command in the existing migration task evidence or `core/db/` scripts).
- [x] Document rollback/forward recovery in the migration header comment and
  in the leaf closeout: forward = read adapter covers missed rows; rollback =
  backup restore (pure data backfill, no DDL); idempotent WHERE clause allows
  safe re-runs; single UPDATE takes row locks only (no table rewrite);
  `detail_page_revisions` untouched so the drizzle `.for("update")` locks +
  native writer fence + `max(version)+1` versioning mechanism
  (`core/services/content/detailPageDocumentLifecycleMutation.ts:261,269,
  331,340,206`) is unaffected.
- [x] NEW DB test `tests/integration/detailPages/detailPageV2BackfillMigration
  .test.ts` (Bun lane; skips cleanly without `DATABASE_URL`): seeds v1 rows
  from the L02 fixture corpus, runs the migration functions, asserts output
  equals the TS-expected v2 fixtures (SQL/TS parity), verifies
  navigation/footer + dangling bindings dropped, placeholder data
  byte-identical, publishedDocument NULL handling, and idempotency (second
  run no-ops).

## Files To Change

| File | Required change |
|---|---|
| `core/db/migrations/0080_detail_page_v2_backfill.sql` | NEW backfill migration |
| `core/db/migrations/meta/0080_snapshot.json` | NEW snapshot |
| `core/db/migrations/meta/_journal.json` | journal update |
| `tests/integration/detailPages/detailPageV2BackfillMigration.test.ts` | NEW DB-backed migration test |
| `scripts/run-bun-lane.ts` | register the new suite in the curated Bun lane (if lane-curated) |
| `tests/README.md` | document `tests/integration/detailPages` ownership |

## Implementation Pseudocode

```sql
CREATE OR REPLACE FUNCTION "_coderso_detail_page_section_v2"("block" jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE "block" ->> 'type'
    WHEN 'hero' THEN jsonb_strip_nulls(jsonb_build_object(
      'id', COALESCE(NULLIF("block" ->> 'id', ''), 'block-' || md5("block"::text)),
      'type', 'hero',
      'name', COALESCE("block" ->> 'label', 'Hero'),
      'variant', CASE "block" ->> 'variant' WHEN 'split' THEN 'split' WHEN 'media-left' THEN 'split' ELSE 'centered' END,
      'layout', '{}'::jsonb, 'style', '{}'::jsonb, 'spacing', '{}'::jsonb,
      'visibility', '{"visible":true}'::jsonb,
      'blocks', jsonb_build_array(
        jsonb_build_object('id', (COALESCE(NULLIF("block" ->> 'id',''),'b') || '-heading'),
          'type', 'heading', 'props', jsonb_build_object('text', COALESCE("block"#>>'{data,headline}', '')),
          'visibility', '{"visible":true}'::jsonb),
        -- + text(body) / badge / button / image roles as in the TS map
      )
    ))
    WHEN 'navigation' THEN NULL
    WHEN 'footer' THEN NULL
    WHEN 'grid-columns' THEN /* content section + columns block + nested slot children */
    /* ... remaining mapped types ... */
    ELSE jsonb_build_object( /* legacy-widget placeholder */
      'id', COALESCE(NULLIF("block" ->> 'id', ''), 'block-' || md5("block"::text)),
      'type', 'custom', 'name', 'Legacy widget',
      'variant', 'default', 'layout', '{}'::jsonb, 'style', '{}'::jsonb,
      'spacing', '{}'::jsonb, 'visibility', '{"visible":true}'::jsonb,
      'blocks', jsonb_build_array(jsonb_build_object(
        'id', (COALESCE(NULLIF("block" ->> 'id',''),'b') || '-legacy'),
        'type', 'legacy-widget',
        'props', jsonb_build_object(
          'legacyWidgetType', COALESCE("block" ->> 'type', 'unknown'),
          'data', CASE WHEN jsonb_typeof("block" -> 'data') = 'object' THEN "block" -> 'data' ELSE '{}'::jsonb END),
        'visibility', '{"visible":true}'::jsonb)))
  END
$$;
-- + "_coderso_detail_page_binding_v2" + "_coderso_detail_page_document_v2" +
--   the single UPDATE over both document columns + DROP FUNCTIONs.
```

**Data flow:** migration functions read v1 `blocks`/`bindings` inside each
jsonb document → emit canonical v2 `sections`/`bindings` → `UPDATE` writes
back only rows whose `schemaVersion` is not `2` → functions dropped so no
runtime surface persists.

**Error handling:** conversion is total (unknown types → placeholder, missing
ids → md5 fallback); malformed jsonb rows are left untouched by the WHERE
guard and remain covered by the read adapter; the migration fails hard on SQL
errors only; no raw document bodies are logged.

**Regression-test shape:**

```ts
// tests/integration/detailPages/detailPageV2BackfillMigration.test.ts
test("backfill converts FormaDom-shaped v1 detail page to fixture-pinned v2", async () => {
  const id = await seedDetailPageV1(PROJECT_DETAIL_V1_FIXTURE);
  await runDetailPageV2BackfillFunctions();
  const row = await readDetailPage(id);
  expect(row.currentDocument.schemaVersion).toBe(2);
  expect(row.currentDocument).toEqual(PROJECT_DETAIL_V2_EXPECTED); // TS parity
  expect(row.currentDocument.blocks).toBeUndefined();
});
test("placeholder data survives byte-identically", ...);
test("navigation/footer blocks and their bindings are dropped", ...);
test("publishedDocument NULL stays NULL; second run is a no-op", ...);
```

**Validation commands:**

- `set -a && source .env && set +a` before DB tests.
- `bun test tests/integration/detailPages/detailPageV2BackfillMigration.test.ts`
- `bun run test:bun:lane` (curated lane, if registered)
- `bun --cwd core lint` + `bun --cwd core lint:types`
- `git diff --check`

## Security Contract

- **Endpoint visibility:** no endpoints; migration/DB execution only.
- **Auth model / RBAC / CSRF / rate limits:** n/a.
- **Validation:** migration output must pass the strict v2 normalizers
  (asserted in tests via `normalizeDetailPageDocumentForWrite`).
- **Anti-abuse:** no public write path.
- **Secret handling:** migration reports/tests log row ids and counts only;
  fixtures contain no secrets; `data` jsonb is copied, never rendered or
  logged.

## Documentation Updates Required

- `_docs/DATA_MODEL.md` — `detail_page_documents` v2 jsonb contract + backfill
  and rollback notes.
- Leaf closeout notes for TASK-580-03.

## Acceptance Criteria

1. Migration artifacts are complete (SQL + snapshot + journal) and the
   migration runs in a plain drizzle migration pass.
2. Every stored v1 current/published document converts to fixture-pinned v2
   output with deterministic ids; placeholders preserve widget data
   byte-identically; navigation/footer and dangling bindings are dropped.
3. No columns dropped; `detail_page_revisions` untouched; rollback/forward
   recovery documented.
4. SQL output is parity-tested against the TS conversion map on the shared
   fixture corpus.
