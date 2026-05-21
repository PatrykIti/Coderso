# TASK-282-05: Rich Text Inline Media and Safe Content Model

# FileName: TASK-282-05_Inline_Media_and_Safe_Content_Model.md

**Priority:** High
**Category:** Widgets + Content + Media + Runtime Render + Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-282, TASK-282-02, TASK-282-03, TASK-282-04
**Status:** To Do

---

## Overview

Add bounded inline image support for Rich Text Section long-form content without
opening unsafe raw HTML, iframes, scripts, or arbitrary embeds.

This leaf covers KOD-13 from
`_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` only for the image/media
picker slice. KOD-11 is handled by TASK-282-02 as sanitizer feedback.
Attachments and safe video/embed behavior are owned by TASK-282-08 so KOD-13
cannot close after images only.

The canonical implementation path for this leaf is widget-owned image blocks in
the structured reading flow (`body.blocks`) backed by Media Library selection.
Raw `<img>` persistence in `body.html` remains unsupported and must keep
routing through TASK-282-02 diagnostics that point editors toward the safe
media-block path.

## Scope Boundary

In scope:

- Media Library-backed image blocks in the Rich Text Section structured reading
  flow.
- Safe persisted media references with a `mediaId`, a stable public render URL
  snapshot, alt text, caption, optional link, width, alignment, and
  object-position controls.
- Runtime rendering through React-owned output or sanitized HTML projection that
  cannot execute scripts.
- Editor media picking using existing admin media ownership; no new upload route
  unless an existing media picker contract already provides it.

Out of scope:

- Direct raw `<img>` persistence inside `body.html`; HTML mode remains text-only
  and points editors to the structured media-block path.
- Attachments, video embeds, iframes, third-party widget embeds, or rich embed
  cards; TASK-282-08 owns the safe product decision for those KOD-13 parts.
- Arbitrary `<iframe>`, script embed, raw HTML embed, or third-party widget
  executable payload support.
- Global media library API changes unless split into a separate media task.
- Rich authoring toolbar integration from TASK-282-02 except for the insertion
  hook required by this widget.

## Sub-Tasks

- [ ] Persist explicit structured image-block references in `body.blocks`, not
  raw `<img>` HTML and not private/signed URLs. The implementation path for the
  current synchronous widget renderer is `mediaId` plus a sanitized stable
  public `src` copied from the selected Media Library record, plus
  editor-authored presentation metadata.
- [ ] Add schema/default/normalizer coverage for `mediaId`, required-for-render
  public `src`, alt, decorative flag, caption, safe link href, width, alignment,
  and bounded object position if supported. Legacy public `src`-only payloads
  continue to render through the same public URL validator.
- [ ] Keep media resolution out of the public render path. Current
  `WidgetDefinition.render` / `WidgetRenderer` is synchronous and does not pass
  a media resolver, so this leaf must not add render-time admin API lookups or
  async `mediaId` resolution. If the existing media picker/client cannot provide
  a stable public URL for the selected media record, split a separate public
  media projection task before marking this leaf `Done`.
- [ ] Add a safe media renderer that escapes captions, normalizes hrefs, and
  omits unsafe or unresolved media.
- [ ] Add Visual editor media picker controls and preview thumbnails.
- [ ] Add sanitizer diagnostics that explain when pasted `<img>` is stripped and
  direct users to the media picker.
