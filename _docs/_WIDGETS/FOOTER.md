# Footer Widget (v1)

## Purpose

Site footer with structured columns, legal strip, and social links.

## Widget ID

`footer`

## Variants (v1)

- `columns-2`
- `columns-3`
- `minimal`

## Slots

- `column-1` (`Column 1`)  
  Renders inside first footer column.
- `column-2` (`Column 2`)  
  Renders inside second footer column.
- `column-3` (`Column 3`)  
  Renders inside third footer column (for `columns-3`).
- `bottom` (`Bottom Strip`)  
  Renders in the lower legal/actions strip.

## Editor Modes (current after TASK-050-07-02)

### Wizard
- Layout variant selection.
- Quick setup for visible columns (title + first link label/href with
  per-field labels).
- Legal basics (copyright/privacy/terms).
- Basic social links setup with labeled platform/URL fields and support for up
  to 8 quick social entries.

### Visual
- Primary editing mode (Footer owns variant selection in Visual).
- Sections:
  - Variant and structure
  - Columns and links
  - Legal strip
  - Social links and icon style
  - Colors and borders
  - Typography and spacing
  - Slots overview and insertion hints

### Advanced
- Technical-only scope.
- Layout tokens:
  - columns alignment
  - legal row alignment
  - max width
  - column gap
  - section vertical padding
- Content/style editing is intentionally excluded from Advanced.

## Runtime behavior notes

- Column count is normalized by variant:
  - `minimal` -> 1 column
  - `columns-2` -> 2 columns
  - `columns-3` -> 3 columns
- Footer uses deterministic fallback columns when payload is incomplete.
- Slot content is rendered in column regions and bottom strip with nested widget support.
- Runtime style/layout fields are additive and backward-compatible:
  - `layout.align`, `layout.legalAlign`, `layout.maxWidth`, `layout.columnGap`, `layout.sectionPaddingY`
  - `style.surfaceColor`, `style.borderColor`, `style.borderTopWidth`, `style.textColor`, `style.headingColor`, `style.linkColor`, `style.legalTextColor`, `style.socialColor`, `style.fontSize`, `style.headingTransform`

## Data model (summary)

```json
{
  "variant": "columns-3",
  "columns": [
    {
      "title": "Company",
      "links": [
        { "label": "About", "href": "/about" }
      ]
    }
  ],
  "legal": {
    "copyright": "© 2026 Nextless",
    "privacy": "/privacy",
    "terms": "/terms"
  },
  "social": [
    { "type": "linkedin", "href": "https://linkedin.com/company/nextless" }
  ],
  "layout": {
    "align": "left",
    "legalAlign": "right",
    "maxWidth": "6xl",
    "columnGap": "6",
    "sectionPaddingY": "10"
  },
  "style": {
    "surfaceColor": "#ffffff",
    "borderColor": "#e2e8f0",
    "borderTopWidth": "1",
    "textColor": "#0f172a",
    "headingColor": "#0f172a",
    "linkColor": "#334155",
    "legalTextColor": "#334155",
    "socialColor": "#0f172a",
    "fontSize": "sm",
    "headingTransform": "uppercase"
  }
}
```
