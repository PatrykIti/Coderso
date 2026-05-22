# TASK-282-08: Rich Text Attachments and Safe Embed Policy

# FileName: TASK-282-08_Attachments_and_Safe_Embed_Policy.md

**Priority:** High
**Category:** Widgets + Content + Media + Runtime Render + Security
**Estimated Effort:** Large
**Dependencies:** TASK-282, TASK-282-02, TASK-282-03, TASK-282-05
**Status:** Done (2026-05-21)

---

## Overview

Complete the non-image KOD-13 scope from
`_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`: attachments and safe
video/embed behavior for Rich Text Section body content.

TASK-282-05 owns inline images. This leaf owns attachment cards and the safe
replacement for raw video/iframe embeds. It must not introduce arbitrary iframe
HTML, scripts, third-party widgets, or admin-only media URLs into public output.

The canonical implementation path for embeds in this leaf is provider-validated
link cards, not iframe rendering. A privacy-safe iframe policy would require a
separate explicit security/media contract task before Rich Text Section adopts
it.

## Scope Boundary

In scope:

- Media Library-backed attachment cards for documents or downloadable assets,
  using `mediaId` plus a stable public `src` snapshot copied by the editor.
- A bounded embed model for trusted provider URLs rendered as link cards in this
  leaf.
- Clear editor guidance when pasted iframes/video HTML is stripped and how to
  use the safe attachment/embed controls instead.
- Runtime rendering that is synchronous, sanitized, and deterministic.

Out of scope:

- Arbitrary raw `<iframe>`, `<script>`, `<embed>`, `<object>`, form, or widget
  HTML passthrough, plus Rich Text Section iframe rendering without a separate
  explicit policy task.
- Upload or media storage API changes. Split a separate media task if the
  existing Media Library cannot provide stable public URLs for attachments.
- Global rich-text embed policy for posts or other widgets.

## Sub-Tasks

- [x] Add schema/default/normalizer coverage for attachment blocks with
  `mediaId`, public `src`, label, description, MIME/type hint, size label, and
  safe target behavior.
- [x] Add schema/default/normalizer coverage for safe embed blocks with
  provider, canonical URL, title, aspect ratio, and render mode.
- [x] Implement `normalizeRichTextAttachmentBlock(input)` so attachments without
  a public `src` are omitted and explained in the editor.
- [x] Implement `normalizeRichTextEmbedBlock(input)` so only allowed providers
  and URL patterns survive; unsafe iframe HTML is never persisted.
- [x] Render attachments as accessible links/cards with escaped labels and safe
  href normalization.
- [x] Render embeds as provider-validated safe link cards in this leaf. Do not
  introduce iframe rendering here.
- [x] Add editor controls for selecting an attachment and entering a safe embed
  URL, plus diagnostics for unsupported provider/iframe input.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/richTextSection.tsx` | Add attachment/embed block types, strict normalizers, safe renderer branches, and schema/default coverage. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Add attachment picker controls, safe embed URL controls, and diagnostics for stripped raw iframe/video HTML. |
| `core/admin/ui/media/MediaPicker.tsx`, `core/admin/services/mediaClient.ts` | Reuse only if existing selection behavior needs attachment-friendly filtering or display. Do not persist private/admin-only values. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add SSR assertions for attachment cards, unsafe URL omission, safe embed link cards, and rejected iframe/script payloads. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add editor assertions for attachment selection, embed URL diagnostics, and stripped iframe guidance. |
| `tests/unit/widgets/validator.test.ts` | Update when attachment/embed schema fields are added. |

## Implementation Pseudocode

Attachment model:

```ts
type RichTextSectionAttachmentBlock = {
  kind: "attachment";
  mediaId?: string;
  src: string;
  label: string;
  description?: string;
  mimeType?: string;
  sizeLabel?: string;
};

