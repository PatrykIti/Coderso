# TASK-580-03-L06: Assistant Detail Page V2 Authoring Cutover
# FileName: TASK-580-03-L06-Assistant-Detail-Page-V2-Authoring-Cutover.md

**Parent Subtask:** TASK-580-03
**Priority:** High
**Category:** Assistant / Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-580-03-L02
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Stop the assistant from authoring v1 `WidgetBlock[]` detail-page documents and
emit schemaVersion 2 sections/blocks instead. The blueprint that creates new
detail pages (`catalogFamilyBlueprint.ts:270-292`, hero + bindings) becomes a
v2 hero section (heading/text/badge/image blocks) with bindings targeting V2
block props. The screen/kit patch helpers that still normalize v1 blocks
(`actionExecutorScreenOps.ts:16-18,204`, `pageWidgetPatch.ts:1`) are retyped
to their actual surfaces (Screen V1 blocks for screens; Page V2 blocks where
the patch semantics survive) or removed if TASK-580-02 already deleted their
widget-template consumers. Catalog read paths are verified for residual v1
detail-page reads.

## Sub-Tasks

- [x] `catalogFamilyBlueprint.ts` — the detail-page document builder emits:
  `schemaVersion: 2`, `settings: { template: "detail", layout: {} }`,
  `sections: [hero section]` (deterministic ids, e.g.
  `<key>-detail-hero` / `-heading` / `-text` / `-badge` / `-image`), and
  `bindings` rewritten to `{ blockId: "<key>-detail-hero-heading", propPath:
  "text", source: entry-field title, transform: "text", required: true }`
  (reuse the same role map as L02 — import from `detailPageV2Conversion.ts`,
  never duplicate the map).
- [x] `actionExecutorScreenOps.ts:204` `normalizeAssistantPagePatchBlock` —
  screens already use `ScreenBlockV1`; verify whether the v1
  `normalizeWidgetBlock` call is still needed for legacy screen data (if yes,
  keep as a narrow screen-compat path; if the consumer
  `actionExecutorWidgetsSiteKit.ts:381` was removed by 580-02, delete the
  helper with the leaf). Detail-page patches must NOT flow through this
  helper.
- [x] `pageWidgetPatch.ts` — if its only consumer is the widget-template kit
  path removed by 580-02, delete the file (record in closeout); otherwise
  retype `blocks` to `PageBlockV2[]` with a V2 prop-path patch and move it out
  of the widget namespace. No new v1 `WidgetBlock` imports.
- [x] `actionExecutorService.ts` — the detail-page upsert path
  (`getDetailPageDocument`/`prepareDetailPageDocumentUpsert`/
  `upsertDetailPageDocument`, `:29-34`) needs no signature change; verify the
  strict v2 write normalizer is the only gate and that planner/executor error
  messages surface `detail_page_legacy_v1_invalid` sensibly.
- [x] `actionExecutorCatalogReads.ts` — grep for `blocks`/`WidgetBlock`
  reads of detail documents and rewire any to `sections`; verify catalog
  summaries (`adminContextCatalogs.ts`) do not serialize v1 blocks.
- [x] Terminal deletion (owned by this leaf): delete
  `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts` +
  `blueprintPageSectionTypes.ts` +
  `tests/vitest/assistant/blueprint-page-section-library.test.ts` — blueprint
  detail-page authoring is V2 after this leaf, so these Page-Section-library
  v1 contracts have no surviving consumer. Cross-family note: TASK-580-02
  only strips the module-pack matrix gating around these files; TASK-580-01
  does not touch them. Orphan grep must cover `tests/` too.
