# TASK-273-05: Pagination, Page Reset, Loading, and Error State

# FileName: TASK-273-05_Pagination_Page_Reset_Loading_and_Error_State.md

**Priority:** High
**Category:** Widgets + Listing Filters + Runtime Script + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-262-03, TASK-273-04, TASK-315
**Status:** Done (2026-05-19)

---

## Overview

Keep Listing Filters aligned with the live shared listing-runtime contract by
making the local widget surface explicit: preserve the existing linked-results
pagination owner, add deterministic local loading/error anchors for the shared
runtime client, and record the stale report assumptions around page reset so
the widget does not reopen shared `__page` ownership.

This leaf does not create a second pagination owner inside `listing-filters`.
Linked results already own `__page` navigation through Content List/TASK-262-03.
Shared refresh, busy/error, rebinding, and stale-response work route to
TASK-315; this leaf always lands Listing Filters-local markers, copy, and
report evidence so the shared runtime owner has deterministic DOM anchors to
target.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:71-74` - `__page` already
  exists in the runtime token namespace.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:92` - report claims no
  pagination control is rendered, but the live linked-results owner already
  exists in Content List/TASK-262-03 rather than inside Listing Filters.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:98-101` - no loading state,
  and no inline network error are still open shared refresh concerns; the
  page-reset part is stale against the current live script.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:133` - page-reset claim is
  stale: the live runtime client already clears the `lq.<queryId>.*` namespace
  before rebuilding current control values.
- `core/widgets/core/contentList.tsx:795-819` - linked listing results already
  own Previous/Next pagination UI.
- `core/services/content/contentListResolver.ts:847-878` - linked listing
  results already compute `page`, `pageSize`, `totalPages`,
  `previousPageHref`, and `nextPageHref` from the shared listing runtime state.
- `core/widgets/core/listingRuntimeScript.ts:55-81` - sync clears all query
  tokens and rebuilds current controls, which already drops `__page` on
  non-page submissions.
- `core/widgets/core/listingRuntimeScript.ts:102-122` - fetch failures call
  `window.location.assign()`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingFilters.tsx` | Add deterministic Listing Filters-local loading/error marker slots and helper copy that TASK-315 can target without turning Listing Filters into a second refresh owner. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover local loading/error markers and prove Listing Filters does not become a second pagination owner. |
| `tests/vitest/widgets/listingRuntimeScript.test.ts` | Consume TASK-315 shared runtime evidence once the shared runtime owner binds the Listing Filters-local markers landed here. |
| `tests/unit/content/contentListResolver.test.ts` | Touch only if TASK-273 would otherwise change the linked-results pagination owner. It should not. |
| `tests/unit/widgets/contentList.test.tsx` | Touch only if Listing Filters-local changes would otherwise duplicate or regress the linked results pagination surface. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document linked-results pagination ownership and local loading/error behavior. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Record B-02/B-11/T-09 as current-state corrections or shared-owner evidence, and capture B-08/B-09 through TASK-315 plus local Listing Filters markers/copy. |

## Implementation Pseudocode

```tsx
function ListingFiltersBlock({ data, blockId }: Props) {
  const normalized = normalizeListingFiltersData(data);
  const listingQueryId = resolveListingFiltersRuntimeQueryId(normalized);

  return (
    <section data-listing-query-id={listingQueryId} data-listing-widget="listing-filters">
      <form data-listing-runtime-form data-listing-query-id={listingQueryId}>
        <div data-listing-runtime-status>
          <p data-listing-runtime-loading hidden>
            Updating linked results…
          </p>
          <p data-listing-runtime-error hidden>
            Could not refresh linked results. Try again.
          </p>
        </div>
      </form>
    </section>
  );
}
```

Data flow:

- The shared runtime client already clears `lq.<queryId>.*` before rebuilding
  current control values, so `__page` is removed on non-page submissions today.
- Linked results keep owning pagination UI and navigation metadata through
  Content List/TASK-262-03.
- Shared busy/error/stale-response logic lands in TASK-315; this leaf always
  contributes deterministic Listing Filters-local markers/copy while leaving the
  actual fetch lifecycle in the shared owner.

Error handling:

- Shared HTTP/network refresh errors route to TASK-315. Listing Filters may show
  local shared error copy, but it must not fork a second refresh owner.
- Do not add widget-local Previous/Next behavior or a second `__page` parser.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged public listing runtime fetch.
- RBAC: unchanged public page access rules for the rendered page.
- CSRF: unchanged because runtime refresh is a GET.
- Rate-limit bucket: unchanged existing public page/runtime read behavior.
- Reject-unknown validation: page token must be clamped to a positive integer
  before rendering/writing.
- Anti-abuse: do not expose raw error bodies in the DOM; keep error copy static
  or mapped from known codes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts`
- `bun test tests/unit/content/contentListResolver.test.ts` only if the linked
  results pagination owner changes. It should not.
- `bun test tests/unit/widgets/contentList.test.tsx` only if linked results
  pagination markup changes. It should not.
- `bun run gates:coderso`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_TASKS/TASK-273-05_Pagination_Page_Reset_Loading_and_Error_State.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Listing Filters does not become a second pagination owner; linked results keep
  rendering `__page` navigation through TASK-262-03.
- Current-state evidence records that non-page filter/search/sort submissions
  already drop `__page` through the live shared runtime client.
- Listing Filters renders deterministic local loading/error anchors that TASK-315
  can bind without introducing a second widget-local refresh contract.
- Listing Filters can expose local loading/error affordances, but shared
  busy/error/stale-response logic remains TASK-315-owned.
