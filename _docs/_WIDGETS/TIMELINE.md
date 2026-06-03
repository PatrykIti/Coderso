# Timeline Widget (v1)

## Purpose

Timeline for process steps, milestones, dated events, and alternating story
flows.

## Widget ID

`timeline`

## Variants (legacy compatibility surface)

- `milestones`: markers with labels around the axis
- `cards`: steps rendered as cards
- `compact`: minimal marker-plus-label process strip

Legacy variants remain supported, but current behavior is driven by
`data.mode`:
- `process`
- `axis`
- `chronology`
- `alternating`

## Editor Modes (current after TASK-291)

### Wizard
- read-only starter story summary
- current timeline style summary
- read-only header title and description summary
- read-only `3-8` starter step count summary
- read-only per-step title and description preview

Wizard intentionally does not expose timeline mode, layout, guides, status,
icons, marker accents, dates, link destinations, or variant changes. Visual
owns those daily editing controls.

### Visual
Primary day-to-day editing mode with section-based IA:
1. Variant and timeline structure
2. Steps content and order
3. Guides and axis line
4. Markers and accents
5. Colors and background
6. Typography and spacing

Timeline owns variant selection in Visual via
`editorCapabilities.visualOwnsVariantSelection = true`.
Mode preview cards and the `Timeline mode` select both use the same mode update
contract: selecting a mode updates `data.mode` and applies that mode's preferred
legacy variant (`process -> compact`, `axis -> milestones`, `chronology` and
`alternating -> cards`).
When `data.mode = "process"`, compact rendering owns the effective layout.
Saved non-compact legacy variants remain stored but are marked inactive in
Visual until the author chooses Axis, Chronology, or Alternating.

Each step can now own:
- optional `date` and `dateLabel`
- optional `status` (`upcoming`, `current`, `complete`) or no status
- optional title-side `icon`
- optional per-step `accent` override
- optional `markerIcon`, `markerBackgroundColor`, and `markerIconColor`
- optional CTA (`label`, `href`)
- optional whole-step link (`link.href`, `link.label`)

CTA and whole-step destinations are authored through the shared page-first
destination picker. Saved custom/hash/external destinations remain
backward-compatible as replace-or-clear state instead of raw URL text inputs.

Visual also owns:
- mode preview cards and mode-to-variant guidance
- shared metadata for all mutating Visual controls, including real input/select
  fields, destination pickers, variant/mode cards, and step action buttons
- date-format feedback for `YYYY-MM-DD`
- grouped marker/accent controls
- drag reorder with button fallback preserved
- section header, title weight, padding, outer spacing, and max-width controls
- title-hidden warning inside Typography when `style.titleSize = "none"`

### Advanced
Read-only diagnostics:
- runtime summary for variant, mode, and configured step count
- read-only layout, guide, style, and background summaries
- read-only normalization and ownership summary

Advanced intentionally excludes duplicated day-to-day content or style editing
and no longer exposes mutating support actions in the daily tab flow.

## Runtime Behavior Notes

- Steps normalize to `3-8` entries with stable unique IDs (`step-1`,
  `step-2`, ...).
- Renderer supports process, axis, chronology, and alternating modes while
  keeping legacy variants as compatibility input.
- Section/list/current-step semantics are explicit: the section uses a readable
  label or `aria-labelledby`, the step list has an accessible name, and the
  active step renders `aria-current="step"`.
- Decorative step icons and marker icons are hidden from assistive technology
  unless the step has an explicit safe link label.
- Dates render through semantic `<time>` when `date` exists, and date/dateLabel
  metadata can now stay visible in horizontal axis/milestone layouts instead of
  forcing `chronology` mode.
- `style.markerDisplay` supports `dot`, `number`, and `icon`.
- `style.markerDisplay = "icon"` is a requested display mode. A step without
  `markerIcon` or title-side `icon` renders a dot marker and exposes per-marker
  `data-timeline-marker-effective-display="dot"` plus a root
  `data-timeline-marker-icon-fallback-count` diagnostic.
- `style.descriptionSize = "none"` does not hide descriptions. It keeps the
  description text visible and clears the explicit size class so surrounding
  typography can inherit.
- `layout.maxWidth = "6xl"` intentionally narrows to an effective `5xl` class
  when the timeline has three or fewer steps. Runtime keeps the saved
  `data-timeline-max-width="6xl"` and also exposes
  `data-timeline-effective-max-width` and `data-timeline-max-width-narrowed`.
- Whole-step links are sanitized through the shared safe-href contract and are
  suppressed whenever a step CTA is present, so nested anchors are never
  rendered.
- Compact/process layouts render saved step CTAs as compact inline links instead
  of dropping them silently.
- Horizontal milestones use overflow-safe axis rendering and connector widths
  derived from spacing tokens instead of a fixed `4rem` connector.
- Motion remains intentionally static. Timeline does not persist motion fields
  or runtime animation classes in the current contract.

## Shared Owners and Explicit Deferrals

- Shared atomic block update behavior is owned by `TASK-256-01`; Timeline only
  consumes that shared fix.
- Shared contrast advisories are owned by `TASK-299`; Timeline consumes the
  shared editor guidance rather than shipping a local checker.
- Per-step `labelPosition` remains intentionally deferred. Use the global
  `layout.labelPosition` token instead, because per-step placement would not
  stay deterministic across axis, chronology, alternating, and compact layouts.
- Motion remains a no-code/static decision for Timeline. The widget does not
  currently expose CSS-only reveal presets or scroll-trigger runtime behavior.

## Clear Controls

- `background.color` is clearable; clear removes the section background color
  override.
- Line, marker, title, and description colors can be cleared back to inherited
  theme/default behavior.
- Per-step accent, marker background, and marker icon colors now expose the
  same clear/default affordance pattern instead of being one-off exceptions.

## Data Model (summary)

```json
{
  "variant": "milestones",
  "mode": "axis",
  "header": {
    "title": "Roadmap",
    "description": "Quarterly milestones and launch steps."
  },
  "steps": [
    {
      "id": "step-1",
      "title": "Discovery",
      "description": "Define goals and context.",
      "icon": "compass",
      "accent": "#1d4ed8",
      "date": "2026-05-11",
      "dateLabel": "May 11, 2026",
      "status": "current",
      "markerIcon": "rocket",
      "markerBackgroundColor": "#0f172a",
      "markerIconColor": "#ffffff",
      "cta": {
        "label": "View details",
        "href": "/timeline/discovery"
      },
      "link": {
        "label": "Open discovery",
        "href": "/timeline/discovery"
      }
    }
  ],
  "layout": {
    "orientation": "horizontal",
    "align": "center",
    "spacing": "md",
    "labelPosition": "top",
    "padding": "md",
    "sectionSpacing": "none",
    "maxWidth": "6xl"
  },
  "guides": {
    "enabled": true,
    "style": "dashed"
  },
  "style": {
    "lineStyle": "solid",
    "thickness": "2",
    "markerSize": "md",
    "markerDisplay": "dot",
    "lineColor": "#e2e8f0",
    "markerColor": "#1d4ed8",
    "titleColor": "#0f172a",
    "descriptionColor": "#334155",
    "titleSize": "base",
    "titleWeight": "semibold",
    "descriptionSize": "xs"
  },
  "background": {
    "color": "#f8fafc"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `timelineEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only starter summary; Visual owns variant,
  steps, orientation, guides, layout, markers, colors, and background;
  Advanced is read-only runtime diagnostics.
- Current TASK-336-19 cleanup is implemented for Timeline's Wizard/Visual/
  Advanced ownership split.