- [x] Tests: update `tests/unit/assistant/*` + `tests/vitest/assistant/*`
  blueprint assertions to expect v2 sections/bindings; keep dry-run/undo and
  operation-policy suites green; add a test that an assistant-emitted v1
  detail document is REJECTED on write with `detail_page_legacy_v1_invalid`.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/blueprints/catalogFamilyBlueprint.ts` | v2 detail-page builder |
| `core/services/assistant/actionExecutorScreenOps.ts` | narrow/retype screen patch block normalization |
| `core/services/assistant/pageWidgetPatch.ts` | retype to V2 or delete (per 580-02 outcome) |
| `core/services/assistant/actionExecutorService.ts` | verify only (error surfaces) |
| `core/services/assistant/actionExecutorCatalogReads.ts` | rewire residual v1 reads |
| `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts` | DELETE (terminal; L06 owns) |
| `core/services/assistant/blueprints/blueprintPageSectionTypes.ts` | DELETE (terminal; L06 owns) |
| `tests/vitest/assistant/blueprint-page-section-library.test.ts` | DELETE (terminal; L06 owns) |
| `tests/unit/assistant/actionExecutorListingsAndWidgets.test.ts` + `tests/vitest/assistant/*` | V2 assertions |

## Implementation Pseudocode

```ts
// catalogFamilyBlueprint.ts — v2 detail-page seed
const heroSectionId = `${preset.key}-detail-hero`;
const heroHeadingId = `${heroSectionId}-heading`;
const heroTextId = `${heroSectionId}-text`;
const sections: PageSectionV2[] = [{
  id: heroSectionId,
  type: "hero",
  name: "Hero",
  variant: hasCoverImage ? "split" : "centered",
  layout: {}, style: {}, spacing: {}, visibility: { visible: true },
  blocks: [
    { id: heroHeadingId, type: "heading", props: { text: preset.contentTypeName },
      visibility: { visible: true } },
    { id: heroTextId, type: "text", props: { text: preset.introBody },
      visibility: { visible: true } },
    // + optional image block when hasCoverImage
  ],
}];
const bindings: DetailPageBinding[] = [{
  id: `${preset.key}-detail-title`,
  blockId: heroHeadingId,
  propPath: "text",
  source: { kind: "entry-field", field: "title" },
  transform: "text",
  required: true,
}];
```

**Data flow:** blueprint → v2 sections/bindings (ids shared with the L02 role
map) → action plan → `upsertDetailPageDocument` → strict v2 write normalizer
→ stored v2 doc → public render (L04). No v1 registry/validator calls remain
in any assistant detail-page path.

**Error handling:** v1 payloads from any planner output fail closed at the
service boundary (`detail_page_legacy_v1_invalid`) with a machine-readable
action result; screen-patch helpers keep their own `ScreenBlockV1` contract
and never accept v1 detail-page blocks; dry-run/undo semantics unchanged.

**Regression-test shape:**

```ts
describe("assistant detail-page authoring v2", () => {
  it("blueprint emits v2 hero section + remapped bindings", () => {
    const doc = buildCatalogFamilyDetailPage(preset);
    expect(doc.schemaVersion).toBe(2);
    expect(doc.sections[0].type).toBe("hero");
    expect(doc.bindings[0]).toMatchObject({ blockId: `${preset.key}-detail-hero-heading`, propPath: "text" });
  });
  it("v1-shaped assistant documents are rejected on write", async () => {
    await expect(upsertDetailPageDocument({ document: V1_FIXTURE })).rejects
      .toThrowError(/legacy_v1/);
  });
  it("dry-run and undo round-trip a detail-page create with v2 sections", ...);
});
```

**Validation commands:**

- `bun --cwd core lint:types` + `bun --cwd core lint`
- `bun test tests/unit/assistant/actionExecutorListingsAndWidgets.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/assistant/`
- `bun test tests/integration/routes/assistant-routes.test.ts` (if present)
- `git diff --check`

## Security Contract

- **Endpoint visibility:** internal admin only (assistant action execution;
  no public write path).
- **Auth model:** authenticated admin session; existing assistant action
  policy (`operationPolicy/*`) unchanged.
- **CSRF:** required on admin writes (existing).
- **Rate-limit bucket:** existing admin buckets.
- **Validation:** strict reject-unknown v2 payloads; v1 → fail closed.
- **Anti-abuse:** no public write path; planner/executor remain
  dry-run-capable and auditable.
- **Secret handling:** no secrets in blueprint fixtures or assistant
  payloads; catalog summaries serialize section/block metadata only.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` — detail-page action payload shape (if it
  documents blocks).

## Acceptance Criteria

1. No assistant path imports `core/widgets/*` for detail-page authoring.
2. Blueprints emit v2 sections with remapped bindings; v1 payloads fail
   closed on write.
3. Screen-patch helpers keep their own contract; widget-template patch helpers
   are removed or V2-retyped per the 580-02 outcome.
4. Assistant suites pass with V2 assertions (no v1-widget fixture remains).
