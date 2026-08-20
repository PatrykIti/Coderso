# TASK-580-03-L05: Admin Detail Template Editor V2 Cutover
# FileName: TASK-580-03-L05-Admin-Detail-Template-Editor-V2-Cutover.md

**Parent Subtask:** TASK-580-03
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Very Large
**Dependencies:** TASK-580-03-L02 (L04 recommended for preview parity)
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Replace the v1 widget builder inside the detail-template editor
(`DetailTemplateEditorPage.tsx` uses `BlockList`/`BlockSettings`/`LibraryPanel`/
`blockUtils`/`getWidgetRegistry`/`normalizeWidgetBlock` via
`detailTemplateEditorModel.ts:9,100`) with a minimal detail-owned V2
section/block editor. The editor keeps the existing page chrome (name, status,
title pattern, SEO, publish/autosave/revisions/preview, bindings panel, cache
bus behavior) and swaps only the canvas model: sections + V2 blocks, edited
through the neutral authoring chrome (`core/admin/ui/authoring/*`, extracted
by TASK-468-03) and the V2 block control registry as a consumer. The
`DetailTemplateBindingPanel` picks binding prop paths from V2 block prop keys
(`pageBlockPropKeys`) instead of widget definitions. The 1283-line
`DetailTemplateEditorPage.tsx` MUST be split below 1000 lines.

## Sub-Tasks

- [x] `detailTemplateEditorModel.ts` — drop `widgets/validator`,
  `builder/blockUtils`, `builder/types` imports; the local draft model becomes
  `{ sections: PageSectionV2[] }`; `buildDefaultDetailTemplateDocument` emits
  `schemaVersion: 2, sections: []`; `normalizeDetailTemplateDocument` uses
  `normalizeDetailPageDocumentForRead`; `buildDetailTemplateDocumentUpdate`
  writes sections; keep route/href decoding as-is.
- [x] NEW `DetailTemplateCanvas.tsx` (split out of the page): section list +
  per-section block list rendering (visual preview of V2 blocks via the
  read-only render path or neutral chrome frames), section add/remove/move,
  block add/remove/move/duplicate using V2 ops (`createPageSectionV2`,
  `createPageBlockV2`, section templates from `pageSectionTemplates`).
- [x] NEW `DetailTemplateInspector.tsx` (split out): block prop editing through
  the V2 block control registry (`pageEditorBlockControlRegistry`) as a
  read-only consumer; section-level settings (variant/spacing/visibility)
  through the same section control surface the Page Editor uses (verify which
  module; prefer reusing exports, never copying loops).
- [x] `DetailTemplateEditorPage.tsx` — remove all `builder/*` imports and the
  `WidgetEditorContext`/`ContainerToken`/`SpacingToken` types; wire the new
  canvas/inspector; keep autosave/publish/revisions/preview flows and the
  existing admin cache contract (`detailPagesClient` payload shape changes
  only; no cache-key changes — verify `ADMIN_CACHE.md`/`_MAP` and update only
  if a key changes).
- [x] `DetailTemplateBindingPanel.tsx` — replace `WidgetDefinition`-driven
  prop-path enumeration with a V2 collector: NEW helper
  `collectV2BlockBindingPropPaths(block)` (or extend
  `core/services/utils/bindingPropPaths.ts` with a V2 branch) enumerating
  `pageBlockPropKeys[type]` paths (leaf text/label/src/href props only);
  selection by block id + prop path stays identical.
- [x] Legacy documents: a v1 stored doc opened in the editor reads through the
  adapter (sections) and, on save, writes v2; `legacy-widget` blocks render
  read-only in the canvas with a "re-author" note and no edit controls.
- [x] File-size gate: after the split, every touched file ≤1000 lines
  (`DetailTemplateEditorPage.tsx` → host only; canvas/inspector separate).
