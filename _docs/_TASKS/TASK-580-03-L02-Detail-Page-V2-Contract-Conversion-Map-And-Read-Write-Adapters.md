# TASK-580-03-L02: Detail Page V2 Contract Conversion Map And Read Write Adapters
# FileName: TASK-580-03-L02-Detail-Page-V2-Contract-Conversion-Map-And-Read-Write-Adapters.md

**Parent Subtask:** TASK-580-03
**Priority:** High
**Category:** Pages / Content Modeling / Migration
**Estimated Effort:** Large
**Dependencies:** TASK-580-03-L01
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Cut the detail-page document contract over to schemaVersion 2 with a
`sections: PageSectionV2[]` body. This leaf owns the domain contract: the v2
types, the exhaustive widget→V2 conversion map (the single canonical TS
implementation reused by the read adapter, the SQL backfill parity fixtures,
and the editor compatibility tests), the binding remap, the write/stored-read
normalizer split, and the service/route updates. Kit seeds flip to v2 in the
same change so the strict write normalizer never breaks a kit install.

> **L02/L04 boundary (decided; do not rediscover):** this leaf KEEPS
> `detailPageRuntimeResolver` returning `{ document, blocks }`. `blocks`
> becomes a transitional alias over the converted v2 sections (explicit cast +
> comment `// transitional; removed in L04`) so the per-leaf
> `bun --cwd core lint:types` gate stays green without touching L04-owned
> consumers. L04 flips the resolver return and the
> `publicEntryRender.tsx:326/468` consumers to sections-only. Do not "fix" this
> alias in L02.

## Sub-Tasks

- [x] `detailPageTypes.ts`: `DetailPageSchemaVersion = 2`; replace
  `blocks: DetailPageBlock[]` with `sections: PageSectionV2[]`; add
  `detail_page_legacy_v1_invalid` to the error vocabulary; keep
  `DetailPageBinding`, `DetailPageSeo`, `DetailPageSettings`,
  `DetailPageRelatedSource` unchanged (types import `PageSectionV2` from the
  `pageDocumentV2` facade, NOT from `widgets/types`).
- [x] NEW `core/services/content/detailPageV2Conversion.ts`: the canonical
  conversion map (see parent table) as pure functions (no DB/runtime imports):
  - `convertWidgetBlocksToV2Sections(blocks: WidgetBlock[]): PageSectionV2[]`
  - `convertDetailPageBindingsToV2(bindings, oldBlocks, converted): { bindings, dropped: BindingDropReport[] }`
  - `convertDetailPageDocumentV1ToV2(doc: DetailPageDocumentV1): DetailPageDocument`
  - `buildDetailPageRenderDocument(doc): PageDocumentV2` (envelope → render doc)
  - `WIDGET_TO_V2_MAP: Record<string, WidgetConversionSpec>` where each spec is
    `{ sectionType, sectionVariant?, blocks: (widget) => PageBlockV2-ish[],
    bindingRemap: Record<fieldPath, { role: string; propPath: string }> }`;
    exhaustive over the 42 registered widget types; deterministic ids
    `<widgetId>-<role>`; `navigation`/`footer` specs return `null` (drop).
- [x] `detailPageSchema.ts` split into write/stored-read:
  - `normalizeDetailPageDocumentForWrite(value)` — strict v2 only
    (reject-unknown allowlist: `schemaVersion, id, name, contentTypeId,
    contentTypeSlug, status, titlePattern, seo, settings, sections, bindings,
    related`); v1 input → `detail_page_legacy_v1_invalid`; sections validated
    through `normalizePageDocumentV2`-grade section/block normalizers on
    write; bindings validated against the new section/block id set.
  - `normalizeDetailPageDocumentForRead(value, overrides?)` — v2 → strict
    read; v1 → `convertDetailPageDocumentV1ToV2` then strict read (keeps
    un-backfilled revisions restorable).
  - Keep `normalizeDetailPageDocument` as an alias of the read path so
    resolver/service call sites migrate incrementally; remove the
    `ensureRuntimeWidgetsRegistered` + `normalizeWidgetBlocks` imports.
