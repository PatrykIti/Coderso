# TASK-252-07-07: Listing Filters Facets Ranges Reset and Mobile Layout

# FileName: TASK-252-07-07_Listing_Filters_Facets_Ranges_Reset_and_Mobile_Layout.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Make listing-filters own facets, ranges, reset/apply behavior, and safe query
binding first; mobile/sidebar/chips presentation stays Adapt-only.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/listing-filters/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/listing-filters/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/listing-filters/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/listing-filters/MATRIX.md`; for this leaf, start from the current owner fields `listingQueryId`, `autoApply`, `showSearch`, `facets`, `style`, `resolved` and add only the schema fields that the matrix explicitly keeps.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat mobile/sidebar/chips presentation and facet presets from listing schema metadata as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `listing-filters`.
- `Visual`: `Facet source`, `Layout`, `Range filters`, `Apply/reset`, `Mobile behavior`.
- `Advanced`: `Query diagnostics`, `Facet mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/listingFilters.tsx`
- `core/widgets/core/listingRuntimeScript.ts` when query/reset/apply/query-param runtime behavior changes.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/listingFilters.test.tsx`
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/_WIDGETS/tmp/listing-filters/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-07_Listing_Filters_Facets_Ranges_Reset_and_Mobile_Layout.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeListingFiltersData(data: ListingFiltersData): ListingFiltersData {
  return {
    listingQueryId: normalizeListingFiltersListingQueryId(data.listingQueryId),
    title: normalizeListingFiltersTitle(data.title),
    description: normalizeListingFiltersDescription(data.description),
    autoApply: normalizeListingFiltersAutoApply(data.autoApply),
    showSearch: normalizeListingFiltersShowSearch(data.showSearch),
    facets: normalizeListingFiltersFacets(data.facets),
    style: normalizeListingFiltersStyle(data.style),
    resolved: normalizeListingFiltersResolved(data.resolved),
  };
}

function ListingFiltersVisualEditor(props: WidgetEditorProps<ListingFiltersData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="listing-filters.listing-filters" title="Facet source">
      <WidgetControlRow id="listing-filters.listingQueryId" label="Listing query" data-widget-control="listing-filters.listingQueryId">
        <ListingQueryPicker value={value.listingQueryId ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/listing-filters/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/listingFilters.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `listing-filters` output is public page/runtime output.
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
  - changed `listing-filters` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/listingFilters.tsx`.
- Anti-abuse:
  - facet/query fields must be schema-owned and safe
  - limits and operators must remain clamped and reject unsafe values

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add or update a regression around `getListingRuntimeClientScript` when query/reset/apply/query-param behavior changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-07_Listing_Filters_Facets_Ranges_Reset_and_Mobile_Layout.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `listing-filters` editor exposes research-backed source/display/state controls with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
