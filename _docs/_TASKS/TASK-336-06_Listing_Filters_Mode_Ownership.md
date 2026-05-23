# TASK-336-06: Listing Filters Mode Ownership

# FileName: TASK-336-06_Listing_Filters_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Listing Filters + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** To Do

---

## Overview

Split `listing-filters` into distinct setup, visual authoring, and technical
diagnostic modes.

Listing Filters is a P0 ownership issue because source/facet setup, visible
filter labels, and query/runtime behavior are currently not separated clearly
enough. The final UX must avoid making authors choose between three tabs that
all appear to configure the same thing.

## Ownership Decision

- `Wizard` owns collection/source selection, initial facet set, and first-use
  filter setup.
- `Visual` owns facet labels, order, visible layout, chip/dropdown style,
  spacing, empty-state copy, and other daily presentation controls.
- `Advanced` owns read-only resolved query shape, collection binding summary,
  URL parameter diagnostics, and runtime compatibility notes.

Evidence caveat: the re-audit finding is source-backed, not a completed
38-widget browser traversal. TASK-336-03 admin smoke must confirm this widget
before the task can move to Done.

## Sub-Tasks

- [ ] Inventory current Listing Filters writable paths.
- [ ] Add `listing-filters` `editorContract` metadata.
- [ ] Move source/facet bootstrapping into Wizard.
- [ ] Move labels/order/layout/surface controls into Visual.
- [ ] Convert Advanced query/source duplicates into read-only diagnostics.
- [ ] Add clear no-collection/no-facets guidance.
- [ ] Add Vitest UI coverage for ownership and DOM metadata.
- [ ] Add Playwright admin smoke and frontend fixture decision.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingFilters.tsx` | Add `editorContract`; preserve schema and normalization. |
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Split mode-specific sections and shared control rows. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover contract/normalize behavior if touched. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover mode ownership and duplicate prevention. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document final ownership if the widget doc exists or is created. |

## Implementation Pseudocode

```tsx
function ListingFiltersVisualEditor(props: WidgetEditorProps<ListingFiltersData>) {
  return (
    <WidgetEditorModeRoot mode="visual" widgetType="listing-filters">
      <WidgetEditorSection mode="visual" sectionId="facet-labels" role="content" title="Facet labels">
        <FacetLabelEditor value={props.value.facets} onChange={updateFacetLabels} />
      </WidgetEditorSection>
      <WidgetEditorSection mode="visual" sectionId="filter-surface" role="visual" title="Filter surface">
        <FilterSurfaceControls value={props.value.style} onChange={updateStyle} />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- Wizard initializes binding/facets.
- Visual edits the author-facing and visitor-facing presentation of those
  facets.
- Advanced computes a read-only query summary from normalized data.
- Public renderer receives only normalized widget props.

Error handling:

- Empty source must not create broken public filter markup.
- Unknown legacy facets should be normalized or shown as read-only diagnostics.
- Advanced query summaries must redact internal implementation details that are
  not safe or useful to editors.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve strict schema.
- Anti-abuse: no public query/write endpoint changes.
- Secret handling: do not expose private collection configuration or hidden
  fields in Advanced diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `listing-filters` admin modes.

Regression-test shape:

- Wizard owns source/facet setup paths.
- Visual owns label/order/surface paths.
- Advanced query diagnostics are read-only.
- No facet path is writable in both Wizard and Visual unless explicitly
  justified by a temporary allowlist.

## Documentation Updates Required

- Update Listing Filters widget docs with final mode ownership.
- Append a dated TASK-336-06 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- `listing-filters` no longer presents one repeated editor in all modes.
- Source, presentation, and query diagnostics have separate owners.
- Tests prove duplicate writable paths are removed.
