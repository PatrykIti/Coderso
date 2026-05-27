# Rich Text Section Widget (v2)

## Purpose

Long-form editorial content with safe HTML authoring, structured fallback
blocks, and bounded inline media/attachment/embed support.

## Widget ID

`rich-text-section`

## Variants

- `single-column`: one-column long-form layout
- `two-column`: split layout with optional table of contents
- `article`: editorial layout that now respects the configured content width

## Editor Modes

### Wizard

- Read-only current layout summary
- Read-only preview of the first two structured text blocks
- Does not change `options.outputMode`; Wizard now leaves output ownership to
  Visual

If one of the first two structured blocks is not a text block, Wizard explains
that the block must be edited in Visual mode instead of silently rewriting it.

### Visual

Sections:
1. Variant and layout structure
2. Title block copy
3. Body content
4. Structured content blocks
5. Reader options
6. Typography and colors

Visual is the primary authoring surface. It now owns:

- title heading level
- safe rich-text body editing through `PostRichTextAdapter`
- source preference / output-mode selection
- output-source changes through daily body and structured block authoring
- rendered-source status and sanitizer guidance
- structured text/image/attachment/embed block authoring
- confirm + undo flows for destructive block-count and remove actions
- block navigation/paging for large block sets
- bounded media picking for images and attachments
- text color clearing and inherited/dropcap guidance
- swatch-only color controls that preserve legacy custom/token values as
  replace-or-clear saved custom color state

### Advanced

- Read-only output mode and rendered-source diagnostics
- Read-only sanitizer diagnostics and sanitized preview
- Confirm-gated normalization and reset support actions
- Saved content summary for structured blocks, media/embed counts, and sanitized HTML source length.
- Advanced does not expose raw JSON snapshots or raw HTML authoring.

Advanced intentionally stays diagnostic. Variant selection, output-mode changes,
style duplication, and raw HTML authoring do not live here anymore.

## Data Model Summary

```json
{
  "titleBlock": {
    "eyebrow": "Editorial",
    "title": "Long-form content section",
    "headingLevel": 2
  },
  "body": {
    "html": "<h2>Heading</h2><p>Paragraph...</p>",
    "blocks": [
      {
        "id": "block-1",
        "kind": "text",
        "heading": "Heading",
        "headingLevel": 2,
        "contentHtml": "<p>Paragraph content.</p>"
      },
      {
        "id": "block-2",
        "kind": "image",
        "mediaId": "media-image-1",
        "src": "/media/story.jpg",
        "alt": "Story image",
        "caption": "Optional caption",
        "href": "https://example.com/story",
        "width": "wide",
        "align": "center"
      },
      {
        "id": "block-3",
        "kind": "attachment",
        "mediaId": "media-file-1",
        "src": "/media/guide.pdf",
        "label": "Download guide",
        "description": "Optional attachment copy",
        "mimeType": "application/pdf",
        "sizeLabel": "2 MB"
      },
      {
        "id": "block-4",
        "kind": "embed",
        "provider": "external-link",
        "url": "https://www.youtube.com/watch?v=abc123",
        "title": "Watch the walkthrough",
        "aspectRatio": "16:9",
        "renderMode": "link-card"
      }
    ]
  },
  "options": {
    "dropcap": false,
    "toc": false,
    "maxWidth": "lg",
    "outputMode": "blocks-fallback"
  },
  "style": {
    "fontScale": "md",
    "lineHeight": "normal",
    "textColor": "var(--color-text)",
    "background": "transparent",
    "spacing": "md"
  }
}
```

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `single-column`.
- `outputMode` is deterministic:
  - `html`: render `body.html` only
  - `blocks-fallback`: prefer non-empty `body.html`, otherwise render blocks
  - `blocks`: render structured blocks only
- The renderer emits deterministic markers, including:
  - `data-rich-text-variant`
  - `data-rich-text-output-mode`
  - `data-rich-text-rendered-source`
  - `data-rich-text-title-level`
  - `data-rich-text-max-width`
  - `data-rich-text-toc-count`
- Sections are labelled through a deterministic title id when a title exists, or
  a fallback `aria-label` when the title is empty.
- TOC anchors are scoped by widget instance / `blockId`, and TOC links expose a
  visible `focus-visible` ring.
- Title headings support `h1`, `h2`, or `h3`; structured text headings support
  `h2`, `h3`, or `h4`.
- The `article` variant now applies the selected `maxWidth` instead of forcing a
  hardcoded article width.

## Sanitizer and Security

- HTML is sanitized before persistence/render:
  - removes disallowed tags such as `script`, `style`, `iframe`, `form`, `img`,
    and `h1`
  - strips unsafe attributes and neutralizes unsafe hrefs
  - exposes bounded diagnostics for removed tags/attributes and rewritten links
- Raw inline images and raw iframe/video embeds remain unsupported in `body.html`.
  Safe media support is modeled through structured image, attachment, and embed
  blocks instead.
- Structured blocks are capped at `20` items and all text/link/media fields stay
  length-bounded in the normalizer.

## Clear Controls

- `style.textColor` is clearable; clearing returns the runtime to inherited
  `var(--color-text)` behavior.
- `style.background` is clearable; clearing removes the widget-local background
  override so the section surface falls back to transparent.
- Typography and spacing continue to use bounded token sets instead of freeform
  class names.

## TASK-336-18 Editor Contract

- Exports `richTextSectionEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only starter summary; Visual owns daily
  rich content, typography, spacing, and color; Advanced is read-only source,
  sanitizer, and runtime diagnostics.
- TASK-336-19 closes raw HTML/output-mode authoring drift by keeping Advanced
  read-only and moving authoring through Visual rich-text/structured controls.
