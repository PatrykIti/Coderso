# TASK-277-01: Posts Feed Source Mode, Route, and Filter Truthfulness

# FileName: TASK-277-01_Posts_Feed_Source_Mode_Route_and_Filter_Truthfulness.md

**Priority:** High
**Category:** Widgets + Posts Feed + Runtime Resolver + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-256-07, TASK-256-08
**Status:** Done (2026-05-19)

---

## Overview

Repair Posts Feed source-mode truthfulness and post detail-link resolution.

This leaf owns the widget-local findings where the editor promises behavior the
resolver does not execute, or where the resolver creates broken post links.

## Source Findings

- BUG-01 manual source ignores Sort while the editor keeps Sort active:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:121-126`.
- BUG-03 category placeholder suggests comma-separated multi-tag input:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:135-140`.
- BUG-07 fallback detail links use `/post/:slug` and can 404:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:162-167,274,358`.
- Current Posts Feed runtime owner keeps manual mode order unsorted:
  `core/services/content/postsFeedRuntime.ts:291-301`.
- Current detail-route/list-path ownership now lives in the extracted runtime
  mapper:
  `core/services/content/postsFeedRuntime.ts:195-217,393-442`.
- Current category field placeholder lives in the editor:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:853-925`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/services/content/postsFeedRuntime.ts` | Make category filtering and detail-route fallback deterministic and tested. Preserve manual order while documenting that sort is ignored for manual mode, and omit CTA hrefs when no enabled posts detail route exists. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Hide or disable Sort in manual mode with the hint `Order is determined by your selection.`; narrow category copy to the chosen single-term contract. |
| `core/widgets/core/postsFeed.tsx` | Update schema/defaults only if the selected category strategy adds fields. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover manual-sort suppression, category term behavior, and detail href fallback/configured route behavior. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover manual source UI hint and category placeholder/field behavior. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document source-mode route/category behavior. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark BUG-01, BUG-03, and BUG-07 fixed/deferred with evidence. |

## Implementation Pseudocode

```ts
function normalizeCategoryKeyword(input: string) {
  return normalizeText(input);
}

function filterByCategory(posts: PostSummary[], category: string) {
  const keyword = normalizeCategoryKeyword(category);
  if (!keyword) return posts;
  return posts.filter((post) => {
    const tags = normalizeTags(post.tags);
    return tags.some((tag) => tag.includes(keyword));
  });
}

function resolvePostsDetailPathPattern(routes: ContentRouteSetting[]) {
  const route = routes.find((item) => item.enabled && isPostsRouteType(item.type));
  return route?.detailPath ?? null;
}

function resolvePostsFeedHref(post: PostSummary, routes: ContentRouteSetting[]) {
  const pattern = resolvePostsDetailPathPattern(routes);
  if (!pattern) return undefined;
  return buildDetailHref(pattern, post.slug, post.id);
}
```

Choose the narrower single-term category contract for this leaf. Change the
placeholder to a single example such as `e.g. news`, keep the existing
single-string schema, and add tests proving the editor does not advertise
comma-separated multi-term behavior.

Error handling:

- If no enabled post detail route exists in `site.contentRoutes`, do not generate
  a link that is known to 404. Suppress CTA hrefs for that item/list and surface
  the missing-route condition through report/docs evidence.
- If a configured route does not contain `:slug` or `:id`, preserve the existing
  safe fallback behavior and add regression coverage.

## Security Contract

No API routes are added by this leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: keep any new `posts-feed.source` fields inside the
  existing schema with `additionalProperties: false`.
- Anti-abuse: route interpolation must encode slug/id and must not accept raw
  user HTML or script URLs.
- Secret handling: no tokens or private route data in widget payloads or reports.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/integration/posts/posts-runtime-flow.test.ts` if detail-route
  behavior changes and `DATABASE_URL` is reachable.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-277-01_Posts_Feed_Source_Mode_Route_and_Filter_Truthfulness.md`

## Acceptance Criteria

- Manual mode no longer presents Sort as an active effective control.
- Category UI copy and tests match the chosen single-term resolver behavior.
- Posts Feed detail links resolve through enabled `site.contentRoutes`; when no
  route exists, CTA hrefs are omitted instead of falling back to `/post/:slug`.
- Tests cover configured route, fallback/no-route behavior, manual mode, and the
  chosen category strategy.
