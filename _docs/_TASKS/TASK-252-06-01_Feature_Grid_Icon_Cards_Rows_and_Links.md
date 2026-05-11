# TASK-252-06-01: Feature Grid Icon Cards Rows and Links

# FileName: TASK-252-06-01_Feature_Grid_Icon_Cards_Rows_and_Links.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Keep feature-grid centered on icon cards, rows, and optional links; bento,
badge/category, hover, and rich-media rows stay Adapt-only rather than required
scope.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/feature-grid/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md`; for this leaf, start from the current owner fields `header`, `items`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: icon-card grids and optional per-item links start from the current
  `cards-3`, `cards-4`, and `highlight-first` variant contract in
  `core/widgets/core/featureGrid.tsx`. Alternating feature rows may add bounded
  `style.layout` and `style.mediaPosition` only when the same implementation
  slice updates schema/defaults/normalizer/render/editor/tests and preserves the
  current variant defaults for existing saved pages. Row rendering must use the
  existing `items[].image` seam; do not infer row mode from arbitrary classes or
  create a separate rich-media feature widget in this leaf.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat bento, badges/categories, hover animation, and rich media rows as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `feature-grid`.
- `Visual`: `Mode`, `Feature items`, `Icons`, `Links`, `Surface`.
- `Advanced`: `Item IDs`, `Legacy layout mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/featureGrid.tsx`
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer fields change.
- `tests/vitest/widgets/featureGrid.test.tsx`
- `tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-01_Feature_Grid_Icon_Cards_Rows_and_Links.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type FeatureGridLayout = "legacy" | "cards" | "rows";
type FeatureGridMediaPosition = "left" | "right" | "alternate";
type FeatureGridStyleWithRows = NonNullable<FeatureGridData["style"]> & {
  layout?: FeatureGridLayout;
  mediaPosition?: FeatureGridMediaPosition;
};
type FeatureGridDataWithRows = Omit<FeatureGridData, "style"> & {
  style?: Partial<FeatureGridStyleWithRows>;
};

function normalizeFeatureGridData(
  data: FeatureGridDataWithRows,
  variant: string = "cards-3"
): FeatureGridDataWithRows {
  const resolvedVariant = resolveFeatureGridVariant(variant);
  const style = normalizeFeatureGridStyle(data.style, resolvedVariant);

  return {
    header: normalizeFeatureGridHeader(data.header),
    items: normalizeFeatureGridItems(data.items),
    style,
  };
}

function normalizeFeatureGridStyle(
  style: FeatureGridDataWithRows["style"] | undefined,
  variant: FeatureGridVariantId
): FeatureGridStyleWithRows {
  return {
    columns: resolveFeatureGridColumns(style?.columns, variantDefaultColumnsMap[variant]),
    gap: normalizeFeatureGridGap(style?.gap),
    surfaceColor: normalizeClearableStyleColor(style?.surfaceColor),
    borderColor: normalizeClearableStyleColor(style?.borderColor),
    borderWidth: normalizeFeatureGridBorderWidth(style?.borderWidth),
    radius: normalizeFeatureGridRadius(style?.radius),
    layout: normalizeFeatureGridLayout(style?.layout ?? "legacy"),
    mediaPosition: normalizeFeatureGridMediaPosition(style?.mediaPosition ?? "alternate"),
  };
}

function normalizeFeatureGridItem(item: FeatureGridItem, index: number): FeatureGridItem {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `feature-grid-${index + 1}`),
  };
}

function FeatureGridVisualEditor(props: WidgetEditorProps<FeatureGridDataWithRows>) {
  return (
    <WidgetEditorSection id="feature-grid.items" title="Feature items">
      <WidgetControlRow id="feature-grid.style.layout" label="Layout" data-widget-control="feature-grid.style.layout">
        <SegmentedControl value={props.value.style?.layout ?? "legacy"} onChange={(layout) => props.onChange(updateFeatureGridStyle(props.value, { layout }))} />
      </WidgetControlRow>
      <WidgetControlRow id="feature-grid.style.mediaPosition" label="Media position" data-widget-control="feature-grid.style.mediaPosition">
        <SegmentedControl value={props.value.style?.mediaPosition ?? "alternate"} onChange={(mediaPosition) => props.onChange(updateFeatureGridStyle(props.value, { mediaPosition }))} />
      </WidgetControlRow>
      {props.value.items.map((item, index) => (
        <WidgetControlRow key={item.id ?? index} id={`feature-grid.items.${index}.title`} label="Title" data-widget-control={`feature-grid.items.${index}.title`}>
          <Input value={item.title ?? ""} onChange={handleControlChange} />
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/featureGrid.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Add bounded `style.layout: "legacy" | "cards" | "rows"` and
  `style.mediaPosition: "left" | "right" | "alternate"` schema/default/
  normalizer/render/editor/tests for alternating feature rows. `legacy` must
  preserve the current variant-driven renderer: `cards-3` forces three-column
  output, `cards-4` forces four-column output, and `highlight-first` keeps the
  current first-card emphasis. Row mode must render through existing
  `items[].image` and safe link fields; if media cannot render safely in the
  implementation slice, move alternating rows to Adapt in the matrix/task
  rather than leaving a Keep requirement without an owner.
- Add stable `data-widget-control` metadata for feature add/remove/reorder
  actions, icon/image/title/body/link rows, layout/media-position controls,
  variant cards, and style color fields.
- Refactor `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior and must not change `data-feature-grid-variant`,
  `data-feature-grid-columns`, `data-feature-grid-gap`, or
  `data-feature-grid-count` for existing `cards-3`, `cards-4`, and
  `highlight-first` variants.
- Updating `normalizeFeatureGridData(data, variant)` must preserve existing
  one-argument call sites through a default/overload, and renderer/editor call
  sites that know the block variant must pass it explicitly.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `feature-grid` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `feature-grid` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/featureGrid.tsx`.
- Anti-abuse:
  - Link fields introduced or touched by this leaf must normalize through a
    `core/widgets/core/widgetSafeHref.ts` helper with identical allowed/rejected
    protocol tests before render; media fields must stay on the
    existing media-picker/storage ownership path when one exists; raw URL media
    fields must add bounded sanitization and tests before render.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change; include accepted-new-field, unknown-field rejection, and
  legacy-normalization assertions for this widget.
- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- Add regression coverage proving missing `style.layout`/`style.mediaPosition`
  keeps the current variant-derived output for `cards-3`, `cards-4`, and
  `highlight-first` before asserting any new row-mode rendering.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-01_Feature_Grid_Icon_Cards_Rows_and_Links.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `feature-grid` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
