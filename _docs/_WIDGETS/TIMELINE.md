# Timeline Widget (v1)

## Purpose

Process timeline without dates, used for milestones and step-by-step flows.

## Widget ID

`timeline`

## Variants (v1)

- `milestones`: markers with labels around the axis
- `cards`: steps rendered as cards
- `compact`: minimal marker+label process strip

## Editor Modes (current after TASK-050-08-02)

### Wizard
- minimal onboarding:
  - step count (`3-8`)
  - variant
  - orientation
  - guides baseline
  - quick step title editing

### Visual
Primary day-to-day editing mode with section-based IA:
1. Variant and timeline structure
2. Steps content and order
3. Guides and axis line
4. Markers and accents
5. Colors and background
6. Typography and spacing

Timeline owns variant selection in Visual via:
`editorCapabilities.visualOwnsVariantSelection = true`.

### Advanced
Technical-only scope:
- layout tokens (orientation, alignment, label position)
- data normalization (safe IDs and step bounds)

Advanced intentionally excludes day-to-day content/style editing.

## Runtime Behavior Notes

- Steps are normalized to `3-8` with stable IDs (`step-1`, `step-2`, ...).
- Duplicate/missing step IDs are normalized to unique IDs.
- Renderer supports all variants with orientation and label-position markers.
- Invalid runtime variant input falls back to `milestones`.

## Clear Controls

- `background.color` is clearable; clear removes the background color field and
  the renderer omits a forced section background style.
- Style-owned line and marker color fields can be cleared without changing
  per-step accent readability defaults.

## Data Model (summary)

```json
{
  "variant": "milestones",
  "steps": [
    {
      "id": "step-1",
      "title": "Discovery",
      "description": "Define goals and context.",
      "icon": "🔍",
      "accent": "#1d4ed8"
    }
  ],
  "layout": {
    "orientation": "horizontal",
    "align": "center",
    "spacing": "md",
    "labelPosition": "top"
  },
  "guides": {
    "enabled": true,
    "style": "dashed"
  },
  "style": {
    "lineStyle": "solid",
    "thickness": "2",
    "markerSize": "md",
    "lineColor": "#e2e8f0",
    "markerColor": "#1d4ed8",
    "titleColor": "#0f172a",
    "descriptionColor": "#334155",
    "titleSize": "base",
    "descriptionSize": "xs"
  },
  "background": {
    "color": "#f8fafc"
  }
}
```
