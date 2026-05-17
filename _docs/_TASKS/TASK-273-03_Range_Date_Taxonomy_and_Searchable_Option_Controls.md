# TASK-273-03: Range, Date, Taxonomy, and Searchable Option Controls

# FileName: TASK-273-03_Range_Date_Taxonomy_and_Searchable_Option_Controls.md

**Priority:** High
**Category:** Widgets + Listing Filters + Runtime Render + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-273-01, TASK-273-02
**Status:** To Do

---

## Overview

Make non-sort Listing Filters controls practical for real catalogs: numeric
range controls, date-range controls, nested taxonomy presentation, and a
bounded searchable multi-select option mode for large option sets.

This leaf owns Listing Filters schema/defaults/normalizer/render/editor/tests
for these controls. It must not introduce client-owned search provider config or
unbounded arbitrary widgets inside facets.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:94-97` - taxonomy,
  range/date, and large option-set controls are not supported well.
- `core/widgets/core/listingFilters.tsx:397-410` - range and date-range
  currently render a single text input with `min,max` or
  `YYYY-MM-DD,YYYY-MM-DD` placeholders.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:328-329` - range/date
  controls are a priority repair for normal editors.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingFilters.tsx` | Extend schema/defaults/types for bounded control presentation settings and render range/date/taxonomy/searchable option controls. |
| `core/services/search/filterContract.ts` | Extend facet config types only when the new control metadata belongs in the query token contract. Preserve existing token names. |
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Add editor controls for numeric/date ranges, taxonomy hierarchy, and searchable option mode. |
| `core/widgets/core/listingRuntimeScript.ts` | Bind Listing Filters-scoped option-search filtering and read multi-value/select/range/date controls through existing token sync without breaking current checkbox/radio/sort or Search Box listing-mode behavior. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover rendered range/date/taxonomy/searchable controls and legacy payload fallbacks. |
| `tests/vitest/widgets/listingRuntimeScript.test.ts` | Create this new suite when first touching shared runtime-script behavior; cover local option-search filtering, range/date/searchable multi-select serialization, and Search Box listing-mode no-regression cases. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover editor controls and validation for new control metadata. |
| `tests/unit/widgets/validator.test.ts` | Cover schema validation when new persisted fields are added. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document the new control modes and bounds. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Mark B-04 through B-07 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type ListingFacetControlMode = "inline-options" | "select" | "searchable-select" | "tree";

type ListingFacetUiConfig = {
  controlMode?: ListingFacetControlMode;
  collapsible?: boolean;
  rangeStep?: number;
  rangeInputMode?: "inputs" | "slider" | "inputs-slider";
  dateInputMode?: "native-date" | "text-fallback";
};

function normalizeListingFacetUiConfig(facet: unknown, kind: ListingFacetKind) {
  return compactObject({
    controlMode: resolveAllowedControlMode(facet.controlMode, kind),
    rangeStep: kind === "range" ? clampStep(facet.rangeStep) : undefined,
    rangeInputMode: kind === "range" ? resolveRangeMode(facet.rangeInputMode) : undefined,
    dateInputMode: kind === "date-range" ? resolveDateMode(facet.dateInputMode) : undefined,
  });
}

function ListingRangeFacetControl({ metric, config }: Props) {
  const [min, max] = splitActiveRange(metric.range?.active);
  return (
    <fieldset data-listing-range-control data-listing-range-token={metric.token}>
      <input type="number" data-listing-range-part="min" defaultValue={min} />
      <input type="number" data-listing-range-part="max" defaultValue={max} />
      <input type="hidden" data-listing-token={metric.token} value={joinRangeToken(min, max)} />
      {config.rangeInputMode !== "inputs" ? <RangeSlider metric={metric} /> : null}
    </fieldset>
  );
}

function bindListingRangeControls(root: ParentNode) {
  root.querySelectorAll("[data-listing-range-control]").forEach((control) => {
    const hidden = control.querySelector<HTMLInputElement>("[data-listing-token]");
    const parts = Array.from(control.querySelectorAll<HTMLInputElement>("[data-listing-range-part]"));
    parts.forEach((part) => {
      part.addEventListener("input", () => {
        if (!hidden) return;
        hidden.value = joinRangeToken(readPart(parts, "min"), readPart(parts, "max"));
      });
    });
  });
}

function ListingSearchableOptionControl({ metric }: Props) {
  const visibleOptions = metric.options.slice(0, 50);
  return (
    <div data-listing-searchable-options>
      <input
        type="search"
        data-listing-option-search
        aria-controls={metric.token + "-options"}
      />
      <div id={metric.token + "-options"}>
        {visibleOptions.map((option) => (
          <label
            key={option.value}
            data-listing-searchable-option
            data-listing-option-label={option.label.toLowerCase()}
          >
            <input
              type="checkbox"
              name={metric.token}
              value={option.value}
              defaultChecked={option.active}
              data-listing-token={metric.token}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function bindListingSearchableOptions(root: ParentNode) {
  root.querySelectorAll("[data-listing-searchable-options]").forEach((control) => {
    const input = control.querySelector<HTMLInputElement>("[data-listing-option-search]");
    const options = Array.from(control.querySelectorAll<HTMLElement>("[data-listing-searchable-option]"));
    input?.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      options.forEach((option) => {
        const label = option.dataset.listingOptionLabel ?? "";
        option.hidden = query.length > 0 && !label.includes(query);
      });
    });
  });
}
```

Data flow:

- Persisted control metadata lives alongside each facet only when it changes
  rendering behavior.
- Public runtime markup stays SSR-safe/static. Browser filtering for
  searchable options is bound by `listingRuntimeScript.ts` through
  Listing Filters-specific `data-listing-searchable-*` markers, not React
  hydration state.
- Runtime tokens remain `lq.<queryId>.<field>.<operator>` and use the current
  URL sync path.
- Range/date controls serialize the same comma-separated pair currently used by
  the backend token parser by updating one hidden canonical
  `data-listing-token` input from visible min/max or start/end inputs.
- Taxonomy hierarchy is presentation metadata for option nesting; query
  execution still receives selected option values.

Error handling:

- Invalid range/date bounds normalize to empty active state, not a broken URL.
- Unsupported control modes fall back to the current inline option rendering.
- Large option lists must include local bounded search/filter UI plus
  multi-select serialization; do not add remote typeahead until a backend-owned
  search endpoint exists.

## Security Contract

No public write or provider endpoint is added.

- Endpoint visibility: none.
- Auth model: unchanged admin editing and public runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged because no write route is introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: new facet UI fields must keep
  `additionalProperties: false`, clamped enums/numbers, and legacy fallbacks.
- Anti-abuse: option values remain bounded strings; no raw HTML, raw scripts,
  unbounded class names, or client-owned search/index configuration.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts`
  when option-search filtering or range/date/searchable multi-select
  serialization changes; include Search Box listing-mode no-regression cases
  because the script is shared.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_TASKS/TASK-273-03_Range_Date_Taxonomy_and_Searchable_Option_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Range and date-range facets can be used without typing comma-delimited raw
  strings.
- Taxonomy options can express a visible parent-child hierarchy while preserving
  the current option-value token contract.
- Large option sets have a bounded searchable multi-select control that remains
  schema-owned.
- Searchable controls filter visible options on public runtime pages without
  requiring hydrated React state.
- Existing checkbox/radio/sort payloads render unchanged.
