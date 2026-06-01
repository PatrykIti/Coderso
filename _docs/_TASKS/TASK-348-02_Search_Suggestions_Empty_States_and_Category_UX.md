# TASK-348-02: Search Suggestions, Empty States, and Category UX
# FileName: TASK-348-02_Search_Suggestions_Empty_States_and_Category_UX.md

**Priority:** High
**Category:** Admin Tools + Search + UX + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-348-01
**Status:** To Do

---

## Overview

Resolve the Claude UX findings that make Search feel unfinished:

- `Try:` can render without chips.
- `No results for "test"` does not explain the cause.
- Category helper copy still says categories appear after search even after a
  search has completed.

This leaf must keep the UI compact and admin-like. Do not add a landing-page
style help panel.

## Sub-Tasks

- Add deterministic fallback suggestion chips when recent searches are empty.
- Add API/service response metadata needed to distinguish no indexed/searchable
  content from a non-matching query.
- Split Search empty states into: minimum query length, loading, error, no
  indexed searchable data, no match, and filtered-out results.
- Update Category copy after a completed query so it names the real state:
  no categories for current results, filters removed categories, or categories
  available.
- Make selected category filters visibly part of the empty-state explanation.
- Ensure result counts and tab counts do not imply hidden results when category
  filters remove all rows.

## Files To Change

| File | Required change |
|---|---|
| `core/services/search/searchService.ts` | Add a pure/search-safe metadata helper such as `hasSearchableContent` and pre-filter result counts without exposing private row data. |
| `core/server/routes/searchRoutes.ts` | Return metadata alongside `items`/`categories` so the UI can distinguish empty-index from no-match states. |
| `core/admin/services/searchClient.ts` | Type the response metadata and keep unknown fields rejected at the route boundary. |
| `core/admin/ui/search/SearchPage.tsx` | Add fallback suggestions, cause-specific empty-state derivation, and category helper copy. |
| `core/admin/ui/search/SearchResults.tsx` | Accept optional empty-state reason/copy or expose a typed helper that `SearchPage` can use. |
| `core/admin/ui/search/useSearchResults.ts` | Expose `hasCompletedSearch` or equivalent request-settled state without mount-force refetch loops. |
| `tests/integration/routes/search.test.ts` | Cover empty-index metadata, no-match metadata, and filtered result counts. |
| `tests/vitest/ui/search-page.test.tsx` | Cover fallback chips, stale Category copy, and filter-too-narrow copy. |
| `tests/vitest/ui/search-results.test.tsx` | Cover empty-state rendering and `onViewAll` behavior with zero groups. |

## Implementation Pseudocode

```tsx
const fallbackSuggestions = ["pages", "media", "users"];

function resolveSearchEmptyState(input) {
  if (!input.shouldSearch) return { kind: "min-length", message: "Type at least 2 characters." };
  if (input.loading) return { kind: "loading", message: "Searching..." };
  if (input.error) return { kind: "error", message: "Search failed. Try again." };
  if (input.hasCompletedSearch && input.meta?.hasSearchableContent === false) {
    return { kind: "no-data", message: "No searchable content yet." };
  }
  if (input.rawItems.length === 0) {
    return { kind: "no-match", message: `No results for "${input.query}".` };
  }
  if (input.filteredItems.length === 0) {
    return { kind: "filtered-out", message: "No results match the active filters." };
  }
  return null;
}

const suggestions = recentSearches.length > 0 ? recentSearches : fallbackSuggestions;
```

Data flow:

- Search route returns request metadata such as `hasSearchableContent`,
  `totalBeforeUiFilters`, and the effective `dateRange`.
- Search hook exposes request state and metadata.
- Page derives one empty-state reason from raw API items, category-filtered
  items, selected content tab, and category selection.
- `SearchResults` renders the supplied copy without guessing hidden state.

Error handling:

- If recent searches fail to load, keep the existing inline recent-error message
  and still render fallback suggestions.
- Metadata must be aggregate-only and must not expose private titles, emails, or
  hidden content rows.
- Do not clear a user's typed query just because suggestions fail.
- Do not show category filter chips for categories no longer present in the
  current API result set.

Regression-test shape:

- Mock no recent searches and assert fallback chips appear after `Try:`.
- Route-test an empty searchable dataset and assert `hasSearchableContent:
  false`.
- Route-test a populated dataset with a non-matching query and assert
  `hasSearchableContent: true` with zero items.
- Mock zero API items and assert no-match copy after a completed query.
- Mock populated API items plus a category filter that removes all rows and
  assert filter-too-narrow copy.
- Mock zero categories after a search and assert the helper no longer says
  "will appear after you search."

## Security Contract

No route changes are required by this leaf.

- Endpoint visibility: unchanged.
- Auth/RBAC/CSRF/rate-limit: unchanged from Search.
- Reject-unknown validation: unchanged for incoming parameters; new response
  metadata must be generated server-side from typed helpers.
- Anti-abuse: unchanged; no writes.
- Privacy: suggestion chips must come from recent-search strings already
  visible to the current authenticated user or static generic strings.
  Empty-state metadata must be aggregate-only.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/search-page.test.tsx tests/vitest/ui/search-results.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused Playwright Search pass for empty recent searches and no-result query

## Documentation Updates Required

- Update `REPORT_SEARCH.md` with UX resolution notes.
- Update `_docs/CMS_API.md` and `_docs/SEARCH_SPEC.md` for the Search response
  metadata if it becomes part of the admin API contract.
- Update user docs only if the visible empty-state wording materially changes
  documented behavior.

## Acceptance Criteria

- `Try:` never appears as an empty affordance.
- Empty states name the actual cause.
- No-indexed-data and no-match states are backed by route/service metadata, not
  guessed from an empty `items` array alone.
- Category helper text is not stale after a completed query.
- The implementation avoids synchronous effect-driven state churn under React
  Hooks lint rules.
