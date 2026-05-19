# TASK-277-05: Posts Feed Section Header, View All, and Editorial Chrome

# FileName: TASK-277-05_Posts_Feed_Section_Header_View_All_and_Editorial_Chrome.md

**Priority:** Medium
**Category:** Widgets + Posts Feed + Public Render + Editorial UX
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-277-01, TASK-277-02, TASK-277-04
**Status:** Done (2026-05-19)

---

## Overview

Add Posts Feed-specific editorial chrome: optional section heading, optional
"View all posts" link through the shared pagination contract, and bounded visual
motion.

This leaf must stay local to Posts Feed. Reuse the existing shared
`ContentListData.title`, `description`, and `pagination.viewAll*` contract
instead of inventing a second section/View All model.

## Source Findings

- BF-03 "View all" link is missing:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:226-227,314`.
- BF-06 section heading is missing:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:236-237,315`.
- BF-10 entry animations are missing:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:248-249`.
- Current Posts Feed renderer delegates directly to `ContentListBlock`:
  `core/widgets/core/postsFeed.tsx:385-405`.
- Current Posts Feed schema has no section/content chrome:
  `core/widgets/core/postsFeed.tsx:24-58,95-188`.
- Shared `ContentListData` already owns section title/description and View All
  pagination fields:
  `core/widgets/core/contentList.tsx:38-84`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/postsFeed.tsx` | Add optional `title`/`description`, reuse the shared `pagination.viewAll*` model, and add a bounded animation enum without duplicating shared card rendering. |
| `core/services/content/postsFeedRuntime.ts` | Provide `resolved.listPath` from the enabled posts list route so the shared View All fallback can stay truthful. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add beginner-safe section/header and View All controls that map to the existing shared pagination contract. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover section chrome rendering, safe View All href, omitted state, and legacy payload normalization. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover controls and toggles. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document section chrome and View All behavior. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Record fixed/deferred evidence for BF-03, BF-06, and BF-10. |

## Implementation Pseudocode

```ts
type PostsFeedChrome = Pick<ContentListData, "title" | "description" | "pagination"> & {
  style?: {
    motion?: "none" | "fade" | "slide-up";
  };
};

function mapPostsFeedToContentListData(data: PostsFeedData): ContentListData {
  return normalizeContentListData({
    title: resolveOptionalString(data.title),
    description: resolveOptionalString(data.description),
    pagination: {
      mode: data.pagination?.mode ?? "none",
      viewAllHref: data.pagination?.viewAllHref ?? "",
      viewAllLabel: data.pagination?.viewAllLabel ?? "View all posts",
    },
    // ...existing Posts Feed mapping
  });
}
```

Error handling:

- If no View All href can be resolved from either `pagination.viewAllHref` or
  the shared `resolved.listPath` fallback, do not render an empty or `#` link.
- Keep motion as a bounded enum such as `none`, `fade`, `slide-up`; do not accept
  arbitrary class names.
- Preserve no-heading legacy output for existing payloads.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new section/viewAll/style fields must be schema
  owned and reject unknown payloads.
- Anti-abuse: View All href must pass existing safe href behavior; no raw HTML or
  unbounded classes.
- Secret handling: no private route or token data in widget payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` if public
  page render assertions change.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-277-05_Posts_Feed_Section_Header_View_All_and_Editorial_Chrome.md`

## Acceptance Criteria

- Posts Feed can render an optional section heading/description without affecting
  existing payloads.
- View All links reuse the shared pagination contract, resolve from explicit
  safe hrefs or existing posts list routes, and omit unresolved links.
- Motion settings are bounded and optional.
- Tests cover render, editor, schema, and omitted/legacy states.
