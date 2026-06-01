# TASK-348-01: Search Date Range API and Service Contract
# FileName: TASK-348-01_Search_Date_Range_API_and_Service_Contract.md

**Priority:** High
**Category:** Admin Tools + Search + API + Service
**Estimated Effort:** Medium
**Dependencies:** TASK-348
**Status:** To Do

---

## Overview

Make the Search Date Range select truthful. The current UI lets users choose
Last 7 days, Last 30 days, Last 12 months, and All time, but the selected value
is not stored, not sent to `/admin/api/search`, and not applied by
`searchAll`.

## Sub-Tasks

- Add a shared Search date-range enum and normalizer in the Search service
  contract module.
- Store `dateRange` in `SearchPage` state instead of using `defaultValue`.
- Pass `dateRange` through `useSearchResults` and `searchClient.searchAll`.
- Parse and validate `dateRange` in `registerSearchRoutes`.
- Apply the selected range consistently to page, content entry, media, and user
  updated/created timestamps.
- Record selected `dateRange` in recent-search metadata only if that metadata is
  already intended to track request options.

## Files To Change

| File | Required change |
|---|---|
| `core/services/search/searchService.ts` | Own `SearchDateRange`, `normalizeSearchDateRange`, `resolveSearchDateRangeSince`, and extend `SearchOptions`. |
| `core/server/routes/searchRoutes.ts` | Parse `dateRange`, validate strict enum values, pass it to `searchAll`, and include it in recent-search metadata when applicable. |
| `core/admin/services/searchClient.ts` | Extend `searchAll` options with `dateRange` and serialize it as a query parameter. |
| `core/admin/ui/search/useSearchResults.ts` | Accept `dateRange`, include it in effect dependencies, and pass it to the client. |
| `core/admin/ui/search/SearchPage.tsx` | Store Date Range as controlled state and reset stale categories when the effective request changes. |
| `tests/integration/routes/search.test.ts` | Add route-level date-range validation/filter coverage. |
| `tests/vitest/admin/searchClient.test.ts` | Assert query-string serialization for each date range. |
| `tests/vitest/ui/search-page.test.tsx` | Assert the UI sends the selected range and refreshes rendered state. |

## Implementation Pseudocode

```ts
export const searchDateRanges = ["last-7-days", "last-30-days", "last-12-months", "all-time"] as const;
export type SearchDateRange = (typeof searchDateRanges)[number];

export function normalizeSearchDateRange(value: unknown): SearchDateRange {
  return searchDateRanges.includes(value as SearchDateRange)
    ? (value as SearchDateRange)
    : "last-7-days";
}

export function resolveSearchDateRangeSince(range: SearchDateRange, now = new Date()) {
  if (range === "all-time") return null;
  const days = range === "last-7-days" ? 7 : range === "last-30-days" ? 30 : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function searchAll(query: string, options: SearchOptions = {}) {
  const since = resolveSearchDateRangeSince(normalizeSearchDateRange(options.dateRange));
  const updatedFilter = since ? gte(table.updatedAtOrCreatedAt, since) : undefined;
  // Combine each existing text-search OR predicate with the date predicate by table.
}
```

Data flow:

- `SearchPage.dateRange` -> `useSearchResults(query, { limit, dateRange })`
  -> `searchClient.searchAll` -> `/admin/api/search?q=&limit=&dateRange=`
  -> `registerSearchRoutes` -> `searchService.searchAll`.

Error handling:

- Reject or normalize unknown date ranges before service execution. The route
  must not pass arbitrary strings into query construction.
- Keep limit clamped through `resolveSearchLimit`.
- If DB timestamps are missing for a legacy row, treat the row as outside
  finite ranges and included only in `all-time`.

Regression-test shape:

- Seed one published page updated inside the range and one outside the range.
- Assert `last-7-days` returns only the recent fixture.
- Assert `all-time` returns both fixtures.
- Assert the client serializes `dateRange=last-30-days`.
- Assert selecting a range in the UI triggers a new request with that value.

## Security Contract

- Endpoint visibility: internal admin `GET /admin/api/search`.
- Auth model: existing session cookie.
- RBAC: `content:read`.
- CSRF: not required for `GET`.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: strict enum for `dateRange`; `limit` remains
  clamped to the existing 1-50 range.
- Anti-abuse: no public write endpoint; nonce/signature/HMAC and reCAPTCHA do
  not apply.
- Privacy: user search keeps email matching through hashed/encrypted lookup and
  must not broaden PII exposure.

## Testing Requirements

- `bun test tests/integration/routes/search.test.ts`
- `bun run test:vitest -- tests/vitest/admin/searchClient.test.ts tests/vitest/ui/search-page.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update the Search report with the implemented date-range contract.
- Update user docs only if visible Date Range labels or default behavior change.

## Acceptance Criteria

- The Date Range select has one source of truth and no longer uses uncontrolled
  `defaultValue`.
- Requests include the selected range.
- Search results change deterministically when fixtures fall inside/outside the
  selected range.
- Unknown date-range values cannot reach DB query construction.