- [ ] Preserve existing HTML-only content and block-only content.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/richTextSection.tsx` | Add mixed reading-flow block schema/types/normalizer for `kind: "image"` and a sync-safe media renderer. Rendering must read only already-persisted public `src` values; `mediaId` is tracking/editor metadata unless a separate public projection is wired before render. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Add media picker/preview controls for structured image blocks that write `mediaId`, a validated public `src` snapshot from the chosen media record, and editor-authored alt/caption/link metadata. |
| `core/admin/ui/media/MediaPicker.tsx`, `core/admin/services/mediaClient.ts` | Reuse established media picker/list clients for admin selection only. The editor may copy only stable public media URLs plus media ids into widget JSON; it must reject or explain records whose URL is missing, private, signed, or admin-only. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add SSR assertions for valid media, missing media fallback, alt/caption escaping, unsafe link omission, and legacy payloads. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add media picker/preview/editor state assertions. |
| `tests/unit/widgets/validator.test.ts` | Run/update when media schema fields are added. |

## Implementation Pseudocode

Canonical structured media-block model:

```ts
type RichTextSectionMediaBlock = {
  id?: string;
  kind: "image";
  mediaId?: string;
  /**
   * Stable public render URL snapshot. New editor writes must pair this with
   * mediaId when the source comes from the Media Library. Legacy payloads may
   * provide only src, but src must still pass the public media URL policy.
   */
  src?: string;
  alt?: string;
  decorative?: boolean;
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
  const src = normalizePublicMediaSrc(input.src);
  if (!mediaId && !src) return null;
  return {
    kind: "image",
    mediaId,
    src,
    alt: clampText(input.alt, 160),
    decorative: Boolean(input.decorative),
    caption: clampText(input.caption, 240),
    href: normalizeRichTextMediaHref(input.href),
    width: resolveRichTextMediaWidth(input.width),
    align: resolveRichTextMediaAlign(input.align),
  };
}
```

Editor selection flow:

```ts
function createRichTextMediaBlockFromSelection(
  media: MediaRecord,
  draft: RichTextMediaDraft
) {
  const src = normalizePublicMediaSrc(media.url);
  if (!src) {
    return {
      error: "media_public_url_missing",
      message: "Selected media is not available through a public render URL.",
    };
  }

  return {
    value: normalizeRichTextMediaBlock({
      ...draft,
      kind: "image",
      mediaId: media.id,
      src,
    }),
  };
}
```

Renderer:

```tsx
function RichTextMediaFigure({ media }: { media: RichTextSectionMediaBlock }) {
  const src = normalizePublicMediaSrc(media.src);
  if (!src) return null;
  const image = <img src={src} alt={media.decorative ? "" : media.alt ?? ""} loading="lazy" />;
  return (
    <figure className={resolveMediaFigureClass(media)}>
      {media.href ? <a href={media.href}>{image}</a> : image}
      {media.caption ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  );
}
```

Regression test shape:

```ts
test("selected media creates a structured image block with mediaId plus stable public src snapshot", ...);
test("legacy src-only image blocks still render when the public URL validator accepts src", ...);
test("missing or unsafe public src omits the media block and shows editor guidance", ...);
test("pasted raw img HTML still strips through sanitizer diagnostics and points editors to media blocks", ...);
```

## Error Handling

- Missing or unauthorized media references render as omitted media with editor
  diagnostics, not broken public image placeholders.
- Media IDs do not resolve during public widget render in this leaf. The editor
  must persist a stable public `src` snapshot from the selected media record, or
  block selection with an explicit diagnostic. The renderer omits media without
  a valid public `src`.
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
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` if
  `MediaPicker` behavior or props are changed
- `bun run test:vitest -- tests/vitest/admin/mediaClient.test.ts` if
  `mediaClient` response/cache behavior is changed
- `bun run test:vitest -- tests/vitest/admin/mediaUtils.test.ts` if media URL,
  alt, dimension, or display helper behavior is changed
- `bun test tests/unit/media/mediaUsageService.test.ts` if media-reference
  detection is extended for the new Rich Text Section media shape
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with media fields, alt/caption
  policy, and unsupported embed policy.
- Update `_docs/MEDIA_SPEC.md` with the Rich Text Section public `src` snapshot
  rule, stable public URL requirement, and Media Library ownership for image
  blocks.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` KOD-13 image
  slice after validation, without claiming attachment/embed closure.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if media support changes Rich Text
  Section readiness/completeness.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors can add safe inline images through widget-owned structured image
  blocks without typing raw `<img>` HTML.
- The persisted media contract is explicit: new Media Library selections store
  `mediaId`, a validated stable public `src` snapshot, and bounded presentation
  metadata; legacy `src`-only support remains public-only and never accepts a
  private or signed URL.
- The implementation path is unambiguous: Rich Text Section images live in the
  structured reading flow, while HTML mode continues to sanitize and reject raw
  `<img>` persistence.
- Public output never executes user-authored scripts or arbitrary embeds.
- Missing/unsafe media fails closed and is explained in the editor.
- Media schema, normalizer, renderer, editor, tests, docs, and report evidence
  move together.
