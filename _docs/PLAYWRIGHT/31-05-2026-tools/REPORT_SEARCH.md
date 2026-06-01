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
- Tabs could be selected and reflected the selected state.
- Category checkboxes could be toggled.
- Clear reset the search field.
- A non-matching query rendered the no-results state.
- Recent search data was returned by the admin search API.

## What Did Not Work

### [ISSUE] Date range select does not affect search

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

## Data Notes

- The checkout had very little searchable content. The positive search path was
  validated against an existing admin user result.
- No content/page/media result drawer behavior could be meaningfully tested
  because the dataset was empty for those types.

## Source References

- `core/admin/ui/search/SearchPage.tsx`
- `core/admin/ui/search/useSearchResults.ts`
- `core/admin/api/searchClient.ts`
- `core/server/routes/admin/searchRoutes.ts`

