# Tabs Widget (v1)

## Purpose

Switch between grouped content panels with repeatable tab/panel pairs and a
bounded visual surface.

## Widget ID

`tabs`

## Variants (v1)

- `pills`: rounded segmented triggers
- `underline`: link-style tabs with active underline
- `minimal`: lightweight compact tab navigation

## Slots

- `panel` (repeatable): slot instances are stored as `panel:<id>` in block
  `slots` map (`panel:1`, `panel:2`, ...).

## Editor Modes

### Wizard
- variant selection
- current tab count and labels
- active/default tab

### Visual
Sections:
1. Variant
2. Structure
3. Layout

Notes:
- Tabs owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Repeatable panel slot count is managed by the builder slot controls/runtime
  slot contract.

### Advanced
- structure and layout controls
- normalized payload snapshot

## Runtime Behavior Notes

- Runtime resolves repeatable panel slots deterministically from `panel:<id>`.
- Active tab falls back to the first resolved item when the saved `activeId`
  no longer matches a panel.
- Runtime emits deterministic markers:
  - `data-nextless-tabs`
  - `data-nextless-tabs-variant`
  - `data-nextless-tabs-active-id`
  - `data-nextless-tabs-panels`
- Triggers render with `role="tab"` and panels render with `role="tabpanel"`.

## Clear Controls

- `style.surfaceColor`, `style.activeBackgroundColor`, and
  `style.panelBackgroundColor` are clearable. Clear removes the field and keeps
  the runtime from forcing an inline style for that surface.

## Data Model (summary)

```json
{
  "items": [
    { "id": "1", "label": "Tab 1", "description": "Primary details." },
    { "id": "2", "label": "Tab 2", "description": "Secondary details." }
  ],
  "options": {
    "activeId": "1",
    "alignment": "start"
  },
  "style": {
    "surfaceColor": "var(--color-surface)",
    "borderColor": "var(--color-border)",
    "activeBackgroundColor": "var(--color-text)",
    "activeTextColor": "var(--color-background)",
    "inactiveTextColor": "var(--color-text)",
    "panelBackgroundColor": "var(--color-surface)"
  }
}
```
