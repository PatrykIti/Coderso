# Timeline Widget (v1)

## Purpose

Process and chronology timeline for milestones, dated events, and alternating
story flows.

## Widget ID

`timeline`

## Variants (legacy compatibility surface)

- `milestones`: markers with labels around the axis
- `cards`: steps rendered as cards
- `compact`: minimal marker+label process strip

Legacy variants remain supported, but current behavior is driven by
`data.mode`:
- `process`
- `axis`
- `chronology`
- `alternating`

## Editor Modes (current after TASK-050-08-02)

### Wizard
- minimal onboarding:
  - step count (`3-8`)
  - variant
  - mode/purpose
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

Each step can now own:
- optional `date`
- optional `dateLabel`
- optional `status` (`upcoming`, `current`, `complete`)
- optional CTA (`label`, `href`)

### Advanced
Technical-only scope:
- layout tokens (orientation, alignment, label position)
- data normalization (safe IDs and step bounds)

Advanced intentionally excludes day-to-day content/style editing.

## Runtime Behavior Notes

- Steps are normalized to `3-8` with stable IDs (`step-1`, `step-2`, ...).
- Duplicate/missing step IDs are normalized to unique IDs.
- Renderer supports process, axis, chronology, and alternating modes while
  keeping legacy variants as compatibility input.
- Optional step dates render through semantic `<time>` when `date` exists.
- Optional step CTA links are sanitized through the shared widget safe-href
  contract before render.
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
  "mode": "axis",
  "steps": [
    {
      "id": "step-1",
      "title": "Discovery",
      "description": "Define goals and context.",
      "icon": "🔍",
      "accent": "#1d4ed8",
      "date": "2026-05-11",
      "dateLabel": "May 11, 2026",
      "status": "current",
      "cta": {
        "label": "View details",
        "href": "/timeline/discovery"
      }
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
