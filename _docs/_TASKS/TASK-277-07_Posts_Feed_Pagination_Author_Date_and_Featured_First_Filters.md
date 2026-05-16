# TASK-277-07: Posts Feed Pagination, Author, Date, and Featured-First Filters

# FileName: TASK-277-07_Posts_Feed_Pagination_Author_Date_and_Featured_First_Filters.md

**Priority:** Medium
**Category:** Widgets + Posts Feed + Runtime Resolver + Public UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-277, TASK-277-01, TASK-277-02, TASK-277-04
**Status:** To Do

---

## Overview

Expand Posts Feed source behavior beyond the current fixed-limit list after the
baseline source, media, picker, and preview fixes are stable.

This leaf owns product-scope source expansion only for `posts-feed`: pagination
or load more, author filtering, date-range filtering, and featured-first
ordering.

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
- Current resolver filters by mode then slices to limit:
  `core/services/content/postsFeedResolver.ts:140-162,193-218`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/postsFeed.tsx` | Add source fields for author/date/featured-first/pagination only after defining backward-compatible defaults. |
| `core/services/content/postsFeedResolver.ts` | Apply deterministic filters and ordering before slicing/pagination. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add bounded source controls with beginner-safe copy. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover source filtering, sort, pagination, normalization, and legacy payloads. |
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
  pagination?: {
    enabled?: boolean;
    pageSize?: number;
    mode?: "load-more" | "paged";
  };
};

function applyPostsFeedFilters(posts: PostSummary[], source: PostsFeedSource) {
  return posts
    .filter((post) => matchesAuthor(post, source.authorId))
    .filter((post) => matchesDateRange(post, source.dateRange));
}

function sortPostsFeed(posts: PostSummary[], source: PostsFeedSource) {
  const sorted = sortPosts(posts, source.sort ?? "published-desc");
  return source.featuredFirst ? stableFeaturedFirst(sorted) : sorted;
}
```

Error handling:

- Invalid dates must normalize to empty filters and show editor feedback; do not
  persist invalid date strings as active filters.
- Pagination must not request unbounded post counts.
- If interactive Load More requires client runtime state beyond the current
  static renderer, document the required runtime owner and split it before
  implementation instead of faking pagination in markup.

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
- Pagination or Load More is either implemented through a real bounded runtime
  contract or explicitly split into a follow-up with a reason.
- Existing latest/featured/category/manual behavior remains backward compatible.
- Editor controls match the actual resolver behavior.
