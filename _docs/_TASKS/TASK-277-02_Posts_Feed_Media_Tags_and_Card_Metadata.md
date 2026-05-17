# TASK-277-02: Posts Feed Media, Tags, and Card Metadata

# FileName: TASK-277-02_Posts_Feed_Media_Tags_and_Card_Metadata.md

**Priority:** High
**Category:** Widgets + Posts Feed + Runtime Resolver + Public Render
**Estimated Effort:** Large
**Dependencies:** TASK-277, TASK-256, TASK-256-07, TASK-277-01
**Status:** To Do

---

## Overview

Add Posts Feed-owned thumbnail and tag data mapping so public cards can render
useful blog/editorial metadata through the existing shared Content List card
contract.

This leaf must update schema, defaults, normalizer, resolver mapping, editor
controls, and tests together. It must not change shared Content List image
aspect-ratio or navigational tag-link rendering; those renderer semantics stay
with TASK-256/shared Content List scope.

## Source Findings

- BUG-04 and BF-01: `fields.showImage` is hardcoded to false:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:142-147,220-221,276,296-297,313`.
- BUG-05 and A2: resolver does not map `imageSrc` / `imageAlt`:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:149-153,258`.
- BF-05 and the Posts Feed data portion of A4: resolver and mapper hardcode
  empty tags:
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:232-234,260,316`.
- A4 navigational tag-link rendering is excluded from this leaf because
  `ContentListBlock` currently renders tags as shared plain metadata text.
- BF-09 thumbnail aspect ratio controls are excluded because card image aspect
  is hardcoded inside shared `ContentListBlock` rendering.
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
| `core/widgets/core/postsFeed.tsx` | Add normalized `fields.showImage` and preserve media-resolved image/tag data through `mapPostsFeedToContentListData()`. |
| `core/services/content/contentMediaResolver.ts` | New shared helper extracted from `contentListResolver` for `readMediaCandidate` and cached media-id-to-url resolution. |
| `core/services/content/contentListResolver.ts` | Replace private media candidate helpers with imports from `contentMediaResolver` so existing Content List behavior remains covered. |
| `core/services/content/postsFeedResolver.ts` | Resolve bounded image src/alt through the shared media lookup seam and map bounded tag arrays from `PostSummary.tags`. |
| `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` | Add `Show image` toggle only; do not add image aspect controls in this Posts Feed leaf. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Cover normalizer, media-id-to-url resolution, URL candidate handling, tag mapping, showImage handoff, and legacy payload fallback. |
| `tests/vitest/ui/posts-feed-editor-wave.test.tsx` | Cover the editor image toggle and absence of Posts Feed-local aspect-ratio controls. |
| `_docs/_WIDGETS/POSTS_FEED.md` | Document media/tag fields and runtime mapping. |
| `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` | Record fixed evidence for media/tag data findings and defer shared aspect/tag-link renderer findings to TASK-256. |

## Implementation Pseudocode

```ts
type PostsFeedFields = {
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showCta?: boolean;
  showImage?: boolean;
};

async function resolvePostImage(
  post: PostSummary,
  mediaCache: Map<string, ResolvedMedia | null>
) {
  const data = isRecord(post.data) ? post.data : {};
  const candidate =
    readMediaCandidate(data.thumbnail) ??
    readMediaCandidate(data.thumbnailSrc) ??
    readMediaCandidate(data.featuredImage) ??
    readMediaCandidate(data.imageSrc);
  const resolved = await resolveContentItemImage(candidate, mediaCache);
  if (!resolved.src) return {};
  return {
    imageSrc: resolved.src,
    imageAlt: firstString(resolved.alt, data.thumbnailAlt, data.featuredImageAlt, post.title),
  };
}

async function mapPostToRuntimeItem(
  post: PostSummary,
  pattern: string | null,
  mediaCache: Map<string, ResolvedMedia | null>
) {
  return {
    id: post.id,
    title: post.title,
    href: pattern ? buildDetailHref(pattern, post.slug, post.id) : undefined,
    ...await resolvePostImage(post, mediaCache),
    tags: normalizeTags(post.tags).slice(0, 8),
  };
}
```

Error handling:

- Treat media field strings such as `featuredImage` as media ids unless they are
  confirmed safe URLs by the shared media-candidate helper.
- Resolve media ids through `getMediaById`/the extracted shared helper with a
  per-request cache, matching the existing Content List resolver seam.
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
  media id may be emitted directly as a URL, and no raw HTML, script URLs, or
  unbounded class names may be accepted.
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

- Posts Feed can render thumbnails from real post data when `showImage` is true,
  including media-id backed `featuredImage` values resolved through the existing
  media lookup seam.
- Missing media never renders a broken image.
- Tags are bounded, normalized, and passed through to the existing card metadata
  path; navigational tag-link rendering is explicitly routed to shared
  Content List/TASK-256 scope.
- Existing posts-feed payloads remain valid and render with stable defaults.
