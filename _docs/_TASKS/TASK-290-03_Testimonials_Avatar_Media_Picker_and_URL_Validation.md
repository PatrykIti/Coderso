# TASK-290-03: Testimonials Avatar Media Picker and URL Validation

# FileName: TASK-290-03_Testimonials_Avatar_Media_Picker_and_URL_Validation.md

**Priority:** High
**Category:** Widgets + Testimonials + Admin UI + Media
**Estimated Effort:** Large
**Dependencies:** TASK-256-06-03, TASK-290
**Status:** Done (2026-05-22)

---

## Overview

Improve avatar authoring for Testimonials by using the existing Media Library
picker patterns and by validating manually entered avatar URLs.

This leaf covers:

- The avatar portion of `REPORT_TESTIMONIALS_WIDGET.md:177-180` UX-04, where
  Wizard cannot author avatar data.
- `REPORT_TESTIMONIALS_WIDGET.md:184-186` UX-06 Avatar URL lacks a Media
  Library picker.
- `REPORT_TESTIMONIALS_WIDGET.md:188-189` UX-07 Avatar URL accepts invalid text
  and gives no feedback.

Avatar image lazy loading and contextual alt text are excluded because
TASK-256-06-03 already owns those shared media accessibility/performance fixes.

## Scope Boundary

In scope:

- Keep `testimonials[].avatar` as the persisted public URL contract for both
  legacy and new data. Media Library picks resolve to a public URL through
  `listMediaCached({ force: false })`, while selected media IDs stay in
  editor-local state and are not persisted in v1.
- Add the same safe avatar authoring path to Wizard and Visual. Wizard may keep
  the control compact, but it must not leave the UX-04 avatar gap unowned.
- Reuse `MediaPicker` and `listMediaCached` patterns already used by Hero and
  Gallery Mosaic.
- Validate external avatar URLs with a safe `http`, `https`, or single-slash
  relative-path policy matching existing media/link helpers.
- Add editor feedback for invalid URLs and failed media lookup.
- Keep runtime rendering free of browser-only media service imports.

Out of scope:

- New media upload routes or media service behavior.
- Shared image lazy/alt behavior owned by TASK-256.
- External review-provider imports owned by TASK-290-07.

## Sub-Tasks

- [x] Add editor-local selected-media state keyed by testimonial id and map it
  to the persisted `avatar` URL through `listMediaCached({ force: false })`.
- [x] Add Wizard and Visual controls for Media Library selection and manual URL
  entry.
- [x] Add inline invalid URL feedback and preserve fallback initials when an
  avatar cannot be used.
- [x] Ensure legacy `avatar` strings keep rendering.
- [x] Add UI tests with mocked `MediaPicker` for Wizard and Visual avatar
  authoring, plus renderer tests for normalized media-backed avatar data.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/testimonials.tsx` | Add/export the safe avatar URL helper used by editor/runtime logic; preserve the persisted legacy `avatar` URL contract. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Add MediaPicker integration and URL validation feedback. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Mock MediaPicker and test Wizard plus Visual avatar source selection, invalid URL feedback, and fallback behavior. |
| `tests/vitest/widgets/testimonials.test.tsx` | Add normalization/render assertions for media-backed or URL-backed avatars. |
| `tests/vitest/ui/media-picker.test.tsx` | Run if MediaPicker integration props change. |

## Implementation Pseudocode

URL validation helper:

```ts
function isValidAvatarUrl(value: string | undefined) {
  if (!value || value.trim().length === 0) return true;
  if (value.startsWith("//")) return false;
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
  value={selectedAvatarMediaIds[testimonial.id ?? fallbackId] ?? null}
  accept={["image/*"]}
  onChange={(nextValue) => {
    void handleAvatarMediaSelection(testimonial.id ?? fallbackId, index, nextValue);
  }}
/>
```

Resolution flow:

```ts
async function handleAvatarMediaSelection(itemId: string, index: number, nextValue: unknown) {
  const mediaId = typeof nextValue === "string" ? nextValue : null;
  setSelectedAvatarMediaIds((current) => ({ ...current, [itemId]: mediaId }));
  if (!mediaId) {
    updateItem(value, onChange, index, { avatar: undefined });
    return;
  }

  const mediaItems = await listMediaCached({ force: false });
  const selected = mediaItems.find((item) => item.id === mediaId);
  if (!selected?.url) throw new Error("missing_media_url");
  updateItem(value, onChange, index, { avatar: selected.url });
}
```

Error handling:

- Invalid external URLs do not crash the editor and produce inline feedback.
- Tests must cover `//evil.example`, `javascript:...`, `data:...`,
  `/media/avatar.jpg`, and `https://...`.
- Failed media lookup keeps the previous avatar and shows a non-blocking error.
- Runtime rendering still falls back to initials when no valid avatar URL is
  present.

Regression test shape:

- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
  - Wizard and Visual mode both accept a picked image and persist only the
    resolved public URL in `avatar`.
  - Invalid manual URLs surface inline feedback while preserving the current
    fallback initials path.
  - Failed media lookup leaves the previous `avatar` intact and renders an
    inline non-blocking error.
- `tests/vitest/widgets/testimonials.test.tsx`
  - Runtime accepts legacy `avatar` URLs, rejects unsafe protocols, and keeps
    initials fallback when `avatar` is absent or invalid.
- `tests/vitest/ui/media-picker.test.tsx`
  - Run only if shared picker props/behavior change.

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
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`.

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
- No `avatarAssetId`/`avatarSource` metadata is persisted in v1 unless a later
  dedicated schema task explicitly introduces it.

## Completion Notes (2026-05-22)

- Wizard and Visual now support both Media Library selection and manual avatar
  URL entry while persisting the resolved public `avatar` URL contract only.
- Invalid avatar values now surface inline feedback in the editor and fail
  closed at runtime; legacy safe `avatar` strings continue to render without a
  migration.
- The editor wave suite mocks `MediaPicker` and now covers supported,
  unsupported, missing, and cleared media selections across both authoring
  surfaces.
