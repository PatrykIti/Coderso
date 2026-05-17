# TASK-282-05: Rich Text Inline Media and Safe Content Model

# FileName: TASK-282-05_Inline_Media_and_Safe_Content_Model.md

**Priority:** High
**Category:** Widgets + Content + Media + Runtime Render + Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-282, TASK-282-02, TASK-282-03
**Status:** To Do

---

## Overview

Add bounded inline media support for Rich Text Section long-form content without
opening unsafe raw HTML, iframes, scripts, or arbitrary embeds.

This leaf covers KOD-13 from
`_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`. KOD-11 is handled by
TASK-282-02 as sanitizer feedback; this leaf owns the actual Rich Text
Section-specific media model and render/editor behavior.

## Scope Boundary

In scope:

- Media Library-backed image insertion for Rich Text Section body and/or
  structured blocks.
- Safe persisted media references with alt text, caption, optional link, width,
  alignment, and object-position controls.
- Runtime rendering through React-owned output or sanitized HTML projection that
  cannot execute scripts.
- Editor media picking using existing admin media ownership; no new upload route
  unless an existing media picker contract already provides it.

Out of scope:

- Arbitrary `<iframe>`, video embed, script embed, raw HTML embed, or third-party
  widget embed support.
- Global media library API changes unless split into a separate media task.
- Rich authoring toolbar integration from TASK-282-02 except for the insertion
  hook required by this widget.

## Sub-Tasks

- [ ] Decide the persisted shape, preferring explicit structured media blocks or
  inline media tokens over raw `<img>` HTML pasted by users.
- [ ] Add schema/default/normalizer coverage for media id/source, alt, caption,
  link href, width, alignment, and bounded object position if supported.
- [ ] Add a safe media renderer that escapes captions, normalizes hrefs, and
  omits unsafe or unresolved media.
- [ ] Add Visual editor media picker controls and preview thumbnails.
- [ ] Add sanitizer diagnostics that explain when pasted `<img>` is stripped and
  direct users to the media picker.
- [ ] Preserve existing HTML-only content and block-only content.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/richTextSection.tsx` | Add media schema/types/normalizer and safe renderer or safe HTML projection. Keep sanitizer as the public boundary. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Add media picker/preview controls for the selected content model. |
| existing media admin components/services | Reuse only established media picker/upload clients; do not create one-off media routes. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add SSR assertions for valid media, missing media fallback, alt/caption escaping, unsafe link omission, and legacy payloads. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add media picker/preview/editor state assertions. |
| `tests/unit/widgets/validator.test.ts` | Run/update when media schema fields are added. |

## Implementation Pseudocode

Structured model option:

```ts
type RichTextSectionMediaBlock = {
  id?: string;
  kind: "image";
  mediaId?: string;
  src?: string;
  alt?: string;
  caption?: string;
  href?: string;
  width?: "content" | "wide" | "full";
  align?: "left" | "center" | "right";
};
```

Normalizer:

```ts
function normalizeRichTextMediaBlock(input: unknown): RichTextSectionMediaBlock | null {
  const mediaId = normalizeOptionalId(input.mediaId);
  const src = normalizeSafeMediaSrc(input.src);
  if (!mediaId && !src) return null;
  return {
    kind: "image",
    mediaId,
    src,
    alt: clampText(input.alt, 160),
    caption: clampText(input.caption, 240),
    href: normalizeRichTextMediaHref(input.href),
    width: resolveRichTextMediaWidth(input.width),
    align: resolveRichTextMediaAlign(input.align),
  };
}
```

Renderer:

```tsx
function RichTextMediaFigure({ media }: { media: RichTextSectionMediaBlock }) {
  if (!media.src) return null;
  const image = <img src={media.src} alt={media.alt ?? ""} loading="lazy" />;
  return (
    <figure className={resolveMediaFigureClass(media)}>
      {media.href ? <a href={media.href}>{image}</a> : image}
      {media.caption ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  );
}
```

## Error Handling

- Missing or unauthorized media references render as omitted media with editor
  diagnostics, not broken public image placeholders.
- Empty alt is allowed only for decorative images; the editor must make that
  choice explicit if supported.
- Unsafe hrefs are omitted or normalized through the existing safe href helper.
- Oversized captions, alt text, media arrays, and object-position values are
  clamped or rejected before persistence.

## Security Contract

No new API routes are introduced by default.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: existing internal media/page
  editor contracts only.
- Reject-unknown validation: all media fields must be schema-owned and reject
  unknown keys.
- Input bounds: media count, src length, alt length, caption length, href
  length, and rendered node count must be bounded.
- Anti-abuse: no arbitrary iframes, scripts, event handlers, remote executable
  embeds, data URLs unless an existing media policy explicitly allows them, or
  unsanitized HTML.
- Secret handling: do not persist private storage URLs, signed URLs, tokens, or
  provider secrets in widget JSON, diagnostics, reports, or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- media picker/client tests if reused components are modified
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with media fields, alt/caption
  policy, and unsupported embed policy.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` row KOD-13 after
  validation.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if media support changes Rich Text
  Section readiness/completeness.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors can add safe inline images without typing raw `<img>` HTML.
- Public output never executes user-authored scripts or arbitrary embeds.
- Missing/unsafe media fails closed and is explained in the editor.
- Media schema, normalizer, renderer, editor, tests, docs, and report evidence
  move together.
