# TASK-315: Shared Listing Runtime Refresh and Block Replacement Contract

# FileName: TASK-315_Shared_Listing_Runtime_Refresh_and_Block_Replacement_Contract.md

**Priority:** High
**Category:** Shared Runtime + Widgets + Listing Queries + Content Surfaces
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-262-03
**Status:** Done (2026-05-20)

---

## Overview

Repair the shared listing-runtime browser contract owned by
`core/widgets/core/listingRuntimeScript.ts`.

This task exists because TASK-273 exposed that the runtime client no longer
belongs only to `listing-filters` and `search-box`: the same
`data-listing-query-id` refresh/replacement path also updates linked
`content-list` and `entry-teaser` blocks. Shared busy/error state, stale
response protection, rebinding after replacement, and block-selection scope must
land here with cross-widget coverage instead of being patched inside a single
widget family.

Keep widget-local product scope out of this task:

- do not add a second pagination UI owner inside `listing-filters`;
- do not widen Content List pagination beyond the existing TASK-262-03 contract;
- do not move widget-specific drawer/collapsible/product controls here unless
  they require shared refresh/rebinding semantics.

## Source Findings

- `core/widgets/core/listingRuntimeScript.ts:83-123` - shared block replacement,
  refresh, and redirect-on-error behavior are owned by one runtime client.
- `core/widgets/core/searchBox.tsx:268-327` - Search Box listing mode uses the
  same runtime form and script contract.
- `core/widgets/core/contentList.tsx:795-819,902-904` - Content List already
  renders listing pagination and participates in the shared query-id replacement
  path.
- `core/widgets/core/entryTeaser.tsx:826-828` - Entry Teaser also participates
  in the shared query-id replacement path.
- `_docs/_TASKS/TASK-273_Listing_Filters_Widget_Playwright_Product_Followups.md`
  - TASK-273 discovered that busy/error/stale-response/rebinding work is shared,
  not widget-local.

## Sub-Tasks

- None. This is an execution-ready shared follow-up.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingRuntimeScript.ts` | Add shared request lifecycle ownership: scoped busy/error hooks, stale-response guard, safe rebinding after fragment replacement, and no immediate full-page redirect on recoverable refresh failure. |
| `core/widgets/core/listingFilters.tsx` | Add local status/error marker slots only if the shared runtime client needs deterministic DOM anchors for Listing Filters. |
| `core/widgets/core/searchBox.tsx` | Keep listing-mode compatibility when shared runtime markers or rebinding semantics change. |
| `core/widgets/core/contentList.tsx` | Preserve linked-results replacement and pagination ownership while shared refresh behavior changes. |
| `core/widgets/core/entryTeaser.tsx` | Preserve linked-results replacement semantics when shared refresh behavior changes. |
| `tests/vitest/widgets/listingRuntimeScript.test.ts` | Create the shared runtime-client suite covering Listing Filters, Search Box, Content List, and Entry Teaser query-id replacement behavior. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover any new Listing Filters runtime status markers. |
| `tests/vitest/widgets/searchBox.test.tsx` | Cover listing-mode no-regression when the shared runtime client changes. |
| `tests/unit/widgets/contentList.test.tsx` | Cover Content List linked-results compatibility if markup/markers change. |
| `tests/unit/widgets/entryTeaser.test.tsx` | Cover Entry Teaser linked-results compatibility if markup/markers change. |
| `_docs/WIDGETS.md` | Update only if the shared listing runtime marker/refresh contract changes. |
| `_docs/_TASKS/TASK-315_Shared_Listing_Runtime_Refresh_and_Block_Replacement_Contract.md` | Keep status/evidence current during execution. |
| `_docs/_TASKS/README.md` | Add this shared task and keep board statistics in sync. |

## Implementation Pseudocode

```ts
type ListingRefreshState = {
  latestRequestId: number;
  isBusy: boolean;
};

const refreshStateByQueryId = new Map<string, ListingRefreshState>();

function startListingRefresh(queryId: string) {
  const next = (refreshStateByQueryId.get(queryId)?.latestRequestId ?? 0) + 1;
  refreshStateByQueryId.set(queryId, { latestRequestId: next, isBusy: true });
  setListingBusyState(queryId, true);
  clearListingRuntimeError(queryId);
  return next;
}

function finishListingRefresh(queryId: string, requestId: number) {
  const current = refreshStateByQueryId.get(queryId);
  if (!current || current.latestRequestId !== requestId) return;
  refreshStateByQueryId.set(queryId, { ...current, isBusy: false });
  setListingBusyState(queryId, false);
}

async function runListingRefresh(queryId: string, targetUrl: URL, pushHistory: boolean) {
  const requestId = startListingRefresh(queryId);
  try {
    const response = await fetch(targetUrl.toString(), {
      headers: { "x-nextless-runtime": "listing" },
    });
    if (!response.ok) {
      showListingRuntimeError(queryId, "refresh_failed");
      return;
    }
    const html = await response.text();
    if (!isLatestListingRequest(queryId, requestId)) return;
    replaceListingBlocksFromHtml(queryId, html);
    if (pushHistory) window.history.pushState({}, "", targetUrl.toString());
    bindListingForms();
    bindGlobalSearchForms();
  } catch {
    showListingRuntimeError(queryId, "refresh_failed");
  } finally {
    finishListingRefresh(queryId, requestId);
  }
}
```

Data flow:

- Listing Filters and Search Box continue to submit `lq.<queryId>.*` params
  through the shared runtime client.
- Content List and Entry Teaser keep participating through
  `data-listing-query-id` block replacement only; they do not become submit-form
  owners.
- Busy/error state is scoped by query id and deterministic DOM markers, not by a
  page-global spinner.
- Rebinding after replacement must stay idempotent and must not duplicate event
  listeners.

Error handling:

- Non-OK or network failures surface local shared refresh errors instead of
  forcing `window.location.assign()` immediately.
- Stale responses must never overwrite newer filter/search state.
- If a widget does not expose a local status/error marker, the shared runtime
  client must fail open without throwing.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged public listing runtime GET refresh path.
- RBAC: unchanged public page access rules.
- CSRF: unchanged because the shared refresh path is read-only GET.
- Rate-limit bucket: unchanged existing public page/runtime read behavior.
- Reject-unknown validation: no new runtime query tokens are introduced here.
- Anti-abuse: do not expose raw HTTP bodies or stack traces in the DOM; map
  runtime refresh failures to bounded shared copy.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/searchBox.test.tsx`
- `bun test tests/unit/widgets/contentList.test.tsx` when shared linked-results
  markup changes.
- `bun test tests/unit/widgets/entryTeaser.test.tsx` when shared linked-results
  markup changes.
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/WIDGETS.md` only if the shared listing runtime contract changes
- Any widget docs whose shared runtime markers/copy change (`LISTING_FILTERS`,
  `SEARCH_BOX`, `CONTENT_LIST`, `ENTRY_TEASER`)
- `_docs/_TASKS/TASK-315_Shared_Listing_Runtime_Refresh_and_Block_Replacement_Contract.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- Shared listing refresh no longer redirects immediately on recoverable
  HTTP/network failures.
- Shared refresh is idempotent and stale-response safe across Listing Filters,
  Search Box, Content List, and Entry Teaser.
- Listing Filters does not become a second pagination owner while this shared
  runtime task lands.
- Cross-widget coverage proves shared query-id replacement and rebinding still
  work after the refresh contract changes.
