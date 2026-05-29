# TASK-343-18: Listing Filters Audit Remediation Family

# FileName: TASK-343-18_Listing_Filters_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Listing Filters + Admin UI + Runtime + A11y + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the Listing Filters report drift where checkbox/radio/taxonomy facets have
no UI path to add options, empty facets render without enough main-canvas
explanation, and the public renderer misses basic accessible names.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_LISTING_FILTERS_WIDGET.md:189-225,265-294`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/widgets/core/listingFilters.tsx`

## Sub-Tasks

- [ ] Add a bounded option-authoring path for checkbox, radio, and taxonomy
  facets, or make the support/runtime-only ownership explicit and non-misleading.
- [ ] Show a clear empty-facet explanation in the main canvas, not only Wizard
  preview.
- [ ] Add accessible names for the public `<section>` and `<form>`, and give the
  search input a stable `id`/label/autocomplete contract.
- [ ] Replace technical `support-owned` copy with author-facing wording while
  preserving support-owned field safety.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Add/clarify option ownership, empty-facet guidance, and author-facing copy. |
| `core/widgets/core/listingFilters.tsx` | Add accessible names and empty-facet runtime explanation. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover a11y naming and empty-facet rendering. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover option authoring/support-owned guidance and empty-facet editor UX. |

## Implementation Pseudocode

```ts
function resolveFacetOptionOwnership(facet: ListingFilterFacet) {
  if (facet.options?.length) return { mode: "editable", options: facet.options };
  if (facet.kind === "checkbox" || facet.kind === "radio" || facet.kind === "taxonomy") {
    return { mode: "needs_options", reason: "No runtime options resolved yet" };
  }
  return { mode: "not_applicable" };
}

function resolveListingFiltersA11y(data: ListingFiltersData, blockId: string) {
  const titleId = data.title ? `listing-filters-${blockId}-title` : undefined;
  return titleId ? { "aria-labelledby": titleId } : { "aria-label": "Listing filters" };
}
```

These helpers are new task-level implementation targets. If bounded option
authoring is not added, replace current "re-open setup to add option rows" copy
with explicit runtime/support-owned wording so the editor does not promise a
non-existent daily authoring path.

## Regression Test Shape

- Empty checkbox/radio/taxonomy facets show actionable guidance in canvas.
- Section/form/search controls have accessible names.
- Option ownership cannot imply daily authoring if options remain support-owned.

## Security Contract

No API routes are added. Filter option values must remain bounded strings and
must not introduce raw query/operator passthrough.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_LISTING_FILTERS_WIDGET.md`.
- Update `_docs/_WIDGETS/LISTING_FILTERS.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Authors are not left with unexplained empty facets.
- Listing Filters exposes accessible public region/form/search semantics.
- Option ownership is truthful for both daily authors and support-owned data.
