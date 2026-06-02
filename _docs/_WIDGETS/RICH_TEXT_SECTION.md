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

- One-time current layout seed
- Read-only preview of the first two structured text blocks
- Preview text strips safe `contentHtml` to readable plain text before falling
  back to legacy `content`
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
- visible body-vs-structured-block drift guidance before authors switch output
  modes
- pristine defaults keep the body HTML and structured blocks aligned, so source
  drift guidance appears only after one source actually diverges
- structured text/image/attachment/embed block authoring
- confirm + undo flows for destructive block-count and remove actions
- block navigation/paging for large block sets
- bounded media picking for images and attachments
- text color clearing and inherited/dropcap guidance
- swatch-only color controls that preserve legacy custom/token values as
  replace-or-clear saved custom color state
- accessible field naming that now stays aligned with the Hero editor review
  baseline for the main Rich Text controls

### Advanced

- Read-only output mode and rendered-source diagnostics
- Read-only sanitizer diagnostics and sanitized preview
- Read-only contract summary
- Saved content summary for structured blocks, media/embed counts, and sanitized HTML source length.
- Sanitizer diagnostics combine the latest editor sanitizer events with the
  current stored HTML scan so warnings do not disappear after the editor saves
  cleaned HTML.
- Body sanitizer diagnostics are preserved when a clean structured block edit is
  saved; unsafe structured-block events are merged into the same bounded
  diagnostics list instead of replacing body events.
- Advanced does not expose raw JSON snapshots or raw HTML authoring.

Advanced intentionally stays diagnostic. Variant selection, output-mode changes,
style duplication, mutating support utilities, and raw HTML authoring do not
live here anymore.

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
  - `data-rich-text-toc-scope="body-headings"`
- Sections are labelled through a deterministic title id when a title exists, or
  a fallback `aria-label` when the title is empty.
- TOC anchors are scoped by widget instance / `blockId`, and TOC links expose a
  visible `focus-visible` ring.
- TOC scope is intentionally limited to rendered body H2/H3/H4 headings. The
  section title is the section label/page heading and is not repeated in the
  TOC.
- Title headings support `h1`, `h2`, or `h3`; structured text headings support
  `h2`, `h3`, or `h4`.
- The `article` variant now applies the selected `maxWidth` instead of forcing a
  hardcoded article width.
- Structured embeds currently render as provider-validated link cards. The
  legacy `aspectRatio` value is retained in data for compatibility, but the
  Visual selector is disabled because link-card rendering cannot express it.

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
- The editor stores bounded sanitizer diagnostics from the most recent body or
  structured-block rich-text edit, including unsafe link attempts surfaced by
  the shared rich-text adapter before upstream serialization, while the live
  editor command receives a safe placeholder href. Structured-block edits merge
  their diagnostics with saved body events so Advanced does not lose body
  guidance after clean block edits.

## Clear Controls

- `style.textColor` is clearable; clearing returns the runtime to inherited
  `var(--color-text)` behavior.
- `style.background` is clearable; clearing removes the widget-local background
  override so the section surface falls back to transparent.
- Background color now exposes the same transparent affordance pattern used in
  Hero for comparable background fields.
- Typography and spacing continue to use bounded token sets instead of freeform
  class names.

## TASK-336-18 Editor Contract

- Exports `richTextSectionEditorContract` with `version: 2`.
- Contract target: Wizard seeds layout and previews structured blocks; Visual
  owns daily rich content, typography, spacing, and color; Advanced is
  read-only source, sanitizer, saved-content, and contract diagnostics.
- TASK-336-19 closes raw HTML/output-mode authoring drift by keeping Advanced
  read-only and moving authoring through Visual rich-text/structured controls.
