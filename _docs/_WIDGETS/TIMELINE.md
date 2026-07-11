# Timeline Widget (v2)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Timeline for process steps, milestones, and dated events, modeled on the
[MUI React Timeline](https://mui.com/material-ui/react-timeline/) capability set:
axis position, opposite content, filled/outlined dots, and semantic dot tones.

## Widget ID

`timeline`

## Presets (block variants)

Presets are the block `variant`s — a single source of truth, with no separate
`mode` field. The Visual editor option list is gated per preset by the exported
`timelineVariantCapabilities` table, so every control that is shown maps to a field
the active preset actually renders.

| Preset | Orientation | Axis | Opposite content |
|--------|-------------|------|------------------|
| `vertical-right` | vertical | content on the right (axis left) | no |
| `vertical-left` | vertical | content on the left (axis right) | no |
| `alternating` | vertical | zigzag (`alternate` / `alternate-reverse`) | no |
| `alternating-opposite` | vertical | zigzag | yes |
| `cards` | vertical | none (card grid) | no |
| `compact` | horizontal | none (process strip) | no |

The axis-position control only appears for `alternating` and
`alternating-opposite` (allowed values `alternate` / `alternate-reverse`); the
vertical presets bake their side in, and `cards` / `compact` have no axis position.

## Editor Modes

### Wizard (single-shot setup)
- Preset gallery (six cards) as the primary choice.
- Read-only summary of header, step count, and per-step titles/descriptions.
- Section id: `timeline.setup.gallery`. Writable path: `variant`.

### Visual (daily editing, preset-aware)
Sections, each gated by `timelineVariantCapabilities[variant].visibleFields`:
1. `timeline.visual.preset-structure` — preset gallery, axis position (gated),
   step count.
2. `timeline.visual.step-content` — per-step grouped fields (Content / Dot / Links):
   title, description, opposite content (gated), status; a lucide dot icon-grid
   picker, per-step dot tone/variant overrides, and dot icon color; CTA and
   whole-step link, with add/remove/drag-reorder.
3. `timeline.visual.dots-connector` — global dot variant/tone/size, the default dot
   icon (lucide icon-grid picker), and the connector (show/style/thickness, gated
   where the preset has no connector).
4. `timeline.visual.appearance` — header, typography, spacing, max width, and the
   clearable section background color.

Controls are grouped into labeled `FieldGroup` blocks and stacked one per row for
readability.

### Advanced (read-only diagnostics)
- `timeline.advanced.runtime` — preset, orientation, axis position, step count.
- `timeline.advanced.appearance` — resolved dot/connector/typography/spacing/
  background plus per-step override counts.
- `timeline.advanced.normalization` — normalization scope, safe-link coverage, and
  editor ownership summary.

`editorCapabilities.visualOwnsVariantSelection = true`; the wizard and Visual share
the `variant` writable path via an explicit `allowedDuplicateWritablePaths`
allowance tagged to `TASK-416`.

## Semantic dot tones

`dot.tone` (global) and `steps[].dotTone` (per-step override) accept
`primary`, `secondary`, `success`, `error`, `warning`, `info`, `grey` and resolve
through a single token map. The front theme has no native success/warning/info
tokens, so they alias existing tokens:

| Tone | Token |
|------|-------|
| primary | `var(--color-primary)` |
| secondary / info | `var(--color-secondary)` |
| success | `var(--color-primary)` (aliased) |
| warning | `var(--color-accent)` (aliased) |
| error | `var(--color-destructive, var(--color-text))` |
| grey | `var(--color-border)` |

There are no hardcoded color palettes in the renderer; the legacy `emerald` status
color was removed.

## Dot icons

Dots can render **any lucide icon** (kebab-case name) instead of a plain dot, set
globally via `dot.icon` and overridden per step via `steps[].markerIcon`. `none`
renders a plain dot; a step icon of `none` inherits the global `dot.icon`. Icons
render as SSR `<svg>` (lucide), with `markerIconColor` controlling the glyph color.

The editor exposes a visual icon-grid picker: ~16 curated quick picks
(`data-timeline-dot-icon-option`) plus a **`+` button** that opens a searchable
dialog over the full lucide library (`data-timeline-dot-icon-browse` /
`data-timeline-dot-icon-pick`). Names are resolved through a kebab→component map
built from lucide's `icons` record, so unknown names normalize away safely.

## Runtime Behavior Notes

- Steps normalize to `3-8` entries with unique stable IDs (`step-1`, ...).
- Dots render `filled` (solid tone) or `outlined` (tone border, transparent fill);
  a step with `markerIcon` renders that icon inside the dot. Per-step
  `dotTone`/`dotVariant` override the global `dot.*`.
- `axis.position` is coerced to the active preset's allowed set during normalize, so
  the page-builder canvas, admin preview, and public front render identically
  (all go through `WidgetRenderer → TimelineBlock`).
- Opposite content renders only for `alternating-opposite`; `oppositeDate` is emitted
  as a semantic `<time dateTime>` next to (or above, on mobile) the dot.
- Accessibility: the section uses a readable label or `aria-labelledby`, the step
  list has an accessible name, the active step renders `aria-current="step"`, and
  decorative icons/dots are `aria-hidden`.
- CTA and whole-step destinations are sanitized through the shared safe-href
  contract; a whole-step link is suppressed whenever a step CTA is present so nested
  anchors never render.
- The compact preset uses overflow-safe horizontal rendering.

## Render Diagnostics Attributes

`data-timeline-variant`, `data-timeline-orientation`, `data-timeline-surface`,
`data-timeline-axis-position`, `data-timeline-dot-variant`, `data-timeline-dot-tone`,
`data-timeline-dot-size`, per-step `data-timeline-step`, and per-dot
`data-timeline-marker-effective-display`.

## Clear Controls

- `background.color` is clearable (clears the section background override).
- Per-step `markerIconColor` is clearable back to inherited behavior.

## Data Model (summary)

```json
{
  "header": { "title": "Roadmap", "description": "Quarterly milestones." },
  "steps": [
    {
      "id": "step-1",
      "title": "Discovery",
      "description": "Define goals and context.",
      "oppositeContent": "Q1 2026",
      "oppositeDate": "2026-01-15",
      "status": "current",
      "markerIcon": "rocket",
      "markerIconColor": "#ffffff",
      "dotVariant": "filled",
      "dotTone": "primary",
      "cta": { "label": "View details", "href": "/timeline/discovery" },
      "link": { "label": "Open discovery", "href": "/timeline/discovery" }
    }
  ],
  "axis": { "position": "right" },
  "dot": { "variant": "filled", "tone": "primary", "size": "md", "icon": "none" },
  "connector": { "show": true, "style": "solid", "thickness": "2" },
  "typography": { "titleSize": "base", "titleWeight": "semibold", "descriptionSize": "sm" },
  "spacing": { "gap": "md", "padding": "md", "sectionSpacing": "none", "maxWidth": "5xl" },
  "background": { "color": "transparent" }
}
```

## TASK-416 Editor Contract

- Exports `timelineEditorContract` with `version: 2`.
- Wizard picks the preset; Visual owns content, dots, axis, connector, and
  appearance; Advanced is read-only diagnostics.
- This contract is a clean break from the v1 `mode`/`layout`/`guides`/`style`
  shape; legacy timeline blocks must be re-added.