- [x] `detailPageBindingResolver.ts`: `resolveDetailPageBlocks` walks V2
  sections/blocks (clone → write `propPath` values into block `props` via the
  existing `bindingPath` utils) and returns `PageSectionV2[]`; keep all
  computed/related/form-context resolvers; error codes unchanged
  (`detail_page_binding_invalid`, `detail_page_binding_missing_required`);
  drop the `WidgetBlock`/`contentList` imports (use relocated contracts from
  580-01).
- [x] `detailPageRuntimeResolver.ts`: KEEP the `{ document, blocks }` return
  shape this leaf. `blocks` becomes a transitional alias over the converted
  v2 sections (explicit cast + comment `// transitional; removed in L04`) so
  this leaf's `lint:types` gate stays green; the resolver query itself is
  unchanged. L04 flips the resolver + `publicEntryRender.tsx:326/468`
  consumers to sections-only (decision recorded in both leaves).
- [x] `detailPageDocumentService.ts` + `detailPageDocumentLifecycleMutation.ts`
  + `detailPageRevisionService.ts`: use the write/read normalizer split;
  revision allocation mechanism (drizzle `.for("update")` locks at
  `detailPageDocumentLifecycleMutation.ts:261,269`, native writer fence at
  `:331,340`, `max(version)+1` at `:206`) stays byte-identical.
- [x] `detailPageRoutes.ts`: NO route changes; add `mapDetailPageError`
  coverage for `detail_page_legacy_v1_invalid` → 400.
- [x] `scripts/projekty-domow/content/projectDetail.ts`: rewrite
  `buildProjectDetailBlocks` → v2 sections (same 6 widgets, remapped
  bindings with the new block ids/prop paths) — lands in the SAME leaf as
  the strict write normalizer.
- [x] Shared fixture corpus `tests/fixtures/detailPageV2Conversion/*.json`:
  v1 doc + expected v2 doc for: projectDetail (hero/grid-columns/
  feature-grid/cta-banner/rich-text-section), assistant hero, empty blocks,
  one-of-each mapped type, one-of-each placeholder type, navigation/footer
  drop, dangling-binding drop. Both the TS tests AND the L03 SQL migration
  tests consume this corpus (parity contract).

## Files To Change

| File | Required change |
|---|---|
| `core/services/content/detailPageTypes.ts` | v2 types |
| `core/services/content/detailPageV2Conversion.ts` | NEW canonical conversion map |
| `core/services/content/detailPageSchema.ts` | write/stored-read split; drop widget imports |
| `core/services/content/detailPageBindingResolver.ts` | V2 sections walk |
| `core/services/content/detailPageRuntimeResolver.ts` | keep `{ document, blocks }`; `blocks` = transitional alias over converted v2 sections (explicit cast; removed in L04) |
| `core/services/content/detailPageDocumentService.ts` | normalizer split call sites |
| `core/services/content/detailPageDocumentLifecycleMutation.ts` | (only if it touches normalizers) |
| `core/services/content/detailPageRevisionService.ts` | read adapter on restore |
| `core/server/routes/detailPageRoutes.ts` | error mapping coverage only |
| `scripts/projekty-domow/content/projectDetail.ts` | v2 seed rewrite |
| `tests/fixtures/detailPageV2Conversion/*.json` | NEW shared parity corpus |
| `tests/vitest/content/detailPageSchema.test.ts`, `tests/vitest/content/detailPageBindingResolver.test.ts` | update + extend (Vitest lane) |
| `tests/unit/content/detailPageRuntimeResolver.test.ts`, `detailPageDocumentService.test.ts`, `detailPageRevisionService.test.ts` | update + extend (Bun lane) |
| `tests/vitest/content/detailPageV2Conversion.test.ts` | NEW conversion map + remap tests |

## Implementation Pseudocode

