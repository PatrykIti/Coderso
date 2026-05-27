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

## Editor Modes (current after TASK-336-12)

### Wizard (one-time setup seed)
- `Layout overview`: read-only current layout and visible metric count.
- `Spacing guidance`: read-only explanation of the active Visual-owned rhythm.

Wizard does not own layout/count, section header copy, or metric content
anymore. `variant`, `items.count`, `header.*`, plus per-metric `value`,
`label`, `description`, `icon`, trends, and links are all Visual-owned daily
edits.

Wizard intentionally overlaps with Visual for starter fields only until
`TASK-336-16` moves the Wizard lifecycle out of daily editing. Those overlaps
are explicitly allowlisted in the v2 editor contract and Playwright inventory.
The Wizard count selector stays synchronized with the normalized visible item
list.

### Visual (primary editing mode)
Sections:
1. Variant and structure.
2. Section header.
3. Metrics content and links.
4. Typography.
5. Card and icon surfaces.
6. Section layout and spacing.

Notes:
- Stats KPI owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Metric management includes drag-friendly reorder, Move up/Move down fallback, and confirmed removal.
- Per-metric links stay presentational and reuse the shared safe-href contract.

### Advanced (read-only diagnostics)
- Runtime diagnostics: resolved variant, metric count, split-highlight secondary grid, and static-animation policy.
- Style diagnostics: layout, typography, surface, and divider summaries derived from normalized data.
- Runtime summary: safe-link status, normalized item count, and contract summary without raw JSON snapshots.
- Repair actions: `Normalize now` and `Reset to defaults` are explicit action controls with confirmation, not daily writable owners.

Advanced has no writable metric, style, layout, header, or variant control paths.
Daily presentation ownership stays in Visual.

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
- `split-highlight` secondary-metric odd-count rebalancing was closed by
  shared `TASK-331`; the current branch now uses count-aware odd/even rest-grid
  classes without inventing widget-local runtime drift.

## Clear Controls

- Header copy can be cleared from Wizard and Visual.
- `items[].accentColor`, `style.valueColor`, `style.labelColor`,
  `style.descriptionColor`, `style.sectionBackground`,
  `style.cardBackground`, `style.cardBorderColor`, `style.iconSurface`, and
  `style.iconBorderColor` are clearable.
- Cleared surface values are omitted from normalized output and do not force
  empty inline styles.
- Visual color authoring uses swatch-only controls and clear actions instead of
  raw CSS token text inputs. Existing design tokens and CSS variables remain
  compatible as saved custom color state that can be replaced with a swatch or
  cleared where the field is clearable.
- New widget defaults leave color values un-authored; runtime theme colors are
  applied at render time so a fresh editor starts from `Theme default` instead
  of misleading saved-custom state.

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
    "valueSize": "md",
    "divider": true,
    "dividerIntensity": "default",
    "maxWidth": "lg",
    "padding": "md",
    "minHeight": "none",
    "iconSize": "md"
  }
}
```
