# Stats KPI Widget (v1)

## Purpose

Metrics section for proof/trust numbers with clear value-label hierarchy.

## Widget ID

`stats-kpi`

## Variants (v1)

- `cards`: equal KPI cards in a responsive grid
- `inline`: compact KPI row for short sections
- `split-highlight`: one lead metric plus supporting metrics

## Editor Modes (current after TASK-050-13-03)

### Wizard (minimal onboarding)
- KPI layout variant
- Metric count
- Quick values for all visible metrics in the selected wizard count

The wizard count selector and rendered metric inputs must stay synchronized.

### Visual (primary editing mode)
Sections:
1. Variant and metric structure
2. Header copy
3. Metrics content and order
4. Typography and colors
5. Layout display options

Notes:
- Stats KPI owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- Technical spacing and alignment tokens
- Normalization and safeguards
- Raw payload snapshot

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `cards`.
- Renderer outputs deterministic markers:
  - `data-stats-kpi-variant`
  - `data-stats-kpi-count`
  - `data-stats-kpi-alignment`
  - `data-stats-kpi-spacing`
  - `data-stats-kpi-divider`
  - `data-stats-kpi-item`
  - `data-stats-kpi-highlighted`
- Item normalization is deterministic:
  - count clamped to `1..12`
  - IDs deduplicated
  - missing value/label replaced by safe fallbacks

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
      "value": "120+",
      "label": "Projects launched",
      "description": "Production pages delivered in the last 12 months.",
      "icon": "🚀"
    }
  ],
  "style": {
    "alignment": "center",
    "spacing": "md",
    "valueColor": "var(--color-text)",
    "labelColor": "var(--color-text)",
    "divider": true
  }
}
```
