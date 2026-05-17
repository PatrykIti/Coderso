# TASK-273-05: Pagination, Page Reset, Loading, and Error State

# FileName: TASK-273-05_Pagination_Page_Reset_Loading_and_Error_State.md

**Priority:** High
**Category:** Widgets + Listing Filters + Runtime Script + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-273-01, TASK-273-04
**Status:** To Do

---

## Overview

Complete the Listing Filters runtime refresh loop: expose a pagination control
for the existing `__page` token, reset page state when filters/search/sort
change, show loading during AJAX refresh, and render an inline error instead of
falling straight back to a full page reload.

This leaf owns only Listing Filters runtime UX and URL behavior. It must reuse
the existing listing runtime request path with the `x-nextless-runtime: listing`
header.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:71-74` - `__page` already
  exists in the runtime token namespace.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:92` - no pagination
  control is rendered.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:98-101` - no loading state,
  no inline network error, and no page reset when filters change.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:133` - `syncListingFormToUrl`
  does not clear `__page` on filtering.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:330,334` - pagination and
  page reset are priority repairs.
- `core/widgets/core/listingRuntimeScript.ts:55-81` - sync clears all query
  tokens and rebuilds current controls without page-reset intent.
- `core/widgets/core/listingRuntimeScript.ts:102-122` - fetch failures call
  `window.location.assign()`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingFilters.tsx` | Extend `resolved` schema/data with current page, page size, total items, total pages, pagination render contract, and loading/error containers or markers. |
| `core/services/search/listingRuntimeService.ts` | Preserve runtime result `total`/pagination metadata, clamp page/page-size inputs, and return metadata needed by the widget. |
| `core/server/publicSite.tsx` | Pass pagination metadata from the listing runtime service into `ListingFiltersData.resolved` during public runtime rendering. |
| `core/widgets/core/listingRuntimeScript.ts` | Add page-reset rules, pagination binding, busy state, stale-response guard, and inline error rendering; scope Listing Filters-only behavior to local markers or prove Search Box no-regression. |
| `core/services/search/filterContract.ts` | Reuse `listingRuntimeTokens.page`; add helpers only if needed for consistent page token names. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover pagination markup and runtime markers. |
| `tests/vitest/widgets/listingRuntimeScript.test.ts` | Cover page reset, pagination clicks, busy/error state, stale response guard, unrelated-param preservation, and Search Box listing-mode no-regression cases. |
| `tests/vitest/ui/listing-filters-query-parser.test.ts` | Cover page-token parsing, clamping, and reset behavior in the pure query parser lane. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document pagination and refresh behavior. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Mark B-02, B-08, B-09, B-11, and T-09 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type ListingFiltersPagination = {
  enabled?: boolean;
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  previousLabel?: string;
  nextLabel?: string;
};

type ListingFiltersResolved = {
  listingQueryId?: string;
  metrics?: ListingFacetMetric[];
  searchQuery?: string;
  rejectedTokens?: string[];
  pagination?: ListingFiltersPagination;
  error?: string;
};

function syncListingFormToUrl(form, url, reason) {
  const queryId = readQueryId(form);
  const prefix = "lq." + queryId + ".";
  const previousPage = url.searchParams.get(toParamName(queryId, "__page"));
  clearQueryPrefix(url.searchParams, prefix);
  writeControlValues(form, url);
  if (reason === "paginate" && previousPage) {
    url.searchParams.set(toParamName(queryId, "__page"), previousPage);
  }
}

async function runListingRefresh(queryId, targetUrl, pushHistory) {
  const requestId = startBusyState(queryId);
  try {
    const response = await fetch(targetUrl.toString(), { headers: { "x-nextless-runtime": "listing" } });
    if (!response.ok) return showListingRuntimeError(queryId, response.status);
    const html = await response.text();
    if (!isLatestRequest(queryId, requestId)) return;
    replaceListingBlocksFromHtml(queryId, html);
    pushHistoryState(targetUrl, pushHistory);
  } catch (error) {
    showListingRuntimeError(queryId, "network");
  } finally {
    finishBusyState(queryId, requestId);
  }
}
```

Data flow:

- Pagination writes only `lq.<queryId>.__page`.
- Public SSR passes `currentPage`, `pageSize`, `totalItems`, and `totalPages`
  from `listingRuntimeService` through `publicSite` into
  `ListingFiltersData.resolved.pagination`.
- Filter/search/sort changes remove `__page` so the listing starts again from
  page 1.
- Busy and error states are scoped by `data-listing-query-id`, not global page
  state.
- Refresh still replaces matching `[data-listing-block-id]` fragments.

Error handling:

- HTTP/network errors show a local retry/error message and keep the current DOM.
- A manual fallback link may be exposed, but the script should not immediately
  redirect before the user sees the failure.
- Stale responses from earlier requests must not overwrite newer filter state.

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
- `bun run test:vitest -- tests/vitest/ui/listing-filters-query-parser.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_TASKS/TASK-273-05_Pagination_Page_Reset_Loading_and_Error_State.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Users can navigate listing pages through the widget without manually editing
  `__page`.
- Pagination controls are backed by server-provided page/total metadata through
  the public runtime render path.
- Changing any non-page filter/search/sort control resets the page token.
- Runtime refresh visibly enters and exits a busy state.
- HTTP/network failures surface inline with retry/fallback behavior and do not
  immediately hide context through a full page redirect.
