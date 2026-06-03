# Search - Playwright Audit

Date: 31-05-2026  
Route: `/admin/search`

## What Was Clicked

- Sidebar Tools -> Search.
- Search input with empty, one-character, matching, and non-matching queries.
- Date range select: Last 7 days, Last 30 days, Last 12 months, All time.
- Result tabs: All, Pages, Content, Media, Users.
- Category checkboxes.
- Clear button.
- View All button for a result group.

## What Worked

- The route loaded and rendered the global search page.
- Empty input showed the expected prompt to type at least two characters.
- A one-character query stayed in the minimum-length state.
- A matching query returned a user result and rendered the Users category count.
- Deep pass: after creating and publishing a real page fixture, searching for
  its title returned the page in the UI.
- Tabs could be selected and reflected the selected state.
- Category checkboxes could be toggled.
- Clear reset the search field.
- A non-matching query rendered the no-results state.
- Recent search data was returned by the admin search API.
- Resolution pass on 2026-06-01 wired Date Range through the page state,
  `/admin/api/search`, and `searchAll`; the service now filters finite ranges
  by page/entry/user `updatedAt` and media `createdAt`.
- Resolution pass on 2026-06-01 added fallback `Try:` chips, aggregate Search
  response metadata, cause-specific empty states, and current-result category
  helper copy.
- Focused Playwright CLI proof on 2026-06-01 used temporary admin/page
  fixtures and verified: login 200, fallback `Try:` chip visible, recent page
  visible in the default range, older page hidden in `Last 7 days`, older page
  visible after switching to `All time`, and result click navigation to
  `/admin/pages/:id`.
- Result destination mapping is covered for page, entry, media, and user rows
  through `resolveSearchDestination`, with row prefetch/select callbacks covered
  in UI tests.

## What Did Not Work

### [ISSUE] Date range select does not affect search

Status: resolved in TASK-348 on 2026-06-01.

Evidence:

- Playwright selected every date range option.
- Result requests and result rendering did not change based on the selected
  range.

Why:

- `core/admin/ui/search/SearchPage.tsx` renders the date range select as an
  uncontrolled control.
- `useSearchResults` receives only the query and category filter state. The
  selected date range is not persisted in React state and is not sent to the
  search API.

How to fix:

- Add `dateRange` state to `SearchPage`.
- Pass the value into `useSearchResults`.
- Extend `searchClient` and the admin search route schema with a strict
  `dateRange` enum.
- Apply the range in the search service or remove the select until backend
  filtering exists.
- Add a UI/API regression test that changes the range and asserts the request
  query plus filtered results.

Resolution:

- `core/services/search/searchContract.ts` owns the strict `dateRange` enum,
  default, normalizer, and finite-range resolver.
- `core/services/search/searchService.ts` applies the selected range to page,
  content entry, media, and user timestamp predicates while preserving the
  `searchAll` `SearchItem[]` return contract.
- `core/server/routes/searchRoutes.ts` rejects unknown `dateRange` values with
  `search_date_range_invalid`, records the effective date range in recent-search
  metadata, and returns aggregate-only `meta`.
- `core/admin/ui/search/SearchPage.tsx` now controls the Date Range select and
  uses Search metadata for no-data/no-match/date-filter/category-filter copy.
- Regression coverage: `tests/unit/search/searchServiceDateRange.test.ts`,
  `tests/integration/routes/search.test.ts`,
  `tests/vitest/admin/searchClient.test.ts`,
  `tests/vitest/ui/search-page.test.tsx`,
  `tests/vitest/ui/search-results.test.tsx`, and
  `tests/vitest/ui/search-navigation.test.tsx`.

## Data Notes

- The first pass used an existing admin user because the checkout had little
  content.
- The follow-up pass created a published page fixture and verified Search found
  it by title. The fixture was deleted after the test.
- Result navigation has unit/UI proof for supported admin destinations and
  focused Playwright proof for page-result navigation from `/admin/search`.

## Source References

- `core/admin/ui/search/SearchPage.tsx`
- `core/admin/ui/search/useSearchResults.ts`
- `core/admin/services/searchClient.ts`
- `core/server/routes/searchRoutes.ts`
- `core/services/search/searchContract.ts`
- `tests/unit/search/searchServiceDateRange.test.ts`
- `tests/vitest/ui/search-navigation.test.tsx`
- `tests/vitest/ui/search-results.test.tsx`
