# Section Widget (v1)

## Purpose

Semantic layout wrapper for grouped page bands with local surface styling and
repeatable internal regions.

## Widget ID

`section`

## Variants (v1)

- `default`: balanced wrapper width and region spacing
- `contained`: tighter framed section panel
- `bleed`: full-width section presentation

## Slots

- `region` (repeatable): region instances are stored as `region:<id>` in
  block `slots` map (`region:1`, `region:2`, ...).

## Editor Modes (current after TASK-050-15-02)

### Wizard
- quick variant selection
- title/description onboarding
- basic background color

### Visual
Sections:
1. Variant and structure
2. Heading and intro
3. Semantics and anchor
4. Surface and borders
5. Regions guidance

Notes:
- Section owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Region count is controlled by repeatable slot controls in the Slots panel.

### Advanced
- semantics tokens (`anchorId`, `ariaLabel`)
- surface numeric tokens (`gradientAngle`, `overlayOpacity`)
- normalized payload snapshot for diagnostics

## Runtime Behavior Notes

- Renders semantic element selected in data (`section` or `div`).
- Supports optional overlay on top of background color/gradient.
- Uses deterministic runtime markers:
  - `data-section-variant`
  - `data-section-regions`
  - `data-section-element`
  - `data-section-region` per region slot instance

## Data Model (summary)

```json
{
  "heading": {
    "label": "",
    "title": "",
    "description": ""
  },
  "semantics": {
    "element": "section",
    "anchorId": "",
    "ariaLabel": ""
  },
  "style": {
    "backgroundColor": "transparent",
    "gradientFrom": "",
    "gradientTo": "",
    "gradientAngle": 180,
    "borderColor": "var(--color-border)",
    "borderWidth": "0",
    "radius": "none",
    "overlayColor": "#000000",
    "overlayOpacity": 0
  }
}
```
