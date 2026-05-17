# TASK-273-02: Facet Field, Operator, Options, and Preview Editors

# FileName: TASK-273-02_Facet_Field_Operator_Options_and_Preview_Editors.md

**Priority:** High
**Category:** Widgets + Listing Filters + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-273-01
**Status:** To Do

---

## Overview

Replace the fragile Listing Filters facet-authoring controls with
query-aware, kind-aware editors: field path suggestions, allowed operators per
facet kind, structured option/sort-option rows, inline parsing feedback, and a
small rendered facet preview.

This leaf must keep query execution and runtime metrics owned by existing
listing services. It only improves admin authoring of the `facets` model.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:109-114` - free-text field
  path, unfiltered operators, text-area option formats, and missing preview.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:165-172` - only sort option
  editing is practically usable today.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:340-343` - option/sort
  text formats need visual, validated editors.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:43-56` - all
  operators are listed for every non-sort kind.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:65-116` - text-area
  parsers silently drop invalid option and sort lines.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:386-464` - field,
  operator, option, and sort controls are generic inputs.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Add query-field picker/suggestions, kind-scoped operator options, structured option/sort rows, inline validation, and facet preview. |
| `core/services/search/filterContract.ts` | Export kind/operator helper metadata if needed so editor and runtime normalization share allowed combinations without duplicating literals. |
| `core/admin/services/listingsClient.ts` | Reuse existing listing-query records to derive field candidates; do not add a second route if the current response already has enough schema/query fields. |
| `core/server/routes/listingsRoutes.ts` | Touch only if the current admin listing-query response cannot safely expose field candidates; add route-registration and `map*Error` coverage when a helper route is introduced. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover field suggestions, kind/operator restrictions, option row add/remove/reorder, invalid sort rows, and preview output. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover normalized persisted facet output for options/sort rows when helper metadata moves to the shared contract. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document editor field/operator/option authoring. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Mark E-02 through E-06 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
const operatorsByKind: Record<ListingFacetKind, ListingFilterOperator[]> = {
  checkbox: ["in", "nin", "eq", "neq"],
  radio: ["eq", "neq"],
  taxonomy: ["in", "nin", "eq"],
  range: ["between", "gte", "lte", "gt", "lt"],
  "date-range": ["between", "gte", "lte", "gt", "lt"],
  sort: [],
};

function getListingQueryFieldCandidates(query: ListingQueryRecord | null) {
  return dedupe([
    ...extractQueryProjectionFields(query?.query?.fields),
    ...extractFilterFields(query?.query?.filters),
    ...extractSortFields(query?.query?.sort),
  ]);
}

function FacetOptionRows({ facet, onChange }: FacetOptionRowsProps) {
  return facet.options.map((option, index) => (
    <OptionRow
      key={stableOptionKey(option, index)}
      value={option.value}
      label={option.label}
      validation={validateFacetOption(option)}
      onChange={(patch) => onChange(updateFacetOption(facet, index, patch))}
      onRemove={() => onChange(removeFacetOption(facet, index))}
    />
  ));
}

function ListingFacetPreview({ facet }: { facet: ListingFacetConfig }) {
  const previewMetric = buildPreviewMetricFromDraft(facet);
  return <ListingFacetControlPreview metric={previewMetric} />;
}
```

Data flow:

- The selected listing query feeds field suggestions only. The persisted widget
  data continues to store explicit `facet.field` strings.
- Operator choices are computed from the selected facet kind; unsupported legacy
  operators remain visible as invalid legacy state until changed, then normalize
  to the closest allowed operator.
- Option and sort rows write structured arrays directly, replacing lossy
  textarea parsing.
- Preview renders from sanitized draft data and never performs runtime query
  execution.

Error handling:

- Invalid option rows stay visible with inline errors instead of being silently
  dropped.
- Missing sort `field` or invalid `dir` blocks persistence/update for that row
  and explains the required shape.
- Empty field candidates fall back to a text input with helper copy; do not fake
  schema knowledge.

## Security Contract

No API routes are added unless current listing-query responses cannot expose
field candidates safely.

- Endpoint visibility: none by default; if a new helper route becomes necessary,
  it must be internal admin-only, registered with the existing listings route
  family, and covered by route-registration tests.
- Auth model: unchanged authenticated admin UI.
- RBAC: unchanged listing-query read permissions.
- CSRF: unchanged because this leaf should not add writes.
- Rate-limit bucket: unchanged; any new internal read route must use the
  existing admin read bucket.
- Reject-unknown validation: persisted `facets[]` entries remain schema-owned
  and bounded.
- Anti-abuse: field candidates are labels/suggestions only; the server remains
  the owner of validating fields/operators before query execution.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults/normalizer
  fields change.
- Add route-registration and centralized `map*Error` coverage only if a new
  internal field-candidate route is introduced.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_TASKS/TASK-273-02_Facet_Field_Operator_Options_and_Preview_Editors.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Editors guide authors toward available listing query fields without requiring
  them to memorize paths.
- Operator choices are constrained by facet kind and legacy unsupported choices
  are surfaced clearly.
- Checkbox/radio/taxonomy options and sort options are edited as structured rows
  with validation, not brittle pipe-delimited text areas.
- A facet preview shows the configured control shape without requiring a save.
- Existing valid Listing Filters payloads remain backward compatible.
