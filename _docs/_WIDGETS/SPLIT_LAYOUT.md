# Split Layout Widget (v1)

## Purpose

Two-pane layout primitive for left/right compositions with ratio control and
mobile collapse behavior.

## Widget ID

`split-layout`

## Variants (v1)

- `50-50`: balanced panes
- `40-60`: narrower left pane
- `60-40`: wider left pane

## Slots

- `left` (fixed)
- `right` (fixed)

## Editor Modes (current after TASK-050-15-05)

### Wizard
- split preset selection
- mobile collapse mode
- base gap

### Visual
Sections:
1. Variant and pane ratio
2. Mobile collapse behavior
3. Spacing and vertical alignment
4. Pane slots

Notes:
- Split Layout owns variant selection in Visual (`visualOwnsVariantSelection = true`).

### Advanced
- token-level ratio controls (desktop/tablet)
- collapse mode, reverse mobile order, gap, vertical align
- normalized payload snapshot

## Runtime Behavior Notes

- Renders fixed `left` and `right` pane slots.
- Supports mobile collapse modes:
  - `stack`: single-column on mobile, split on tablet/desktop
  - `keep`: split preserved on mobile
- Supports optional mobile pane order reversal (`reverseOnMobile`).
- Exposes deterministic markers:
  - `data-split-layout-variant`
  - `data-split-ratio-desktop`
  - `data-split-ratio-tablet`
  - `data-split-collapse-mobile`
  - `data-split-reverse-mobile`
  - `data-split-gap`
  - `data-split-vertical-align`
  - `data-split-side` (`left` / `right`)
  - `data-split-items-left`
  - `data-split-items-right`

## Data Model (summary)

```json
{
  "ratio": {
    "desktop": "50-50",
    "tablet": "50-50"
  },
  "collapseMobile": "stack",
  "reverseOnMobile": false,
  "gap": "6",
  "verticalAlign": "stretch"
}
```
