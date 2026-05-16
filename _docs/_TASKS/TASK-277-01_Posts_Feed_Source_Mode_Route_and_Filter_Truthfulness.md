# TASK-277-01: Posts Feed Source Mode, Route, and Filter Truthfulness

# FileName: TASK-277-01_Posts_Feed_Source_Mode_Route_and_Filter_Truthfulness.md

**Priority:** High
**Category:** Widgets + Posts Feed + Runtime Resolver + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-256-07, TASK-256-08
**Status:** To Do

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
- Current resolver manual mode bypasses sorting:
  `core/services/content/postsFeedResolver.ts:209-210`.
- Current fallback route is hardcoded:
  `core/services/content/postsFeedResolver.ts:91-96`.
- Current category field placeholder lives in the editor:
  `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:232-247`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/services/content/postsFeedResolver.ts` | Make category filtering and detail-route fallback deterministic and tested. Preserve manual order while documenting that sort is ignored for manual mode. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Hide or disable Sort in manual mode with the hint `Order is determined by your selection.`; align category placeholder with resolver behavior. |
| `core/widgets/core/postsFeed.tsx` | Update schema/defaults only if the selected category strategy adds fields. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover manual-sort suppression, category term behavior, and detail href fallback/configured route behavior. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover manual source UI hint and category placeholder/field behavior. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document source-mode route/category behavior. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Mark BUG-01, BUG-03, and BUG-07 fixed/deferred with evidence. |

## Implementation Pseudocode

```ts
function resolveCategoryTerms(input: string): string[] {
  return input
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 8);
}

function filterByCategory(posts: PostSummary[], category: string) {
  const terms = resolveCategoryTerms(category);
  if (terms.length === 0) return posts;
  return posts.filter((post) => {
    const tags = normalizeTags(post.tags);
    return terms.some((term) => tags.some((tag) => tag.includes(term)));
  });
}

function resolvePostsDetailPathPattern(routes: ContentRouteSetting[]) {
  const route = routes.find((item) => item.enabled && isPostsRouteType(item.type));
  if (route?.detailPath) return route.detailPath;
  return "/posts/:slug"; // only if this matches the current public route contract
}
```

If the implementation chooses single-category semantics instead of multi-term
parsing, change the placeholder to a single example such as `e.g. news` and add
tests proving comma input is not advertised. Do not leave the report mismatch
ambiguous.

Error handling:

- If no configured post detail route exists, do not generate a link that is known
  to 404. Prefer a documented deterministic fallback that matches the current
  public posts route, or suppress CTA links and surface a report/docs note.
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
- Category UI copy matches actual resolver behavior.
- Posts Feed detail links either resolve through `site.contentRoutes` or a tested
  route-compatible fallback; the report no longer reproduces the `/post/:slug`
  404.
- Tests cover configured route, fallback/no-route behavior, manual mode, and the
  chosen category strategy.
