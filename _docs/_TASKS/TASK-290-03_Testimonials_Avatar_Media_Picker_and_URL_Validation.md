# TASK-290-03: Testimonials Avatar Media Picker and URL Validation

# FileName: TASK-290-03_Testimonials_Avatar_Media_Picker_and_URL_Validation.md

**Priority:** High
**Category:** Widgets + Testimonials + Admin UI + Media
**Estimated Effort:** Large
**Dependencies:** TASK-256-06-03, TASK-290
**Status:** To Do

---

## Overview

Improve avatar authoring for Testimonials by using the existing Media Library
picker patterns and by validating manually entered avatar URLs.

This leaf covers:

- `REPORT_TESTIMONIALS_WIDGET.md:184-186` UX-06 Avatar URL lacks a Media
  Library picker.
- `REPORT_TESTIMONIALS_WIDGET.md:188-189` UX-07 Avatar URL accepts invalid text
  and gives no feedback.

Avatar image lazy loading and contextual alt text are excluded because
TASK-256-06-03 already owns those shared media accessibility/performance fixes.

## Scope Boundary

In scope:

- Add an avatar source decision that can support external URL and Media Library
  asset picking without breaking legacy `avatar` URL payloads.
- Reuse `MediaPicker` and `listMediaCached` patterns already used by Hero and
  Gallery Mosaic.
- Validate external avatar URLs with a safe `http`, `https`, or relative-path
  policy matching existing media/link helpers.
- Add editor feedback for invalid URLs and failed media lookup.
- Keep runtime rendering free of browser-only media service imports.

Out of scope:

- New media upload routes or media service behavior.
- Shared image lazy/alt behavior owned by TASK-256.
- External review-provider imports owned by TASK-290-07.

## Sub-Tasks

- [ ] Decide whether to extend each item with `avatarSource`/`avatarAssetId` or
  keep `avatar` as the normalized URL plus optional media metadata.
- [ ] Add Visual controls for Media Library selection and manual URL entry.
- [ ] Add inline invalid URL feedback and preserve fallback initials when an
  avatar cannot be used.
- [ ] Ensure legacy `avatar` strings keep rendering.
- [ ] Add UI tests with mocked `MediaPicker` and renderer tests for normalized
  media-backed avatar data.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Extend item schema/types/normalizer if media metadata is added; preserve legacy `avatar`. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add MediaPicker integration and URL validation feedback. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Mock MediaPicker and test avatar source selection, invalid URL feedback, and fallback behavior. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add normalization/render assertions for media-backed or URL-backed avatars. |
| `tests/vitest/ui/media-picker.test.tsx` | Run if MediaPicker integration props change. |

## Implementation Pseudocode

URL validation helper:

```ts
function isValidAvatarUrl(value: string | undefined) {
  if (!value || value.trim().length === 0) return true;
  if (value.startsWith("/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
```

Media picker flow:

```tsx
<MediaPicker
  value={testimonial.avatarAssetId ?? null}
  accept="image/*"
  onChange={(assetId) => {
    updateItem(value, onChange, index, {
      avatarAssetId: String(assetId),
      avatar: resolvedAssetUrl,
    });
  }}
/>
```

Error handling:

- Invalid external URLs do not crash the editor and produce inline feedback.
- Failed media lookup keeps the previous avatar and shows a non-blocking error.
- Runtime rendering still falls back to initials when no valid avatar URL is
  present.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new avatar metadata fields must be explicit in
  `testimonialsSchema`.
- Anti-abuse: reject `javascript:`, `data:`, and arbitrary protocol avatar URLs;
  do not accept raw HTML or inline handlers.
- Secret handling: no signed/private media URLs or provider tokens in widget
  JSON, diagnostics, or Playwright notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` if MediaPicker
  props or cache behavior change.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If committed separately from TASK-290-08, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TESTIMONIALS.md` with avatar source and URL validation
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` UX-06 and UX-07
  status after implementation.

## Changelog Policy

- Covered by the TASK-290 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors can pick testimonial avatars from Media Library or enter safe URLs.
- Invalid avatar URLs get clear feedback and do not produce broken runtime UI.
- Legacy avatar URL payloads continue to render.
