# TASK-277-07: Posts Feed Pagination, Author, Date, and Featured-First Filters

# FileName: TASK-277-07_Posts_Feed_Pagination_Author_Date_and_Featured_First_Filters.md

**Priority:** Medium
**Category:** Widgets + Posts Feed + Runtime Resolver + Public UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-277, TASK-277-01, TASK-277-02, TASK-277-04, TASK-277-05
**Status:** Done (2026-05-19)

---

## Overview

Expand Posts Feed source behavior beyond the current fixed-limit list after the
baseline source, media, picker, and preview fixes are stable.

This leaf owns product-scope source expansion only for `posts-feed`: author
filtering, date-range filtering, featured-first ordering, and the expansion of
the already-shared pagination contract from `view-all` into `paged` /
`load-more`.

If an analogous shared `content-list` pagination truthfulness residual is
confirmed while implementing this leaf, route it to a named shared follow-up
task instead of reopening `core/services/content/contentListResolver.ts`
directly in TASK-277.

## Source Findings

- BF-02 pagination / Load more:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:223-224,317`.
- BF-04 author filter:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:229-230,318`.
- BF-07 date-range filter:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:239-240,319`.
- BF-08 featured-first sort:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:242-243`.
- Current source model is latest/featured/category/manual with `limit` and
  current sort options only:
  `core/widgets/core/postsFeed.tsx:24-31,95-122,190-197`.
- Shared `ContentListData.pagination` already owns `mode`, `pageSize`,
  `viewAllHref`, `viewAllLabel`, and `loadMoreLabel`:
  `core/widgets/core/contentList.tsx:56-62`.
- Current Posts Feed runtime owner filters, orders, and paginates in the
  extracted mapper:
  `core/services/content/postsFeedRuntime.ts:272-301,383-442`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/postsFeed.tsx` | Add source fields for author/date/featured-first and extend the shared pagination object only after defining backward-compatible defaults. |
| `core/services/content/postsFeedRuntime.ts` | Apply deterministic filters and ordering before slicing/pagination, emit shared `resolved.runtime.page*` data, keep `resolved.listPath` truthful, grow `load-more` cumulatively, and ignore stale `cl.<block>.page` params for `view-all`. |
| `core/server/publicSite.tsx` | Pass `runtimeSearchParams` and `blockId` into Posts Feed SSR hydration so pagination links resolve through the same bounded runtime path as public `content-list`. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add bounded source controls plus shared pagination mode/page-size copy that matches actual runtime behavior. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover source filtering, sort, pagination, normalization, and legacy payloads. |
| `tests/integration/runtime/posts-feed-runtime-pagination.test.ts` | Prove public SSR honors `runtimeSearchParams + blockId` for `load-more` and ignores stale page params for `view-all`. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover editor controls and validation copy. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document expanded source behavior. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Record fixed/deferred evidence for BF-02, BF-04, BF-07, and BF-08. |

## Implementation Pseudocode

```ts
type PostsFeedSource = {
  mode?: PostsFeedSourceMode;
  authorId?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
  featuredFirst?: boolean;
};

type PostsFeedPagination = Pick<
  ContentListData["pagination"],
  "mode" | "pageSize" | "viewAllHref" | "viewAllLabel" | "loadMoreLabel"
>;

function applyPostsFeedFilters(posts: PostSummary[], source: PostsFeedSource) {
  return posts
    .filter((post) => matchesAuthor(post, source.authorId))
    .filter((post) => matchesDateRange(post, source.dateRange));
}

function sortPostsFeed(posts: PostSummary[], source: PostsFeedSource) {
  const sorted = sortPosts(posts, source.sort ?? "published-desc");
  return source.featuredFirst ? stableFeaturedFirst(sorted) : sorted;
}

function slicePostsForPagination(posts: PostSummary[], mode: PostsFeedPaginationMode, page: number, pageSize: number) {
  if (mode === "load-more") {
    return posts.slice(0, page * pageSize);
  }
  const offset = mode === "paged" ? (page - 1) * pageSize : 0;
  return posts.slice(offset, offset + pageSize);
}
```

Error handling:

- Invalid dates must normalize to empty filters and show editor feedback; do not
  persist invalid date strings as active filters.
- Pagination must reuse the shared `ContentListData.pagination` shape and must
  not request unbounded post counts.
- If an analogous shared `content-list` residual is discovered, route it to
  `TASK-323` instead of patching `content-list` ad hoc inside TASK-277.

## Security Contract

No new API routes are required by default.

- Endpoint visibility: none unless a later implementation proves a new internal
  preview/read route is required. If added, it must be internal admin-only.
- Auth model: unchanged admin session for editor reads; public rendering remains
  server-owned.
- RBAC: unchanged post-read/page-edit permissions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged or inherited from the existing posts read route
  if an internal read endpoint is reused.
- Reject-unknown validation: all new source fields must be schema-owned,
  normalized, bounded, and covered by validator tests.
- Anti-abuse: pagination limits must be clamped; filter strings must not become
  raw SQL/path/template input.
- Secret handling: no private author/session data in public payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/integration/posts/posts-runtime-flow.test.ts` when DB-backed
  posts runtime behavior changes and `DATABASE_URL` is reachable.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-277-07_Posts_Feed_Pagination_Author_Date_and_Featured_First_Filters.md`

## Acceptance Criteria

- Author/date/featured-first behavior is deterministic, normalized, and covered
  by tests.
- Pagination and Load More reuse the shared `ContentListData.pagination`
  contract, with `load-more` growing cumulatively across page hops and
  `view-all` ignoring stale `cl.<block>.page` params.
- Existing latest/featured/category/manual behavior remains backward compatible.
- Editor controls match the actual resolver behavior.
