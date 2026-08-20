# TASK-580-03: Migrate Entry Detail Pages To PageV2
# FileName: TASK-580-03-Migrate-Entry-Detail-Pages-To-PageV2.md

**Parent Task:** TASK-580
**Priority:** High
**Category:** Pages / Migration / DB / Runtime
**Estimated Effort:** Very Large
**Dependencies:** TASK-580-01 + TASK-580-02
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

> **Changelog pin (family):** 1323. Only the family closure agent writes
> `_docs/_CHANGELOG/*` and `_docs/_TASKS/README.md`; this task touches neither.
> Before writing 1323, the closure agent must verify the 1309-1322
> reservations against the LIVE `_docs/_CHANGELOG/README.md` immediately
> before writing, and record the reservation rationale if absent.

---

## Overview

Entry detail pages are the last production-reachable surface that stores and
renders v1 `WidgetBlock[]` documents. Their document model is
`DetailPageBlock = WidgetBlock` (`core/services/content/detailPageTypes.ts:68`),
stored as `detail_page_documents.currentDocument/publishedDocument` jsonb
(`core/db/tables/pages.ts:101-117`), read through
`normalizeDetailPageDocument → normalizeWidgetBlocks`
(`core/services/content/detailPageSchema.ts:1-2,266-269`, which throws
`widget_unknown_type` → resolver catch → whole-page 404), and rendered through
`hydrateRuntimeBlocks` + `renderPublicPageRuntimeHtml`
(`core/server/publicEntryRender.tsx:326-338,466-468`). Admin authoring
(`DetailTemplateEditorPage.tsx` + `detailTemplateEditorModel.ts`) and the
assistant (`catalogFamilyBlueprint.ts:270-292`) still produce v1 blocks.

This task migrates the detail-page document to a V2 body: the envelope
(`schemaVersion/id/name/contentTypeId/contentTypeSlug/status/titlePattern/seo/
settings/bindings/related`) is kept and its `blocks: WidgetBlock[]` becomes
`sections: PageSectionV2[]` (schemaVersion 2). Widgets are converted by an
exhaustive widget→V2 conversion map; unmapped widget types become a new
read-only `legacy-widget` Page block that preserves the original widget data in
its props (TASK-468 `ScreenRuntimeLeafBlocks.tsx:620-638` precedent,
placeholder at `:633`). Stored
rows are converted by a non-destructive SQL backfill mirroring
`0061_custom_screen_v4_backfill.sql`; a TS read adapter keeps unconverted
revisions readable. Public render switches to
`preparePageRuntimeDocument` + `renderPublicPageV2RuntimeHtml`; the admin
detail-template editor and the assistant switch to V2 authoring. After this
task, the v1 kernel can be deleted by TASK-580-04.

- **Goal:** every detail-page document read/written is schemaVersion 2 with
  `sections[]`; public detail pages render through the Page V2 pipeline with
  byte-preserving legacy placeholders for unmigrated widgets; nothing in the
  stored v1 kernel remains required for detail pages.
