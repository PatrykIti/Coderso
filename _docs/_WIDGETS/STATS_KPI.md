# Stats KPI Widget (current)

## Purpose

Metrics section for proof and trust numbers with a clear value-label hierarchy,
optional supporting copy, and bounded presentation controls.

## Widget ID

`stats-kpi`

## Variants

- `cards`: equal KPI cards in a responsive grid.
- `inline`: compact KPI row with optional dividers.
- `split-highlight`: one lead KPI with supporting metrics on the side.

## Editor Modes (current after TASK-287)

### Wizard (publishable onboarding)
- Variant cards.
- Metric count.
- Header title and description.
- Visible metric `value`, `label`, `description`, and `icon` fields for the active count.
- Header clear action.
- Icon guidance and spacing guidance.

The Wizard count selector stays synchronized with the normalized visible item list.

### Visual (primary editing mode)
Sections:
1. Variant and metric structure.
2. Header copy.
3. Metrics content and links.
4. Text and value styling.
5. Card and icon surfaces.
6. Section layout and spacing.

Notes:
- Stats KPI owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Metric management includes drag-friendly reorder, Move up/Move down fallback, and confirmed removal.
- Per-metric links stay presentational and reuse the shared safe-href contract.

### Advanced (technical-only)
- Technical spacing and alignment tokens.
- Normalization and safeguards.
- Raw payload snapshot.

## Runtime Behavior Notes

- Invalid or unknown variants fall back to `cards`.
- Metric links render only when `resolveWidgetLinkAttrs(...)` returns a safe href.
  Unsafe protocols fall back to non-clickable KPI cards.
- Renderer outputs deterministic markers:
  - `data-stats-kpi-variant`
  - `data-stats-kpi-count`
  - `data-stats-kpi-alignment`
  - `data-stats-kpi-spacing`
  - `data-stats-kpi-divider`
  - `data-stats-kpi-divider-intensity`
  - `data-stats-kpi-value-size`
  - `data-stats-kpi-max-width`
  - `data-stats-kpi-padding`
  - `data-stats-kpi-min-height`
  - `data-stats-kpi-icon-size`
  - `data-stats-kpi-item`
  - `data-stats-kpi-highlighted`
  - `data-stats-kpi-link`
  - `data-stats-kpi-trend-direction`
  - `data-stats-kpi-prefix`
  - `data-stats-kpi-suffix`
- Item normalization is deterministic:
  - count clamped to `1..12`
  - duplicate or missing IDs normalized to stable `kpi-*` ids
  - empty optional fields omitted
  - legacy payloads without the new fields still render with safe defaults
- Animated count-up remains intentionally rejected by the research matrix until a
  later accessibility/performance task explicitly approves it.
- `split-highlight` secondary-metric odd-count rebalancing is still a shared
  residual owned by `TASK-331`; the current branch continues to use the landed
  shared baseline rather than inventing widget-local runtime drift.

## Clear Controls

- Header copy can be cleared from Wizard and Visual.
- `style.sectionBackground`, `style.cardBackground`, `style.cardBorderColor`,
  `style.iconSurface`, and `style.iconBorderColor` are clearable.
- Cleared surface values are omitted from normalized output and do not force
  empty inline styles.
- Text-token inputs continue to accept design tokens and CSS variables.

## Data Model (summary)

```json
{
  "header": {
    "title": "Proof in numbers",
    "description": "Show key performance metrics and outcomes in a readable format."
  },
  "items": [
    {
      "id": "kpi-1",
      "value": "120",
      "suffix": "+",
      "label": "Projects launched",
      "description": "Production pages delivered in the last 12 months.",
      "icon": "🚀",
      "accentColor": "var(--color-accent)",
      "trend": {
        "label": "+18% YoY",
        "direction": "up"
      },
      "link": {
        "href": "/work",
        "label": "See launch examples",
        "openInNewTab": false
      }
    }
  ],
  "style": {
    "alignment": "center",
    "spacing": "md",
    "valueColor": "var(--color-text)",
    "labelColor": "var(--color-text)",
    "descriptionColor": "var(--color-text)",
    "valueSize": "md",
    "divider": true,
    "dividerIntensity": "default",
    "sectionBackground": "var(--color-bg-subtle)",
    "maxWidth": "lg",
    "padding": "md",
    "minHeight": "none",
    "cardBackground": "var(--color-bg)",
    "cardBorderColor": "var(--color-border)",
    "iconSize": "md",
    "iconSurface": "var(--color-bg-muted)",
    "iconBorderColor": "var(--color-border)"
  }
}
```
