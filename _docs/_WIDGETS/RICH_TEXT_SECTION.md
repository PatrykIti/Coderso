# Rich Text Section Widget (v1)

## Purpose

Long-form content block with safe HTML rendering and editorial layout options.

## Widget ID

`rich-text-section`

## Variants (v1)

- `single-column`: one-column long-form layout
- `two-column`: split layout with optional table of contents
- `article`: editorial article-style layout

## Editor Modes (current after TASK-050-13-05)

### Wizard (minimal onboarding)
- Rich text layout variant
- Eyebrow and title quick setup
- Structured body block quick setup

Routine Wizard editing writes `body.blocks` and sets `options.outputMode` to
`blocks`. Raw HTML remains available in Visual/Advanced for technical edits and
legacy compatibility.

### Visual (primary editing mode)
Sections:
1. Variant and layout structure
2. Title block copy
3. Body content
4. Structured fallback blocks
5. Reader options
6. Typography and colors

Notes:
- Rich Text Section owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- Output mode and fallback
- Technical typography tokens
- Normalization and safeguards
- Raw payload snapshot

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `single-column`.
- Renderer outputs deterministic markers:
  - `data-rich-text-variant`
  - `data-rich-text-font-scale`
  - `data-rich-text-line-height`
  - `data-rich-text-spacing`
  - `data-rich-text-dropcap`
  - `data-rich-text-toc`
  - `data-rich-text-max-width`
  - `data-rich-text-output-mode`
  - `data-rich-text-toc-count`
- HTML is sanitized before rendering:
  - removes disallowed tags (`script`, `style`, `iframe`, forms, and other unsafe tags)
  - strips unsafe attributes and normalizes links (`javascript:` URLs are neutralized)
  - TOC anchors are injected from sanitized headings only
- Structured fallback blocks are deterministic and capped to `20`.

## Data Model (summary)

```json
{
  "titleBlock": {
    "eyebrow": "Editorial",
    "title": "Long-form content section"
  },
  "body": {
    "html": "<h2>Heading</h2><p>Paragraph...</p>",
    "blocks": [
      {
        "id": "block-1",
        "heading": "Heading",
        "content": "Paragraph content."
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
