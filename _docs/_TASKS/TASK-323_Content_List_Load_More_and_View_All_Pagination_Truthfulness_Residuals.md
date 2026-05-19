# TASK-323: Content List Load More and View All Pagination Truthfulness Residuals

# FileName: TASK-323_Content_List_Load_More_and_View_All_Pagination_Truthfulness_Residuals.md

**Priority:** High
**Category:** Widgets + Shared Content List + Runtime Resolver
**Estimated Effort:** Large
**Dependencies:** TASK-262, TASK-277
**Status:** To Do

---

## Overview

Repair the shared `content-list` legacy pagination residual that remained after
TASK-262 and was reconfirmed while implementing TASK-277.

This task must stay shared. Do not patch `core/services/content/contentListResolver.ts`
ad hoc inside a single widget family once the same truthfulness problem is
confirmed across `content-list` consumers.

## Source Findings

- Shared `load-more` currently reuses page navigation links but still slices
  only the current page in the legacy Content List resolver:
  `core/services/content/contentListResolver.ts:847-857`.
- Shared `view-all` still reads stale `cl.<block>.page` params in legacy mode
  instead of always rendering the first bounded slice:
  `core/services/content/contentListResolver.ts:849-857`.
- Shared renderer already exposes the right public link affordance; the residual
  is the legacy resolver/runtime truthfulness, not the visible link component:
  `core/widgets/core/contentList.tsx:795-840`.
- TASK-277 fixed the local Posts Feed runtime owner separately:
  `core/services/content/postsFeedRuntime.ts:406-425`.

## Sub-Tasks

- None. This is an execution task.

## Files to Change

| File | Required change |
|---|---|
| `core/services/content/contentListResolver.ts` | Make legacy `load-more` cumulative across page hops and force legacy `view-all` to ignore stale block page params while keeping bounded page sizes. |
| `tests/unit/content/contentListResolver.test.ts` | Cover cumulative `load-more` slicing, `view-all` page-param suppression, and stable runtime navigation metadata. |
| `tests/vitest/site/publicRenderer.test.tsx` | Update only if shared rendered markers or public HTML assertions change. |
| `tests/integration/runtime/pages-runtime.test.ts` or a dedicated runtime file | Add a public SSR proof for the shared legacy `content-list` owner if query-param handoff is touched. |
| `_docs/_WIDGETS/CONTENT_LIST.md` | Document the corrected `load-more` / `view-all` runtime semantics. |
| `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` | Record the residual as fixed once the shared owner lands. |

## Implementation Pseudocode

```ts
const currentPage =
  paginationMode === "paged" || paginationMode === "load-more"
    ? resolveContentListRequestedPage(runtimeSearchParams, pageKey)
    : 1;

const sliceStart = paginationMode === "paged" ? (currentPage - 1) * pageSize : 0;
const sliceEnd =
  paginationMode === "load-more" ? currentPage * pageSize : sliceStart + pageSize;

const sliced = sorted.slice(sliceStart, sliceEnd);
```

Error handling:

- Keep page params clamped and allowlisted.
- `view-all` must never render later-page subsets because of a stale
  `cl.<block>.page` query.
- `load-more` must grow cumulatively through a real bounded runtime path, not a
  label-only link to a replacement page.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged public read path only.
- Reject-unknown validation: unchanged shared pagination schema.
- Anti-abuse: keep page/pageSize clamped and keep safe href behavior intact.
- Secret handling: no private query or draft data in public runtime payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun test tests/unit/content/contentListResolver.test.ts`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` if public
  renderer output changes
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md`
- `_docs/_TASKS/TASK-323_Content_List_Load_More_and_View_All_Pagination_Truthfulness_Residuals.md`

## Acceptance Criteria

- Shared legacy Content List `load-more` grows cumulatively across page hops.
- Shared legacy Content List `view-all` ignores stale `cl.<block>.page` params.
- Public SSR and unit coverage prove the corrected shared semantics.
