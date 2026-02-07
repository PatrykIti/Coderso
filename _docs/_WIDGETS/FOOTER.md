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

## Editor Modes (current after TASK-050-07-01)

### Wizard
- Layout variant selection.
- Quick setup for visible columns (title + first link label/href).
- Legal basics (copyright/privacy/terms).
- Basic social links setup.

### Visual
- Variant and structure summary (runtime column count + quick overview).
- Legal strip editing.
- Social links editing.

### Advanced
- Full structured column link editing (label + href, add/remove).
- Full social list management.
- Legal strip fields.

## Runtime behavior notes

- Column count is normalized by variant:
  - `minimal` -> 1 column
  - `columns-2` -> 2 columns
  - `columns-3` -> 3 columns
- Footer uses deterministic fallback columns when payload is incomplete.
- Slot content is rendered in column regions and bottom strip with nested widget support.

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
  ]
}
```
