# Grid Columns Widget (v2)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Responsive layout primitive for repeatable multi-column compositions. Each
column owns its own slot payload, breakpoint spans, visibility rules, and
optional local surface/height overrides while the widget keeps a bounded
schema-first contract.

## Widget ID

`grid-columns`

## Variants

- `equal`: balanced columns with equal visual weight
- `asymmetric`: selecting the variant reapplies the current desktop preset, while later
  manual desktop span edits stay authoritative until the preset is reapplied
- `masonry-lite`: column wrappers are always cardized for dense mixed-height
  layouts

## Slots

- `column` (repeatable): slot instances are stored as `column:<id>` in the
  block `slots` map
- live add/remove/reorder is owned by the shared Structure section and the
  widget repeatable-slot sync adapter
- shared Structure add, move, and remove actions expose action metadata on the
  `slots.column` path

## Editor Modes

### Wizard

- one-time starter variant selection only
- setup copy explicitly sends column count, labels, spacing, responsive spans,
  surfaces, and behavior to Visual after setup completion
- no label, gap, preset, responsive span, color, or raw token controls

### Visual

Sections:
1. Variant and layout structure
2. Column sizing and labels
3. Gap and column surface
4. Per-column surfaces and behavior
5. Content areas and rendering

Notes:

- Visual owns variant selection (`visualOwnsVariantSelection = true`).
- Visual owns daily column labels, column count guidance, same-count layout
  presets, responsive spans, visibility, spacing, cardized surface controls, and
  per-column overrides.
- The `Reapply asymmetric desktop widths` action is exposed as a stable action
  control with path `columns.desktopSpan`.
- When live slot instances already exist, the local count controls plus add/remove
  actions are locked and users are redirected to the shared Structure section so
  slot payloads and column metadata stay aligned.
- Visual exposes keyboard-safe move up/down controls that reuse the shared
  repeatable-slot reorder seam.
- `masonry-lite` locks the global cardize toggle on with explicit explanatory
  copy for truthful preview behavior.
- Visual shows current desktop/tablet/mobile span totals from the effective
  visible live layout and explains whether each breakpoint fills one row,
  wraps onto additional rows, or leaves unused width.
- Visual color fields are swatch-only for nontechnical authors. Saved custom
  CSS variable/token values remain compatible as replace-or-clear state instead
  of editable text inputs.
- Visual uses user-facing `Content area N` labels; raw `column:<id>` slot ids
  stay out of the normal authoring surface.

### Advanced

- read-only layout summary for alignment, gaps, span totals, cardized state,
  and live content-area drift
- read-only per-column override summary for surface/overflow/height/alignment
- read-only content-area support diagnostics and theme surface defaults
- no inputs, selects, buttons, hidden mutating controls, or raw JSON payload
  snapshots in the normal Advanced UI
- `masonry-lite` cardized state is summarized here; writable cardize/surface
  controls stay Visual-owned so Advanced does not duplicate Visual/runtime
  truthfulness

## Runtime Behavior

- when no live repeatable slot ids exist yet, the renderer synthesizes
  `column:<instanceId>` targets from configured columns; once live slot ids
  exist, runtime follows the slot structure deterministically through
  `column:<instanceId>`
- keeps public technical labels and `Empty column.` helper copy gated to
  editor-preview/admin-preview only
- emits bounded responsive column classes for:
  - `mobileSpan`, `tabletSpan`, `desktopSpan`
  - optional `xlSpan` and `twoXlSpan`
  - optional `hideOnMobile`, `hideOnTablet`, `hideOnDesktop`
  - optional `reverseOnMobile`
- supports per-column:
  - `style.surface = "on"` to highlight a single column without forcing the
    whole grid into cardized mode
  - `style.overflow` to clip column content without forcing a local card shell
  - `style.background`, `style.borderColor`, `style.borderWidth`,
    `style.radius`, `style.padding`, `style.overflow`
  - `minHeight`, `mobileMinHeight`, `alignSelf`
- preserves backward compatibility for legacy payloads by treating omitted
  `minHeight` as the historical `min-h-[6rem]` output and omitted per-column
  overrides as inheritance from global widget style
- does not auto-balance saved span totals at runtime; totals above `12` wrap
  onto additional rows and totals below `12` leave unused width, with the
  editor exposing that state explicitly

## Bounded Token Sets

- spans: `1` through `12`
- gaps: `none`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `10`, `12`
- border widths: `0`, `1`, `2`, `3`
- radius: `none`, `lg`, `xl`, `2xl`
- padding: `none`, `2`, `3`, `4`, `5`, `6`
- min heights: `none`, `sm`, `md`, `lg`, `xl`
- per-column overflow: `visible`, `hidden`
- per-column vertical alignment: `inherit`, `start`, `center`, `end`,
  `stretch`

## Data Model (summary)

```json
{
  "columns": [
    {
      "id": "1",
      "label": "Column 1",
      "desktopSpan": "6",
      "tabletSpan": "6",
      "mobileSpan": "12",
      "xlSpan": "9",
      "twoXlSpan": "8",
      "hideOnMobile": false,
      "hideOnTablet": false,
      "hideOnDesktop": false,
      "minHeight": "lg",
      "mobileMinHeight": "none",
      "alignSelf": "end",
      "style": {
        "surface": "on",
        "background": "#112233",
        "borderColor": "var(--color-border)",
        "borderWidth": "2",
        "radius": "2xl",
        "padding": "6",
        "overflow": "hidden"
      }
    }
  ],
  "layout": {
    "gapX": "8",
    "gapY": "3",
    "align": "stretch",
    "reverseOnMobile": true
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

## Validation Notes

- `columns[]` stays strict and bounded (`additionalProperties: false`)
- global and per-column surface colors accept only approved `var(--color-*)`
  tokens or hex colors (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`)
- arbitrary class strings, arbitrary CSS maps, `url(...)`, script-like
  fragments, and unknown nested style keys are rejected by schema validation
- `gapX` and `gapY` remain separate persisted fields; TASK-271 only expanded the
  bounded token list and clarified editor labels
- global and per-column saved color values preserve approved `var(--color-*)`
  tokens verbatim at runtime, while Visual shows swatch-only replacement plus
  clear actions instead of asking authors to type CSS/token strings
- effective span totals follow the live slot count and each breakpoint's visibility toggles rather than the raw saved `columns[]` list alone
- when live repeatable `column` slots exist, editor rows, layout presets, and asymmetric recovery follow the current live slot order and ignore saved phantom columns until the structure is reconciled
- repeatable slot targets may resolve live column instance ids from either explicit `instanceId` values or parsable `column:<instanceId>` slot ids before the editor decides whether local structure controls should lock

## Explicit Non-Scope

- raw custom CSS classes per column are intentionally rejected until a safe
  class registry/policy exists