```ts
// core/services/content/detailPageV2Conversion.ts (pure, Bun-free)
export type WidgetConversionRole =
  | "heading" | "text" | "badge" | "button" | "image"
  | `card-${number}` | "columns" | "divider" | "spacer"
  | "collection" | "form" | "embed" | "legacy";

export type WidgetConversionSpec = {
  sectionType: PageSectionType;          // "custom" for placeholders
  sectionVariant: PageSectionVariant;
  roles: Array<{ role: WidgetConversionRole; from?: string; propPath?: string }>;
  /** binding fieldPath → { blockRole, propPath } using real pageBlockPropKeys names */
  bindingRemap: Record<string, { role: string; propPath: string }>;
};

export const WIDGET_TO_V2_MAP: Record<string, WidgetConversionSpec | null> = {
  hero: {
    sectionType: "hero", sectionVariant: "centered",
    roles: [
      { role: "heading", from: "data.headline", propPath: "text" },
      { role: "text", from: "data.body", propPath: "text" },
      { role: "badge", from: "data.badge.label", propPath: "text" },
      { role: "button", from: "data.primaryCta", propPath: "label" },
      { role: "image", from: "data.media", propPath: "src" },
    ],
    bindingRemap: {
      "headline": { role: "heading", propPath: "text" },
      "body": { role: "text", propPath: "text" },
      "badge.label": { role: "badge", propPath: "text" },
    },
  },
  "feature-grid": {
    sectionType: "feature-grid", sectionVariant: "cards",
    roles: [
      { role: "heading", from: "data.header.eyebrow", propPath: "text" },
      { role: "heading", from: "data.header.title", propPath: "text" },
      { role: "text", from: "data.header.description", propPath: "text" },
      // + per-item roles card-0..N built dynamically from data.items
    ],
    bindingRemap: {
      "header.eyebrow": { role: "heading", propPath: "text" },   // first heading block
      "header.title": { role: "heading:1", propPath: "text" },   // role index syntax
      "header.description": { role: "text", propPath: "text" },
      // items.N.title / items.N.description → `card-N` + title/text
    },
  },
  "navigation": null, // DROP (site shell owns nav)
  "footer": null,     // DROP (site shell owns footer)
  // ... remaining 42 types; unmapped → DEFAULT_LEGACY_SPEC
};

export const DEFAULT_LEGACY_SPEC: WidgetConversionSpec = {
  sectionType: "custom", sectionVariant: "default",
  roles: [{ role: "legacy" }],
  bindingRemap: {}, // bindings targeting legacy blocks are DROPPED
};

export function convertWidgetBlocksToV2Sections(blocks: WidgetBlock[]): PageSectionV2[] {
  return blocks.flatMap((block) => {
    const spec = WIDGET_TO_V2_MAP[block.type] ?? DEFAULT_LEGACY_SPEC;
    if (spec === null) return []; // navigation/footer drop
    return [buildSectionFromSpec(block, spec)]; // id = block.id, blocks use `<block.id>-<role>`
  });
}

export function convertDetailPageBindingsToV2(
  bindings: DetailPageBinding[],
  oldBlocks: WidgetBlock[],
  sections: PageSectionV2[]
): { bindings: DetailPageBinding[]; dropped: Array<{ bindingId: string; reason: string }> } {
  // 1. index old blocks by id; 2. for each binding resolve spec+remap;
  // 3. unknown widget/type/fieldPath or dropped target → dropped entry;
  // 4. rewrite { blockId: `<widgetId>-<role>`, propPath } (deterministic ids).
}
```

```ts
// core/services/content/detailPageSchema.ts
export function normalizeDetailPageDocumentForWrite(value: unknown): DetailPageDocument {
  const doc = normalizeDetailPageDocumentForRead(value, undefined, { write: true });
  return doc; // read path throws detail_page_legacy_v1_invalid for v1 on write
}

export function normalizeDetailPageDocumentForRead(
  value: unknown,
  overrides?: {...}
): DetailPageDocument {
  const input = requireRecord(value);
  const raw = input.schemaVersion === 2 ? input : convertDetailPageDocumentV1ToV2(input);
  // strict v2 normalization: envelope (unchanged rules) + sections via the
  // shared section/block normalizers + bindings against collected block ids
}
```

**Data flow:** stored jsonb (v1 or v2) → read adapter (v1 converted once in
memory) → binding resolver writes entry values into V2 block props →
`buildDetailPageRenderDocument` assembles the PageDocumentV2 →
`preparePageRuntimeDocument` → `renderPublicPageV2RuntimeHtml`. Writes accept
only v2 (reject-unknown) and persist byte-canonical documents.

