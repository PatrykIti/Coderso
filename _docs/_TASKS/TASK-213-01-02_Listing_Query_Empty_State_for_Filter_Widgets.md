# TASK-213-01-02: Listing Query Empty State for Filter Widgets
# FileName: TASK-213-01-02_Listing_Query_Empty_State_for_Filter_Widgets.md

**Priority:** High
**Category:** Widget Editors + Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-213-01, TASK-194
**Status:** To Do

---

## Overview

Fix `BUG-10` from `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`.

Listing Filters and Search Box show `Loading listing queries...` in a way that
can look permanent when the query list resolves empty. This repeats the same
state-model problem previously fixed for page template options in `TASK-194`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- `core/admin/services/listingsClient.ts` only if cached client state requires a
  bounded empty/error result helper
- `tests/vitest/widgets/listingFilters.test.tsx`
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `tests/vitest/widgets/searchBox.test.tsx`
- `tests/vitest/ui/search-box-editor-wave.test.tsx`

## Implementation Direction

Keep the selector label stable and move transient loading into helper text that
disappears when the promise settles.

Pseudocode:

```ts
type ListingQueryLoadState =
  | { status: "loading"; items: [] }
  | { status: "ready"; items: ListingQueryRecord[] }
  | { status: "empty"; items: [] }
  | { status: "error"; items: []; message: string };

const status = loading
  ? "loading"
  : error
    ? "error"
    : items.length === 0
      ? "empty"
      : "ready";
```

Render contract:

- section title stays `Listing query`;
- select value can be `No listing query selected`;
- loading helper appears only while `status === "loading"`;
- empty helper appears when `status === "empty"` and should point editors toward
  `/admin/coderso/listings` through canonical admin href helpers when a link is
  added.

## Security Contract

- Visibility: internal admin widget editor.
- Auth model: unchanged admin session/API-key listing reads.
- RBAC: existing listing read permission.
- CSRF: no write route changes.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: `listingQueryId` remains empty string or a real
  listing query id; no UI sentinel persists.
- Anti-abuse: do not include raw listing query records, SQL, stack traces, or
  private filters in helper/error text.

## Testing Requirements

- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - loading helper appears while pending;
  - empty helper replaces loading after an empty success;
  - API errors render as errors, not empty states;
  - selecting/clearing query keeps normalized `listingQueryId`.
- `tests/vitest/ui/search-box-editor-wave.test.tsx`
  - same matrix for listing mode.
- Widget pure suites still pass for normalized empty query ids.
- Manual Playwright:
  - open Listing Filters and Search Box on a database with no listing queries;
  - verify loading disappears and empty guidance is visible.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md` closure note under `BUG-10`.
- `_docs/WIDGETS.md` if empty-state guidance becomes a shared widget editor
  rule.

## Acceptance Criteria

1. Listing Filters and Search Box cannot remain visually stuck on loading after
   the request resolves.
2. Empty, ready, loading, and error states are visually distinct.
3. Normalized data remains sentinel-free.
4. Tests cover both widget editors.
