# Compare Timeline Widget (v1)

## Purpose

Compare two processes on a shared axis without dates.
Example: traditional flow vs optimized flow.

## Widget ID

`compare-timeline`

## Variants (v1)

- `dual-track`: two tracks rendered against shared axis steps
- `dual-track-highlight`: same as dual-track + highlighted segments on target track

## Editor Modes (current after TASK-050-09-01)

### Wizard
- Variant selection
- Track labels
- Axis step count (`3-6`)
- Axis labels
- Marker selection for track A and B
- Highlight toggle + target track + quick segment editor

### Visual
- Variant selection
- Track labels
- Marker mapping per track
- Highlight target and segment quick editing
- Guide/layout quick controls (guide style, label position, track spacing)
- Highlight style controls (color + label style)

### Advanced
- Full axis editor (labels + optional descriptions, step count add/remove)
- Full track editor (markers + segments with range controls)
- Guides/layout controls
- Full style token controls (highlight, marker, labels, guides)

## Runtime Behavior Notes

- Axis steps are normalized to range `3-6` with stable IDs.
- Track set is normalized to deterministic IDs: `a`, `b`.
- Marker indexes are clamped to valid axis range and deduplicated.
- Segment ranges are normalized with `from <= to` and clamped indexes.
- Invalid variant input falls back to `dual-track`.

## Data Model (summary)

```json
{
  "variant": "dual-track-highlight",
  "axis": {
    "steps": [
      { "id": "step-1", "label": "Plan", "description": "Optional" }
    ]
  },
  "tracks": [
    {
      "id": "a",
      "label": "Traditional",
      "markers": [0, 1, 2],
      "segments": [{ "from": 0, "to": 1, "label": "Slow approvals" }]
    },
    {
      "id": "b",
      "label": "With us",
      "markers": [0, 2],
      "segments": [{ "from": 1, "to": 2, "label": "Accelerated" }]
    }
  ],
  "guides": { "enabled": true, "style": "dashed" },
  "layout": { "trackSpacing": "md", "labelPosition": "top" },
  "highlight": { "targetTrackId": "b" },
  "style": {
    "highlightColor": "#f59e0b",
    "highlightLabelStyle": "solid",
    "markerColor": "var(--color-primary)",
    "trackLabelColor": "var(--color-text)",
    "stepLabelColor": "var(--color-text)",
    "mutedStepColor": "var(--color-text)",
    "guideColor": "var(--color-border)"
  }
}
```