- **Owning modules/services:**
  `core/services/content/detailPage{Types,Schema,BindingResolver,RuntimeResolver,
  DocumentService,RevisionService,DocumentLifecycleMutation}.*`,
  `core/server/publicEntryRender.tsx`,
  `core/admin/ui/content-types/DetailTemplate{EditorPage,BindingPanel}.tsx` +
  `detailTemplateEditorModel.ts`, `core/services/assistant/*`,
  `core/db/migrations/*`.
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md`,
  `_docs/DATA_MODEL.md`, `_docs/PAGE_MODEL.md`, `_docs/TESTING_STRATEGY.md`,
  `_docs/ARCHITECTURE.md`, `AGENTS.md` (DB/migration/cache/line-limit rules).
- **Out of scope:** deleting the v1 kernel/registry/validator
  (`core/widgets/**`), `hydrateRuntimeBlocks`, Widget Library, widget
  templates, v1 preview routes, `modulePackMatrix`, and `_docs/WIDGETS.md`
  tombstoning — those belong to TASK-580-01/02/04. No new endpoints, no DDL
  column drops, no public API changes.

## Target contract (decided)

1. **Stored model:** `DetailPageDocument` schemaVersion `2`.
   Envelope unchanged: `id, name, contentTypeId, contentTypeSlug, status,
   titlePattern, seo?, settings{template,layout}, bindings, related?`.
   `blocks: WidgetBlock[]` is REPLACED by `sections: PageSectionV2[]`.
   `settings.layout` stays (read-compat for old revisions and kit fixtures);
   the V2 render derives spacing from section styles and ignores page-level
   layout tokens (documented, not deleted).
2. **Placeholder block:** ONE new shared Page V2 block type `legacy-widget`
   (props `{ legacyWidgetType: string, data: Record<string, unknown> }`).
   Read-only: never editor-insertable, never assistant-emittable, renders a
   neutral placeholder; the original widget `data` is preserved verbatim in
   props (byte-identical jsonb). Unmapped widgets become a `custom` section
   containing one `legacy-widget` block.
3. **Conversion map** (exhaustive over the 42 registered widget types —
   verified via `type: "..."` in `core/widgets/core/*`):

   | Widget type | V2 target |
   |---|---|
   | `hero` | `hero` section: heading(`headline`), text(`body`), badge(`badge.label`), button(`primaryCta`), image(`media`) |
   | `timeline` | `timeline` section: text blocks per item |
   | `faq-accordion` | `faq` section: heading/text blocks per question |
   | `cta-banner` | `cta` section: heading/text + button(`primaryCta`) |
   | `feature-grid` | `feature-grid` section: heading/text header + card block per item (`title`/`text`) |
   | `testimonials` | `testimonials` section: card/quote blocks per item |
   | `gallery-mosaic` | `gallery` section: image blocks per media item |
   | `grid-columns` | `content` section + `columns` block; slot children nested |
   | `rich-text-section` | `content` section + heading (`titleBlock.title`) + text (sanitized `body.html`) |
   | `divider` | `content` section + `divider` block |
   | `spacer` | `content` section + `spacer` block |
   | `content-list` | `content` section + `collection` block (contentTypeId/queryId, limit clamp 1..24) |
   | `posts-feed` | `content` section + `collection` block (posts source) |
   | `listing-filters` | `content` section + `filters` block |
   | `entry-teaser` | `content` section + `card` block |
   | `form-embed` | `content` section + `embed` block |
   | `contact` / `newsletter` | `content` section + `form` block when a resolvable `formId` exists; else legacy placeholder |
   | `navigation`, `footer` | **DROP** with migration report note (site shell owns header/footer; the V2 render always shows the global shell) |
   | all other 22 types (`accordion`, `appointment-form`, `booking-calendar`, `compare-timeline`, `logo-cloud`, `pricing-plans`, `product-compare`, `product-gallery`, `product-table`, `screen-field-group`, `screen-field-value`, `screen-record-header`, `screen-two-column`, `search-box`, `section`, `split-layout`, `stack`, `stats-kpi`, `tabs`, `team`, `template-section`, `toggle-block`) | `custom` section + `legacy-widget` block, data preserved |

   Deterministic ids: section id = widget block id; block ids
   `<widgetId>-<role>` (roles `heading|text|badge|button|image|card-1..N|
   columns|divider|spacer|collection|form|embed|legacy`). One widget → one
   section (order-faithful, idempotent re-runs).
4. **Bindings:** `DetailPageBinding{id, blockId, propPath, source, fallback?,
   transform?, required?}` stays an envelope field. The conversion remaps
   `blockId` → new block id and `propPath` → the V2 block prop path using real
   V2 prop names (`heading/text.text`, `badge.text`, `button.label|href`,
   `card.title|text`, `image.src|alt`, ...). Bindings whose target was dropped
   (navigation/footer) or is unmappable are DELETED by the migration and
   counted in the report (a dangling binding currently 404s the whole page,
   so deletion is the fail-safe). At runtime the reworked
   `resolveDetailPageBlocks` clones the V2 sections and writes bound values
   into block props; `preparePageRuntimeDocument` then resolves
   collection/form/filters/embed block runtime data. Both mechanisms coexist.
5. **Normalizer split (write vs stored-read):**
   - `normalizeDetailPageDocumentForWrite`: strict schemaVersion 2 ONLY;
     v1 payload → `detail_page_legacy_v1_invalid`. Reject-unknown allowlist
     swaps `blocks` for `sections`.
   - `normalizeDetailPageDocumentForRead`: v2 → strict v2 path; v1 →
     converted through the SAME TS conversion map (read adapter, so
     un-backfilled `detail_page_revisions` keep restoring).
6. **DB backfill:** migration `0079_detail_page_v2_backfill.sql` (pattern
   `0061`): SQL functions `_coderso_detail_page_section_v2(jsonb)` +
   `_coderso_detail_page_document_v2(jsonb)` (envelope + sections + binding
   remap), one `UPDATE detail_page_documents` over `current_document` AND
   `published_document` WHERE `schemaVersion` is not `2`, then `DROP
   FUNCTION`. `detail_page_revisions.document` rows are NOT backfilled (read
   adapter covers them). No column drops. Forward recovery only (backup +
   idempotent WHERE clause); no revision rows are created, so the existing
   drizzle `.for("update")` locks at
   `detailPageDocumentLifecycleMutation.ts:261,269` + native writer fence at
   `:331,340` + `max(version)+1` at `:206` revision mechanism is untouched.
7. **Public render:** `publicEntryRender.tsx` detail-page branch assembles a
   render document `{schemaVersion:2, sections, settings:{template}}` from the
   detail envelope, runs the v2-aware binding resolver, then
   `preparePageRuntimeDocument` + `renderPublicPageV2RuntimeHtml`
   (`runtimeDataByBlockId`, `renderBodyScripts` for listing runtime).
   `cacheable`/`cacheMode` come from the prepared runtime;
   `blocksAllowSiteHtmlCache` usage is removed for detail pages (helper itself
   stays until 580-04). `resolveDetailPageRuntimeSeo` /
   `collectPrehydratedDetailBlockIds` are envelope/binding-based and stay.
   `publicSite.tsx` routes (`content-detail`, preview tokens) are unchanged.
8. **Admin editor:** `DetailTemplateEditorPage` drops
   `BlockList/BlockSettings/LibraryPanel/blockUtils/getWidgetRegistry` and
   becomes a minimal detail-owned V2 section/block editor on the neutral
   authoring chrome (`core/admin/ui/authoring/*`, TASK-468-03) using V2
   section templates (`pageSectionTemplates`) and the V2 block control
   registry as a consumer. `DetailTemplateBindingPanel` picks prop paths from
   V2 block prop keys (`pageBlockPropKeys`) instead of widget definitions.
   `DetailTemplateEditorPage.tsx` (1283 lines) MUST be split below 1000.
9. **Assistant:** `catalogFamilyBlueprint.ts:270-292` authors a v2 hero section
   (heading/text/badge/image blocks) with bindings targeting V2 block props.
   `pageWidgetPatch.ts` and `actionExecutorScreenOps.ts:204`
   (`normalizeAssistantPagePatchBlock`) stop accepting v1 blocks (retype to
   Page V2 / Screen V1 blocks as each surface requires; skip if 580-02 already
   removed the widget-template consumers). `actionExecutorCatalogReads.ts`
   verified for residual v1 catalog reads.
10. **Kit seeds:** `scripts/projekty-domow/content/projectDetail.ts` rewrites
    to schemaVersion 2 sections + remapped bindings in the same leaf as the
    strict write normalizer (kit installs go through
    `normalizeDetailPageDocument` and must not break).

## Sub-Tasks (land order)

| # | Leaf | Scope | Estimated Effort | Status |
|---|---|---|---|---|
| L01 | [Legacy-Widget Block Type In Shared Page V2 Contract](TASK-580-03-L01-Legacy-Widget-Block-Type-In-Shared-Page-V2-Contract.md) | narrow shared-contract addition: `legacy-widget` block type + normalizer + JSON schema + capabilities + renderer + facade | Medium | ✅ Done |
| L02 | [Detail Page V2 Contract Conversion Map And Read Write Adapters](TASK-580-03-L02-Detail-Page-V2-Contract-Conversion-Map-And-Read-Write-Adapters.md) | schemaVersion 2, conversion map, binding remap, write/stored-read normalizers, service + route validation, kit seed flip | Large | ✅ Done |
| L03 | [Detail Page V2 DB Backfill Migration](TASK-580-03-L03-Detail-Page-V2-DB-Backfill-Migration.md) | SQL backfill `0079` + snapshot + journal + DB tests | Large | ✅ Done |
| L04 | [Public Detail Page V2 Render Cutover](TASK-580-03-L04-Public-Detail-Page-V2-Render-Cutover.md) | publicEntryRender → V2 pipeline, cache contract, kit runtime tests | Large | ✅ Done |
| L05 | [Admin Detail Template Editor V2 Cutover](TASK-580-03-L05-Admin-Detail-Template-Editor-V2-Cutover.md) | detail-owned V2 editor + binding panel + model, file split <1000 lines | Very Large | ✅ Done |
| L06 | [Assistant Detail Page V2 Authoring Cutover](TASK-580-03-L06-Assistant-Detail-Page-V2-Authoring-Cutover.md) | blueprints + screen ops + pageWidgetPatch + catalog reads | Medium | ✅ Done |
| L07 | [Docs Final Validation And Runtime Smoke](TASK-580-03-L07-Docs-Final-Validation-And-Runtime-Smoke.md) | docs updates + ≥5 runtime smoke scenarios + final combined gates | Medium | ✅ Done |

Land order: **L01 → L02 → L03 → L04 → L05 → L06 → L07.** L03 must not land
before L02 (fixtures pinned by the conversion map). L04 may not flip the
public render before L01+L02 exist.

## Collision guards (parallel streams)

S6-580-03 single-writer ownership (forbidden to other streams while this task
is open): `core/services/content/detailPage*.*`,
`core/server/publicEntryRender.tsx`, `core/server/publicSiteEntryRuntime.tsx`,
`core/admin/ui/content-types/DetailTemplate*.*`,
`core/admin/services/detailPagesClient.ts`,
`core/services/assistant/{catalogFamilyBlueprint,actionExecutorScreenOps,
pageWidgetPatch}.ts`, `scripts/projekty-domow/content/projectDetail.ts`,
`core/db/migrations/0079*` + `core/db/migrations/meta/*` for that idx, and the
touched detail-page/kit tests.

Cross-stream seam (S3 owns the Page V2 model/renderer files): L01 makes ONE
narrow coordinated addition in `core/services/pages/{pageDocumentV2Types.ts,
pageBlockNormalizerV2.ts, pageBlockJsonSchemaV2.ts, pageDocumentV2Contract.ts,
pageRendererV2.tsx, pageDocumentV2.ts}` plus a NEW
`core/services/pages/legacyWidgetPlaceholder.tsx`. L04 may make one narrow
update in `core/services/pages/pageTemplateBoundary.ts` (remove `detail-page`
from the legacy surface set). S6 MUST NOT touch any other
`core/services/pages/*` or `core/admin/ui/pages/editor*` file. If TASK-539
(S3) is actively editing `pageRendererV2.tsx`, the orchestrator sequences L01
after 539 lands or coordinates a single-writer handoff; no silent concurrent
edits. Verified 2026-08-19 at contract-audit time: the S3 worktree in this
shared repo carries only workflow/task-doc files; no `pageRendererV2.tsx` or
other `core/services/pages/*` edits are present today.

Forbidden to this task (other streams own them): `core/widgets/**`,
`core/site/pageRuntimeV2.tsx`, `core/templates/*`, `core/admin/ui/pages/
editor/*` and `builder/*` (except removing the detail editor's imports),
`_docs/_TASKS/README.md`, `_docs/_CHANGELOG/*`.

## Security Contract

- **Endpoint visibility:** internal admin only; the existing
  `core/server/routes/detailPageRoutes.ts` surface (list/get/create/update/
  delete/preview/publish/unpublish/autosave/revisions) is unchanged — no new
  endpoints, JSONB-only.
- **Auth model:** authenticated admin session (unchanged).
- **RBAC:** `content:read` / `content:write` / `content:publish` exactly as
  today; public render is anonymous read with the existing entry visibility
  gates (password/gating bypass semantics unchanged).
- **CSRF:** required on all admin writes (existing middleware; unchanged).
- **Rate-limit bucket:** existing admin/public buckets; no new buckets.
- **Validation:** strict reject-unknown on write at document, section, block,
  binding, and related-source levels; `legacy-widget` props allow ONLY
  `legacyWidgetType` (bounded string) + `data` (plain JSON object, size-bounded
  by the jsonb column; prototype-polluting keys `__proto__/constructor/
  prototype` rejected, `dangerouslySetInnerHTML/innerHTML/outerHTML/srcDoc/
  script` segments rejected as today).
- **Anti-abuse:** no public write path added; preview tokens and form/booking
  anti-abuse flows unchanged.
- **Secret handling:** no secrets in fixtures/snapshots/logs; migration
  reports log row ids, counts, and error codes only (never document bodies);
  `legacy-widget` placeholder renders only the widget TYPE label, never the
  raw `data`; the existing `secretLikePattern` guards stay in force.

## Testing Requirements

- `bun --cwd core lint` + `bun --cwd core lint:types` after every leaf.
- Targeted lanes per leaf (see each leaf's own list); representative globs:
  - `bun test tests/unit/content/detailPage*.test.ts` (Bun-owned:
    runtimeResolver/documentService/revisionService/lifecycleMutation;
    schema/bindingResolver live in the Vitest lane)
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/content/detailPageSchema.test.ts tests/vitest/content/detailPageBindingResolver.test.ts tests/vitest/content/detailPageV2Conversion.test.ts`
  - `bun test tests/integration/routes/detailPages.test.ts` and
    the new `tests/integration/detailPages/detailPageV2BackfillMigration.test.ts`
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx tests/vitest/ui/detail-template-editor.test.tsx`
- DB tests only when `DATABASE_URL` is reachable; load env first with
  `set -a && source .env && set +a`.
- L07 runs the combined family gates (deferred per parallel-stream rules):
  `bun run test`, `bun run precommit:check`, `bun run gates:coderso`, plus the
  runtime smoke (≥5 scenarios, `playwright-cli -s=wf58003smoke`).
- `git diff --check`; `bun run precommit` before any manual commit.
- Every touched production module and test file ≤1000 lines after the leaf
  closes (line-count check is a hard gate; `DetailTemplateEditorPage.tsx` split
  is mandatory).

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` — detail-page document model (sections body,
  schemaVersion 2, binding semantics).
- `_docs/DATA_MODEL.md` — `detail_page_documents` jsonb contract + backfill
  note.
- `_docs/PAGE_MODEL.md` — new `legacy-widget` block type (read-only, migration-
  only) and the detail-page body rule (remove the "retained widget detail
  rows" claim).
- `_docs/ARCHITECTURE.md` — detail-page V2 runtime path + placeholder contract.
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` — only if a cache key or
  owner changes (expected: none; verify in L05/L07).
- `_docs/WIDGETS.md` tombstoning stays with TASK-580-04; L07 adds only the
  cross-reference note if a claim would otherwise contradict.
- `_docs/_CHANGELOG/*` + `_docs/_TASKS/README.md` — family closure agent only
  (changelog pin 1323).

## Acceptance Criteria

1. `normalizeDetailPageDocumentForWrite` accepts ONLY schemaVersion 2
   `sections[]` documents (v1 payloads fail closed with
   `detail_page_legacy_v1_invalid`), and round-trip persistence tests cover
   every allowlist key.
2. Stored v1 rows (FormaDom kit seed shape: hero/grid-columns/feature-grid/
   cta-banner/rich-text-section) convert deterministically; unknown types
   become `legacy-widget` placeholders that render read-only and preserve the
   widget data byte-identically.
3. Migration `0079` ships complete artifacts (SQL + snapshot + journal),
   converts `current_document` AND `published_document`, drops no columns,
   and documents rollback/forward recovery.
4. Public detail pages and detail-page previews render through
   `preparePageRuntimeDocument` + `renderPublicPageV2RuntimeHtml` with correct
   cache modes; no `hydrateRuntimeBlocks`/`renderPublicPageRuntimeHtml` usage
   remains on the detail path.
5. The admin detail-template editor and binding panel author V2 sections/
   blocks only; the assistant and kit seeds emit V2 documents.
6. Runtime smoke ≥5 scenarios (converted public detail page, preview token,
   editor round-trip, placeholder render, assistant-generated detail page)
   passes with 0 console errors, light+dark.
