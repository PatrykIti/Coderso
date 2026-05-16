# TASK-272-02: Hero Video Poster and Media Metadata

# FileName: TASK-272-02_Hero_Video_Poster_and_Media_Metadata.md

**Priority:** High
**Category:** Widgets + Hero + Media + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-272-01
**Status:** To Do

---

## Overview

Add Hero-owned video metadata so inline and background videos can render with a
poster image, title/description metadata, and a video-specific editor flow.

This leaf does not own the shared required-image-alt baseline from TASK-256. It
may add Hero-specific image/video editor guidance, but image-alt enforcement and
safe media/link policy stay with TASK-256.

TASK-256-06-03 still owns broad Hero media safety, image-alt baseline, and
safe-link behavior. This leaf only owns Hero product metadata for video poster,
video title, and video description, plus the editor/runtime split between image
alt controls and video metadata controls.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:142-145` - BUG-04 no inline video
  poster field.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:157-160` - BUG-07 image alt text is
  still shown for video.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:208-209` - BF-01 video poster image.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:290` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Extend `HeroMedia` and `background.media` with `posterAssetId`, `posterSrc`, `title`, and `description` or a smaller equivalent metadata shape. Update `heroSchema`, `normalizeHeroData`, inline `<video>`, and background `<video>` rendering. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Replace `Media alt text` with image-only alt controls and video-only title/description/poster controls. Reuse `MediaPicker` with `accept={["image/*"]}` for posters. |
| `tests/vitest/widgets/hero.test.tsx` | Assert video poster/title/description are accepted by schema/normalizer and render on inline and background videos. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert video editor markup exposes video metadata and image editor markup still exposes image alt. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover video type switching, poster picking, poster clear, and no stale image-alt field in video mode. |
| `tests/unit/widgets/validator.test.ts` | Run and update only if the registry/schema assertions need explicit Hero field coverage. |
| `_docs/_WIDGETS/HERO.md` | Document Hero image alt vs video metadata. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark BUG-04/BUG-07/BF-01 fixed or record evidence. |

## Implementation Pseudocode

```ts
export type HeroMedia = {
  type: "none" | "image" | "video";
  source?: "library" | "external";
  assetId?: string;
  src?: string;
  alt?: string;
  posterAssetId?: string;
  posterSrc?: string;
  title?: string;
  description?: string;
  ratio?: string;
  overlay?: string;
};
```

Editor flow:

```tsx
{mediaType === "image" ? (
  <Input value={media.alt ?? ""} onChange={(event) => updateMedia({ alt: event.target.value })} />
) : null}

{mediaType === "video" ? (
  <VideoMetadataFields media={media} onChange={updateMedia} onClearPoster={...} />
) : null}
```

Runtime flow:

```tsx
<video
  controls
  src={media.src}
  poster={media.posterSrc}
  title={media.title || undefined}
  aria-describedby={media.description ? descriptionId : undefined}
/>
```

Error handling:

- Switching image -> video must preserve `src`/`assetId` only when the selected
  media is still video-compatible; otherwise keep current behavior and let the
  user pick a video.
- Poster clear removes `posterAssetId` and `posterSrc`; it must not write empty
  strings.
- Legacy Hero payloads without video metadata must still validate and render.
- Do not reuse image `alt` as the video title automatically unless the user
  explicitly keeps it through a documented compatibility adapter.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: Hero media/background-media schemas must remain
  `additionalProperties: false`; new fields require validator coverage.
- Anti-abuse: poster/video URLs use the same safe media source model as existing
  Hero media. Metadata is plain text, not raw HTML.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-02_Hero_Video_Poster_and_Media_Metadata.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Inline Hero video can render a poster image.
- Background Hero video can render a poster image if the browser uses it before
  playback.
- Video mode exposes video title/description/poster controls instead of image
  alt text.
- Image mode still exposes image alt guidance and remains compatible with the
  shared TASK-256 alt policy.
- Legacy Hero media payloads remain valid.
