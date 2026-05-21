# TASK-316: Shared Listing Query Picker Hook and Session-Settling Retry

# FileName: TASK-316_Shared_Listing_Query_Picker_Hook_and_Session_Settling_Retry.md

**Priority:** High
**Category:** Shared Admin UI + Listing Queries + Widget Editors
**Estimated Effort:** Medium
**Dependencies:** TASK-214-01-01, TASK-220-03-01
**Status:** Done (2026-05-20)

---

## Overview

Consolidate widget-side listing-query picker loading onto the shared
`useListingQueries()` owner and add bounded retry/manual refresh semantics for
the transient first-open auth/session-settling failure discovered during
TASK-273.

This shared task owns the fetch/retry/state contract for listing-query pickers.
Keep widget-local onboarding and diagnostics copy in the widget families. Do not
change route auth, session issuance, or permission policy here.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:151-159` - first-open
  Listing Filters query loading can show `Not authenticated`.
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:175-205` - local
  widget-specific `useListingQueries()` duplicates fetch/loading/error state.
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx:86-116` - Search Box
  duplicates the same widget-specific query loading logic.
- `core/admin/ui/listings/hooks/useListingQueries.ts:22-90` - shared owner
  already exists for listing-query list hydration and refresh.

## Sub-Tasks

- None. This is an execution-ready shared follow-up.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/listings/hooks/useListingQueries.ts` | Add bounded retry/manual refresh/session-settling handling without changing auth semantics or weakening errors. |
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Replace local query-loading hook with the shared owner and keep only Listing Filters-local setup guidance. |
| `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` | Replace local query-loading hook with the shared owner and keep only Search Box-local mode/picker copy. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover shared hook adoption, retryable loading errors, and local guidance copy. |
| `tests/vitest/ui/search-box-editor-wave.test.tsx` | Cover shared hook adoption and no-regression for Search Box listing mode. |
| Shared consumer tests (`tests/vitest/ui/listing-filters-editor-wave.test.tsx`, `tests/vitest/ui/search-box-editor-wave.test.tsx`, and `tests/vitest/ui/listings-page.test.tsx` when page-shell loading/error copy changes) | Cover the shared hook contract through more than one consumer, including retry/manual refresh behavior plus no-regression for existing listings admin pages. |
| `_docs/_TASKS/TASK-316_Shared_Listing_Query_Picker_Hook_and_Session_Settling_Retry.md` | Keep status/evidence current during execution. |
| `_docs/_TASKS/README.md` | Add this shared task and keep board statistics in sync. |

## Implementation Pseudocode

```ts
type UseListingQueriesOptions = {
  skip?: boolean;
  retryAuthOnce?: boolean;
};

export function useListingQueries(options?: UseListingQueriesOptions) {
  const [retryCountByReason, setRetryCountByReason] = useState<Record<string, number>>({});

  const refresh = useCallback(async ({ force = false, background = false, retryAuthOnce = false } = {}) => {
    try {
      return await listListingQueriesCached({ force });
    } catch (error) {
      if (retryAuthOnce && isTransientAuthListingQueryError(error) && !hasRetried(retryCountByReason, "auth")) {
        markRetried("auth");
        await delay(250);
        return await listListingQueriesCached({ force: true });
      }
      throw error;
    }
  }, [retryCountByReason]);

  return { items, isLoading, error, refresh };
}
```

Data flow:

- Shared hook stays the owner of cached list hydration, background refresh, and
  user-visible load/error state for listing-query pickers.
- Listing Filters and Search Box editors consume the shared hook instead of
  duplicating local fetch effects.
- Widget-local editor families keep their own onboarding copy, diagnostics, and
  section layout around the shared picker state.

Error handling:

- Retry at most once for auth-shaped transient failures that happen during
  immediate post-login/session-settling windows.
- Keep permanent auth/permission failures visible; do not swallow or relabel
  them as success.
- Expose a manual refresh path through the shared hook so editors can retry
  intentionally without reloading the entire page.

Regression-test shape:

```ts
test("shared listing query hook retries one transient auth-shaped failure once", async () => {
  const hook = renderUseListingQueriesWithSequence([authSettlingError, successResponse]);
  await hook.result.current.refresh({ retryAuthOnce: true });
  expect(hook.fetchCount()).toBe(2);
});

test("permanent auth failures stay visible after the bounded retry path", async () => {
  const hook = renderUseListingQueriesWithSequence([authDeniedError, authDeniedError]);
  await expect(hook.result.current.refresh({ retryAuthOnce: true })).rejects.toMatchObject({
    status: 401,
  });
});
```

## Security Contract

No API routes are added.

- Endpoint visibility: unchanged internal admin listing-query read route.
- Auth model: unchanged authenticated admin UI session.
- RBAC: unchanged `content:read` listing-query permissions.
- CSRF: unchanged because no write route is introduced.
- Rate-limit bucket: unchanged existing admin read bucket.
- Reject-unknown validation: no payload schema changes are introduced here.
- Anti-abuse: retry logic must stay bounded and must not create unbounded client
  polling loops against admin listing-query routes.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listings-page.test.tsx` when page-shell loading/error copy changes
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_TASKS/TASK-316_Shared_Listing_Query_Picker_Hook_and_Session_Settling_Retry.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/870-2026-05-20-task-273-listing-filters-and-shared-runtime-wave.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Listing Filters and Search Box no longer ship local duplicated
  `useListingQueries()` implementations.
- Transient first-open auth/session-settling failures have one bounded retry or
  a manual retry path through the shared hook.
- Shared hook consumers keep permanent auth/permission failures visible and do
  not weaken the existing admin auth contract.
