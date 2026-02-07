# Timeline Widget (v1)

## Purpose

Process timeline without dates, used for milestones and step-by-step flows.

## Widget ID

`timeline`

## Variants (v1)

- `milestones`: markers with labels around the axis
- `cards`: steps rendered as cards
- `compact`: minimal marker+label process strip

## Editor Modes (current after TASK-050-08-01)

### Wizard
- Step count (`3-8`)
- Variant selection
- Orientation (`horizontal` / `vertical`)
- Label position (`top` / `bottom`)
- Guides enabled/disabled
- Quick step title editing

### Visual
- Practical day-to-day editing for:
  - step content (`title`, `description`, `icon`, `accent`)
  - layout and guides
  - axis/marker style
  - colors and section background

### Advanced
- Full model editing is still available in 08-01:
  - steps editor (add/remove/edit)
  - layout tokens
  - guide and line controls
  - color tokens and background
- Scope cleanup to technical-only Advanced is planned in `TASK-050-08-02`.

## Runtime Behavior Notes

- Steps are normalized to `3-8` with stable IDs (`step-1`, `step-2`, ...).
- Duplicate/missing step IDs are normalized to unique IDs.
- Renderer supports all variants with orientation and label-position markers.
- Invalid runtime variant input falls back to `milestones`.

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
    "descriptionColor": "#334155"
  },
  "background": {
    "color": "transparent"
  }
}
```
