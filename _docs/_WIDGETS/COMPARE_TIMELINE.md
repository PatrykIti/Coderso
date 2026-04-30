# Compare Timeline Widget (v1)

## Purpose

Compare two processes on a shared axis without dates.
Example: traditional flow vs optimized flow.

## Widget ID

`compare-timeline`

## Variants (v1)

- `dual-track`: two tracks rendered against shared axis steps
- `dual-track-highlight`: same as dual-track + highlighted segments on target track

## Editor Modes (current after TASK-050-09-02)

### Wizard (minimal onboarding)
- Highlight mode on/off
- Axis step count (`3-6`)
- Track labels (A/B)
- Marker baseline per track

### Visual (primary editing mode)
Sections:
1. Variant and compare structure
2. Axis steps and track labels
3. Markers and segment mapping
4. Highlight and guide styles
5. Colors and typography
6. Spacing and layout preview hints

Notes:
- Compare Timeline owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.
- Segment controls appear only for `dual-track-highlight`.

### Advanced (technical-only)
- Layout tokens (spacing, axis label position, guides)
- Raw metadata fields (track IDs, axis step IDs, optional step descriptions)
- Normalization utility action (stable IDs, clamped markers/segments, safe step count)

## Runtime Behavior Notes

- Axis steps are normalized to range `3-6` with stable IDs.
- Track set is normalized to deterministic IDs: `a`, `b`.
- Marker indexes are clamped to valid axis range and deduplicated.
- Segment ranges are normalized with `from <= to` and clamped indexes.
- Invalid variant input falls back to `dual-track`.

## Clear Controls

- Highlight, marker, and guide style colors owned by `style` are clearable.
  Clear removes the configured style key and preserves comparison state,
  markers, and segment labels.
- The `highlightLabelStyle` value remains a semantic display choice; clear does
  not convert it into a `transparent` style sentinel.

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
    "guideColor": "var(--color-border)",
    "trackLabelSize": "base",
    "stepLabelSize": "xs",
    "segmentLabelSize": "xs"
  }
}
```