- [x] Tests: update `tests/vitest/ui/detail-template-editor.test.tsx` (remove
  v1 widget assertions, add section/block round-trip, dirty-state, autosave,
  binding panel V2 paths); add `tests/vitest/ui/detail-template-canvas.test.tsx`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/content-types/detailTemplateEditorModel.ts` | V2 draft model |
| `core/admin/ui/content-types/DetailTemplateEditorPage.tsx` | host split + V2 wiring |
| `core/admin/ui/content-types/DetailTemplateCanvas.tsx` | NEW canvas |
| `core/admin/ui/content-types/DetailTemplateInspector.tsx` | NEW inspector |
| `core/admin/ui/content-types/DetailTemplateBindingPanel.tsx` | V2 prop-path picker |
| `core/services/utils/bindingPropPaths.ts` (or new helper) | V2 path collector |
| `tests/vitest/ui/detail-template-editor.test.tsx` | rewrite V2 assertions |
| `tests/vitest/ui/detail-template-canvas.test.tsx` | NEW |

## Implementation Pseudocode

```tsx
// DetailTemplateCanvas.tsx
export function DetailTemplateCanvas({ draft, onChange }: {
  draft: DetailTemplateDocumentDraftV2; // { name, titlePattern, sections, bindings }
  onChange: (next: DetailTemplateDocumentDraftV2) => void;
}) {
  const addSection = (type: PageSectionType) => onChange({
    ...draft,
    sections: [...draft.sections, createPageSectionV2(type, { variant: fallbackVariant(type) })],
  });
  const addBlock = (sectionId: string, type: PageBlockType) => onChange(updateSectionBlocks(
    draft, sectionId, (blocks) => [...blocks, createPageBlockV2(type)],
  ));
  return (
    <AuthoringLayersPanel items={sectionItems(draft.sections)} selectedId={...} onSelect={...}>
      {draft.sections.map((section) => (
        <SectionFrame key={section.id} section={section}>
          {section.blocks.map((block) =>
            block.type === "legacy-widget"
              ? <ReadOnlyLegacyBadge block={block} />
              : <BlockFrame key={block.id} block={block}><BlockPreview block={block} /></BlockFrame>
          )}
        </SectionFrame>
      ))}
    </AuthoringLayersPanel>
  );
}
```

```ts
// bindingPropPaths V2 branch
export const collectV2BlockBindingPropPaths = (block: PageBlockV2): string[] =>
  (pageBlockPropKeys[block.type] ?? []).filter((key) =>
    ["text", "label", "title", "src", "href", "value"].includes(key)
  ).map((key) => key);
```

**Data flow:** record → `normalizeDetailTemplateDocument` (v2 via read
adapter) → local draft (sections + bindings) → canvas/inspector mutations →
`buildDetailTemplateDocumentUpdate` → `updateDetailPage/autosaveDetailPage`
(strict v2 write) → cacheBus invalidation via the existing detailPagesClient
contract. No new endpoints; the existing `/admin/api/detail-pages*` routes
carry the v2 payloads.

**Error handling:** v1 stored docs always read through the adapter (never
block editing); `legacy-widget` blocks are read-only (mutation attempts are
no-ops with a note); dirty-state protection and autosave conflict behavior
stay as-is (React Hooks Compiler rules: no synchronous setState in effects;
reuse the existing autosave/publish patterns).

**Regression-test shape:**

```tsx
describe("detail template editor v2", () => {
  it("loads a v1 stored doc as v2 sections and saves v2", async () => { ... });
  it("adds/removes sections and blocks with deterministic ids", ...);
  it("keeps legacy-widget blocks read-only in the canvas", ...);
  it("binding panel lists V2 prop paths for a heading block", ...);
  it("autosave/publish reuse the existing cache contract", ...);
});
```

**Validation commands:**

- `bun --cwd core lint:types` + `bun --cwd core lint` + `bun --cwd core build:admin`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/ui/detail-template-canvas.test.tsx`
- `bun run check:admin-boundary` (admin import boundaries)
- `git diff --check`

## Security Contract

- **Endpoint visibility:** internal admin only; existing detail-pages routes
  unchanged.
- **Auth model:** authenticated admin session; `content:read/write/publish`.
- **CSRF:** required on writes (existing middleware).
- **Rate-limit bucket:** existing admin buckets.
- **Validation:** strict reject-unknown on the v2 payloads; bindings validated
  against section/block ids; `legacy-widget` data never editable in the UI.
- **Secret handling:** no new cache/debug payload fields; editor state stays
  out of localStorage beyond the existing patterns.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` — detail-template editor V2 (with L07).
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` — verify only.

## Acceptance Criteria

1. The detail-template editor no longer imports `core/admin/ui/pages/builder/*`
   or `core/widgets/*`; it authors V2 sections/blocks only.
2. All touched files are ≤1000 lines after the split.
3. Bindings panel enumerates V2 block prop paths; bindings round-trip through
   save/autosave/publish.
4. `legacy-widget` blocks render read-only with a re-author note.
5. Existing editor suites pass with v1-widget-specific assertions removed.
