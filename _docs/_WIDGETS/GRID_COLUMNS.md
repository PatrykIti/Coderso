# Grid Columns Widget (v1)

## Purpose

Responsive layout primitive for multi-column structures with repeatable column
slots and per-breakpoint span tokens.

## Widget ID

`grid-columns`

## Variants (v1)

- `equal`: balanced columns
- `asymmetric`: emphasized lead column
- `masonry-lite`: cardized columns for dense compositions

## Slots

- `column` (repeatable): slot instances are stored as `column:<id>` in block
  `slots` map (`column:1`, `column:2`, ...).

## Editor Modes (current after TASK-050-15-03)

### Wizard
- variant selection
- column config count
- first two column labels
- base horizontal/vertical gap

### Visual
Sections:
1. Variant and layout structure
2. Column sizing and labels
3. Gap and column surface
4. Slots and runtime behavior

Notes:
- Grid Columns owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Repeatable slot instance count is managed in the shared Structure section / Slots panel.
- When column configs drift from actual slot instances, the editor shows an
  explicit warning and the preview continues to follow the real slot count until
  the structure is reconciled.
- `masonry-lite` always renders cardized column wrappers, so the Visual cardize
  toggle is locked on with explanatory copy for truthful preview behavior.

### Advanced
- technical layout tokens (align, gap, border width, padding)
- cardized mode toggle
- normalized payload snapshot

## Runtime Behavior Notes

- Resolves repeatable column slot targets deterministically.
- Maps configured column tokens to slot instances by `column:<instanceId>`.
- Falls back to variant-specific span defaults when slot instances exceed configured
  column payload rows.
- Exposes deterministic markers:
  - `data-grid-columns-variant`
  - `data-grid-columns-count`
  - `data-grid-columns-align`
  - `data-grid-columns-gap-x`
  - `data-grid-columns-gap-y`
  - `data-grid-column` and `data-grid-column-instance` per slot
- Technical column labels and `Empty column.` helper copy are editor-only and do
  not render in public runtime output.

## Clear Controls

- `style.columnBackground` is clearable; clear removes the field and cardized
  columns render without a forced background color.
- Border, radius, padding, and gap controls keep their existing token semantics.

## Data Model (summary)

```json
{
  "columns": [
    {
      "id": "1",
      "label": "Column 1",
      "desktopSpan": "6",
      "tabletSpan": "6",
      "mobileSpan": "12"
    },
    {
      "id": "2",
      "label": "Column 2",
      "desktopSpan": "6",
      "tabletSpan": "6",
      "mobileSpan": "12"
    }
  ],
  "layout": {
    "gapX": "6",
    "gapY": "6",
    "align": "start"
  },
  "style": {
    "cardizeColumns": false,
    "columnBackground": "var(--color-surface)",
    "columnBorderColor": "var(--color-border)",
    "columnBorderWidth": "1",
    "columnRadius": "xl",
    "columnPadding": "4"
  }
}
```
