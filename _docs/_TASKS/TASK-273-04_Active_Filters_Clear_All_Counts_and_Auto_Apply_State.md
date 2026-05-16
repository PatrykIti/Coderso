# TASK-273-04: Active Filters, Clear All, Counts, and Auto Apply State

# FileName: TASK-273-04_Active_Filters_Clear_All_Counts_and_Auto_Apply_State.md

**Priority:** High
**Category:** Widgets + Listing Filters + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-273-01, TASK-273-03
**Status:** To Do

---

## Overview

Add clear user feedback for the current Listing Filters state: active filter
count, active chips/tags, a `Clear all` action, truthful count rendering when
metrics are unavailable, and less confusing auto-apply submit behavior.

This leaf owns Listing Filters runtime UX only. Shared accessibility naming and
generic button/form ARIA fixes remain TASK-256 unless this leaf adds a new local
control that needs local labels.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:93` - no active filter
  indicator, tags, or clear-all action.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:119` - submit button stays
  visible with confusing auto-apply copy.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:131` - fallback metrics
  display `0` counts for unloaded data.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:221-224` - current frontend
  output shows apply button and auto-apply note.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:332,344-346` - priorities
  for active filters, auto-apply copy, and count state.
- `core/widgets/core/listingFilters.tsx:337-364` - fallback metrics hard-code
  `count: 0`.
- `core/widgets/core/listingFilters.tsx:559-571` - submit button and auto-apply
  helper are always rendered together.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingFilters.tsx` | Add active summary/chips/clear-all markup, distinguish missing metrics from zero counts, and adjust auto-apply submit/copy behavior. |
| `core/widgets/core/listingRuntimeScript.ts` | Bind clear-all action to remove `lq.<queryId>.*` params and refresh linked listing blocks. |
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Add labels/toggles for active summary, clear-all label, count visibility/unknown-state copy only if product wants them configurable. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover active chips, clear-all marker, missing versus zero counts, and auto-apply/manual button behavior. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover any new editor controls. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document active state, clear-all, and count behavior. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Mark B-03, E-12, and T-07 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type ListingFiltersBehavior = {
  showActiveSummary?: boolean;
  clearAllLabel?: string;
  showApplyButtonWhenAutoApply?: boolean;
};

function buildActiveFilterItems(metrics: ListingFacetMetric[], searchQuery: string) {
  const items = [];
  if (searchQuery) items.push({ token: listingRuntimeTokens.search, label: "Search", value: searchQuery });
  metrics.forEach((metric) => {
    metric.options.filter((option) => option.active).forEach((option) => {
      items.push({ token: metric.token, label: metric.label, value: option.label });
    });
    if (metric.range?.active) {
      items.push({ token: metric.token, label: metric.label, value: formatRange(metric.range.active) });
    }
  });
  return items;
}

function renderOptionCount(option: ListingFacetMetricOption, hasResolvedMetric: boolean) {
  if (!hasResolvedMetric) return null;
  return <span>{option.count}</span>;
}
```

Data flow:

- Active items derive from `resolved.metrics` and `resolved.searchQuery`, not
  from new persisted state.
- Missing metrics render no count or an explicit `Not loaded`-style state;
  server-provided `0` remains a truthful zero.
- Clear-all uses a stable `data-listing-filter-clear-all` hook and the existing
  runtime refresh path.
- Manual mode keeps the submit action visible. Auto-apply mode either hides the
  submit button or clearly labels it as an optional refresh, based on the final
  product decision.

Error handling:

- If there are no active items, hide the clear-all action.
- Clear-all must preserve unrelated query params and other listing query
  namespaces.
- If refresh fails, delegate to the TASK-273-05 error state rather than
  inventing a second failure UI.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged public runtime rendering.
- RBAC: unchanged.
- CSRF: unchanged because no write route is introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: new behavior labels/options must be schema-owned
  and bounded.
- Anti-abuse: active chips render escaped React text from normalized labels and
  values only; no raw HTML or script.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- Add focused runtime-script regression for clear-all URL behavior.
- `bun test tests/unit/widgets/validator.test.ts` if behavior schema fields are
  added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_TASKS/TASK-273-04_Active_Filters_Clear_All_Counts_and_Auto_Apply_State.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Users can see how many filters are active and clear the current filter set
  without editing the URL.
- Missing metrics do not look like truthful zero-result counts.
- Auto-apply mode does not present contradictory submit guidance.
- Clear-all preserves unrelated URL params and refreshes the same listing blocks
  as apply/auto-apply.