**Error handling:** `detail_page_legacy_v1_invalid` (v1 payload on write),
`detail_page_document_invalid` (shape), `detail_page_binding_invalid` /
`detail_page_binding_missing_required` (bindings), all mapped at the route
boundary via the existing `mapDetailPageError` (new code → 400). The
resolver's catch-all → `null` → 404 stays for genuinely broken rows.

**Regression-test shape:**

```ts
describe("detailPageV2Conversion", () => {
  it.each(CONVERSION_FIXTURE_CASES)("converts %s deterministically", (name, v1, expected) => {
    const converted = convertDetailPageDocumentV1ToV2(v1);
    expect(converted).toEqual(expected);          // fixture-pinned parity with SQL
    expect(convertDetailPageDocumentV1ToV2(v1)).toEqual(converted); // idempotent
  });
  it("preserves legacy-widget data byte-identically", () => {
    const legacyData = { slots: { s: [{ type: "x", data: { a: 1 } }] } };
    const sections = convertWidgetBlocksToV2Sections([{ id: "w1", type: "booking-calendar", data: legacyData }]);
    expect(sections[0].blocks[0].props.data).toEqual(legacyData);
  });
  it("drops navigation/footer and their bindings with a report", () => { ... });
});

describe("normalizeDetailPageDocumentForWrite", () => {
  it("rejects v1 payloads with detail_page_legacy_v1_invalid", () => {
    expect(() => normalizeDetailPageDocumentForWrite(V1_FIXTURE)).toThrowError(/legacy_v1/);
  });
  it("round-trips every allowlist key", () => {
    const doc = normalizeDetailPageDocumentForWrite(V2_FIXTURE);
    expect(JSON.stringify(doc)).toBe(JSON.stringify(normalizeDetailPageDocumentForWrite(doc)));
  });
  it("rejects unknown envelope keys", () => expect(() =>
    normalizeDetailPageDocumentForWrite({ ...V2_FIXTURE, blocks: [] })
  ).toThrowError(/invalid/));
});

describe("resolveDetailPageBlocks (v2)", () => {
  it("writes entry-field values into block props", async () => {
    const sections = await resolveDetailPageBlocks({ document: v2Doc, entry, contentType, ... });
    expect(findBlock(sections, "project-hero-heading").props.text).toBe("Entry title");
  });
});
```

**Validation commands:**

- `bun --cwd core lint:types` + `bun --cwd core lint`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/content/detailPageSchema.test.ts tests/vitest/content/detailPageBindingResolver.test.ts`
- `bun test tests/unit/content/detailPageRuntimeResolver.test.ts tests/unit/content/detailPageDocumentService.test.ts tests/unit/content/detailPageRevisionService.test.ts tests/unit/content/detailPageDocumentLifecycleMutation.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/content/detailPageV2Conversion.test.ts`
- `bun test tests/unit/kits` (or the kit package test glob owning projectDetail) + `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/kits/projekty-domow-project-fixtures.test.ts`
- `git diff --check`

## Security Contract

- **Endpoint visibility:** internal admin only (no route surface change).
- **Auth model / RBAC / CSRF / rate limits:** unchanged
  (`content:read/write/publish`, CSRF on writes).
- **Validation:** strict reject-unknown on write; v1 write payloads fail
  closed; `legacy-widget` data preserved but never rendered; existing
  `secretLikePattern` + unsafe-segment guards retained on bindings/props.
- **Secret handling:** fixtures contain no secrets; conversion logs only
  counts/ids.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` (with L07) — v2 detail-page model.
- `_docs/PAGE_MODEL.md` — detail-page body rule + binding remap semantics.
- `_docs/DATA_MODEL.md` — stored jsonb contract note (with L03).

## Acceptance Criteria

1. `DetailPageDocument` is schemaVersion 2 with `sections[]`; no
   `core/widgets/*` imports remain in the detail-page domain modules.
2. Write path rejects v1 payloads; stored-read converts v1 deterministically.
3. The conversion map is exhaustive over all 42 registered widget types and
   fixture-pinned for both TS and (via L03) SQL implementations.
4. Bindings remap onto V2 block prop paths; dangling/dropped bindings are
   removed with a report instead of 404ing the page.
5. Kit seeds emit v2 and their existing tests pass against the new fixtures.