function normalizeRichTextAttachmentBlock(input: unknown) {
  const src = normalizePublicMediaSrc(readString(input, "src"));
  if (!src) return null;
  return {
    kind: "attachment",
    mediaId: normalizeOptionalId(readString(input, "mediaId")),
    src,
    label: clampText(readString(input, "label") || "Download attachment", 120),
    description: clampText(readString(input, "description"), 180),
    mimeType: clampText(readString(input, "mimeType"), 80),
    sizeLabel: clampText(readString(input, "sizeLabel"), 40),
  };
}
```

Safe embed model:

```ts
type RichTextSectionEmbedBlock = {
  kind: "embed";
  provider: "youtube" | "vimeo" | "external-link";
  url: string;
  title?: string;
  aspectRatio?: "16:9" | "4:3" | "1:1";
  renderMode: "link-card";
};

function normalizeRichTextEmbedBlock(input: unknown) {
  const normalizedUrl = normalizeAllowedRichTextEmbedUrl(readString(input, "url"));
  if (!normalizedUrl) return null;
  return {
    kind: "embed",
    provider: normalizedUrl.provider,
    url: normalizedUrl.url,
    title: clampText(readString(input, "title"), 120),
    aspectRatio: resolveRichTextEmbedAspectRatio(readString(input, "aspectRatio")),
    renderMode: "link-card",
  };
}
```

Renderer:

```tsx
function RichTextEmbed({ embed }: { embed: RichTextSectionEmbedBlock }) {
  return <a href={embed.url}>{embed.title || embed.url}</a>;
}
```

Regression test shape:

```ts
test("selected file media creates an attachment block with stable public src snapshot", ...);
test("unsupported provider or raw iframe HTML is rejected and surfaced as editor guidance", ...);
test("embed blocks render provider-validated link cards instead of iframe HTML", ...);
test("attachment blocks omit unsafe or missing public src values from public output", ...);
```

## Error Handling

- Unsupported provider URLs are rejected with editor diagnostics.
- Pasted raw iframes/video/object tags remain stripped by sanitizer diagnostics
  and do not become persisted widget JSON.
- Missing public attachment URLs render nothing in public output and show editor
  diagnostics.
- Labels, descriptions, provider titles, URLs, and counts are bounded.

## Security Contract

No new API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged existing admin
  editing and media read contracts.
- Reject-unknown validation: attachment/embed fields must be schema-owned with
  unknown keys rejected.
- Input bounds: attachment count, embed count, URL length, title/label length,
  and rendered node count are bounded.
- Anti-abuse: no arbitrary iframe/srcdoc, scripts, event handlers, data URLs,
  forms, object/embed tags, autoplay-by-default, or executable third-party
  widgets.
- Secret handling: no private media URLs, signed URLs, provider API keys, auth
  tokens, or nonce values in widget JSON or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` if
  `MediaPicker` filtering/display changes
- `bun run test:vitest -- tests/vitest/admin/mediaClient.test.ts` if
  `mediaClient` response/cache behavior changes
- `bun test tests/unit/media/mediaUsageService.test.ts` if attachment/embed media
  references are added to media usage detection
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with attachment and safe embed
  fields plus unsupported raw iframe/embed policy.
- Update `_docs/MEDIA_SPEC.md` with attachment `mediaId` plus public `src`
  snapshot rules and the Rich Text Section link-card-only embed policy.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` KOD-13 with
  separate image, attachment, and embed evidence.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if readiness/completeness changes.
- Do not update `_docs/SECURITY_SPEC.md` in this leaf unless a separate follow-up
  task introduces an allowlisted iframe policy.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- KOD-13 cannot be marked fixed by image support alone.
- Editors can add safe attachments without typing raw HTML.
- Editors get a safe path for video/embed URLs or a clear unsupported-provider
  diagnostic.
- Public output never renders arbitrary iframe/script/embed HTML, and this leaf
  resolves embeds through link cards rather than iframe rendering.
- Attachment/embed schema, normalizer, renderer, editor, tests, docs, and report
  evidence move together.
