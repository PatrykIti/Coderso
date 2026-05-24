# Compare Timeline Widget

## Purpose

Compare two process paths on a shared step axis without dates.

Typical use cases:
- traditional vs optimized rollout
- before vs after delivery flow
- internal vs customer-facing implementation path

## Widget ID

`compare-timeline`

## Variants

- `dual-track`: render both tracks against the same axis without highlighted segments
- `dual-track-highlight`: render highlighted segments on one or both tracks

## Editor Modes

### Wizard

- Highlight mode on/off
- Axis step count (`3-10`)
- Axis labels and descriptions
- Track labels
- Marker baseline per track
- Beginner-safe highlight target + segment editing when highlight mode is enabled

### Visual

Sections:
1. Variant and compare structure
2. Axis steps and track labels
3. Markers and segment mapping
4. Highlight and guide styles
5. Colors and typography
6. Spacing and layout preview hints

Notes:
- Compare Timeline owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector stays suppressed.
- In highlight mode, both tracks expose segment editors.
- Visual is the single truthful owner for spacing, axis label position, max
  width, section padding, and render order.

### Advanced

- Guide toggles/styles
- Raw metadata fields (track IDs, axis step IDs, raw step descriptions)
- Highlight target selection with label + stable ID copy
- Normalization utility action (stable IDs, clamped markers/segments, safe step count)

Advanced does not duplicate Visual layout controls.

## Runtime Behavior Notes

- Axis steps normalize to range `3-10` with deterministic IDs.
- Axis steps can include:
  - `label`
  - optional `description`
  - optional plain-text `icon`
  - optional safe `href`
- Track set is always normalized to deterministic IDs: `a`, `b`.
- Highlight state preserves legacy `highlight.targetTrackId` and now also owns
  `highlight.targetTrackIds` for one-track or both-track highlighting.
- Desktop grid width follows the normalized step count; mobile still renders a
  single-column axis/track layout.
- Section, track rows, step cells, and segment badges now expose readable
  accessibility labels.
- `guides.enabled=false` removes guide borders fully.
- Highlighted segment backgrounds render a fallback color before the
  `color-mix(...)` enhancement.
- Step and segment links normalize through `normalizeWidgetSafeHref()`.
- Render order is controlled by `layout.trackOrder` without mutating the stored
  track array or deterministic track IDs.

## Shared Contract Notes

- Compare Timeline color fields now surface shared contrast advisories.
- Motion presets are now bounded to `none`, `fade`, and `slide`, and respect
  reduced-motion preferences.

## Clear Controls

The following style fields are clearable:

- `highlightColor`
- `markerColor`
- `trackLabelColor`
- `stepLabelColor`
- `mutedStepColor`
- `guideColor`
- `trackBackgroundColor`

Clear removes the configured style key and lets runtime fall back through the
normalizer/default contract.

`highlightLabelStyle`, font weights, marker shape, label sizes, and layout
tokens remain explicit semantic choices; they are not clearable style sentinels.

## Data Model (summary)

```json
{
  "variant": "dual-track-highlight",
  "header": {
    "title": "Optional section title",
    "subtitle": "Optional supporting subtitle"
  },
  "axis": {
    "steps": [
      {
        "id": "step-1",
        "label": "Plan",
        "description": "Optional",
        "icon": "🧭",
        "href": "/plan"
      }
    ]
  },
  "tracks": [
    {
      "id": "a",
      "label": "Traditional",
      "markers": [0, 1, 2],
      "segments": [
        {
          "from": 0,
          "to": 1,
          "label": "Slow approvals",
          "href": "/traditional"
        }
      ]
    },
    {
      "id": "b",
      "label": "With us",
      "markers": [0, 2],
      "segments": [
        {
          "from": 1,
          "to": 2,
          "label": "Accelerated",
          "href": "https://example.com/accelerated"
        }
      ]
    }
  ],
  "guides": { "enabled": true, "style": "dashed" },
  "layout": {
    "trackSpacing": "md",
    "labelPosition": "top",
    "maxWidth": "6xl",
    "padding": "md",
    "trackOrder": "a-first"
  },
  "highlight": {
    "targetTrackId": "b",
    "targetTrackIds": ["a", "b"]
  },
  "style": {
    "highlightColor": "#f59e0b",
    "highlightLabelStyle": "solid",
    "markerColor": "var(--color-primary)",
    "trackLabelColor": "var(--color-text)",
    "stepLabelColor": "var(--color-text)",
    "mutedStepColor": "var(--color-text)",
    "guideColor": "var(--color-border)",
    "trackBackgroundColor": "#ffffff",
    "trackLabelSize": "base",
    "stepLabelSize": "xs",
    "segmentLabelSize": "xs",
    "trackLabelFontWeight": "semibold",
    "stepLabelFontWeight": "semibold",
    "segmentLabelFontWeight": "normal",
    "markerShape": "rounded"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `compareTimelineEditorContract` with `version: 2`.
- Contract target: Wizard seeds comparison copy, axis, and tracks; Visual owns
  axis/tracks/highlights/layout/style; Advanced is read-only runtime
  diagnostics.
- Raw step IDs and writable Advanced guide/highlight controls are routed to
  `TASK-336-19`.
