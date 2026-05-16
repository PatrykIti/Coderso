# TASK-277-02: Posts Feed Media, Tags, and Card Metadata

# FileName: TASK-277-02_Posts_Feed_Media_Tags_and_Card_Metadata.md

**Priority:** High
**Category:** Widgets + Posts Feed + Runtime Resolver + Public Render
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-256, TASK-256-07, TASK-277-01
**Status:** To Do

---

## Overview

Add Posts Feed-owned thumbnail and tag mapping so public cards can render useful
blog/editorial metadata without leaving the shared Content List contract stale.

This leaf must update schema, defaults, normalizer, resolver mapping, editor
controls, and tests together.

## Source Findings

- BUG-04 and BF-01: `fields.showImage` is hardcoded to false:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:142-147,220-221,276,296-297,313`.
- BUG-05 and A2: resolver does not map `imageSrc` / `imageAlt`:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:149-153,258`.
- BF-05 and A4: resolver and mapper hardcode empty tags:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:232-234,260,316`.
- BF-09: thumbnail aspect ratio controls are missing:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:245-246`.
- Current Posts Feed schema has no `fields.showImage`:
  `core/widgets/core/postsFeed.tsx:32-37,123-131,198-203`.
- Current mapping hardcodes `showImage: false` and clears tags:
  `core/widgets/core/postsFeed.tsx:328-355`.
- Current resolver emits no image fields and clears tags:
  `core/services/content/postsFeedResolver.ts:165-178`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/postsFeed.tsx` | Add normalized `fields.showImage`, optional image aspect field, and preserve tags/images through `mapPostsFeedToContentListData()`. |
| `core/services/content/postsFeedResolver.ts` | Resolve bounded image src/alt and tag arrays from `PostSummary.data` / `PostSummary.tags`. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add `Show image` toggle and bounded image aspect controls where applicable. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover normalizer, resolver media/tag mapping, showImage handoff, and legacy payload fallback. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover the editor toggle and image aspect controls. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document media/tag fields and runtime mapping. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Record fixed evidence for media/tag findings. |

## Implementation Pseudocode

```ts
type PostsFeedFields = {
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showCta?: boolean;
  showImage?: boolean;
};

function resolvePostImage(post: PostSummary) {
  const data = isRecord(post.data) ? post.data : {};
  const src = firstString(data.thumbnailSrc, data.featuredImage, data.imageSrc);
  if (!src) return {};
  return {
    imageSrc: src,
    imageAlt: firstString(data.thumbnailAlt, data.featuredImageAlt, post.title),
  };
}

function mapPostToRuntimeItem(post: PostSummary, pattern: string) {
  return {
    id: post.id,
    title: post.title,
    href: buildDetailHref(pattern, post.slug, post.id),
    ...resolvePostImage(post),
    tags: normalizeTags(post.tags).slice(0, 8),
  };
}
```

Error handling:

- Ignore malformed media values instead of emitting unsafe or empty image URLs.
- If `showImage` is enabled but a post has no thumbnail, the card must render
  without a broken image.
- Preserve existing payloads where `fields.showImage` is absent by using a
  documented default.

## Security Contract

No API routes are added by this leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new fields must be schema-owned with
  `additionalProperties: false` and covered by validator tests.
- Anti-abuse: image URLs must flow through existing safe media/link behavior; no
  raw HTML, script URLs, or unbounded class names.
- Secret handling: no private media tokens or provider keys in widget payloads,
  admin cache, or Playwright reports.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` if public
  renderer output markers or snapshot assertions change.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`
- `_docs/_TASKS/TASK-277-02_Posts_Feed_Media_Tags_and_Card_Metadata.md`

## Acceptance Criteria

- Posts Feed can render thumbnails from real post data when `showImage` is true.
- Missing media never renders a broken image.
- Tags are bounded, normalized, and passed through to the existing card metadata
  path.
- Existing posts-feed payloads remain valid and render with stable defaults.
