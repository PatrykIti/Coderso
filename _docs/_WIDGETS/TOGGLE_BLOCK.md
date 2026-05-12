# Toggle Block Widget (v1)

## Purpose

Swap between two alternate content panes with a bounded toggle surface and
builder-owned fixed pane slots.

## Widget ID

`toggle-block`

## Variants (v1)

- `switch`: compact toggle button
- `cards`: larger pane framing for richer content swaps

## Slots

- `primary` (fixed)
- `secondary` (fixed)

## Editor Modes

### Wizard
- variant selection
- primary/secondary labels
- helper copy

### Visual
Sections:
1. Variant
2. Labels
3. Behavior and style

Notes:
- Toggle Block owns variant selection in Visual
  (`visualOwnsVariantSelection = true`).
- Pane content stays builder-owned through the fixed `primary` and `secondary`
  slots.

### Advanced
- variant and behavior tuning
- normalized payload snapshot

## Runtime Behavior Notes

- Runtime preserves one active pane at a time through
  `data-nextless-toggle-state`.
- Runtime renders an explicit `radiogroup` with two `radio` triggers, roving
  `tabIndex`, `aria-controls`, and a live status target for the selected state.
- Client-side toggle behavior is wired by the inline runtime script using:
  - `data-nextless-toggle-block`
  - `data-nextless-toggle-trigger`
  - `data-nextless-toggle-state-id`
  - `data-nextless-toggle-pane`
  - `data-nextless-toggle-status`
- Runtime emits deterministic markers:
  - `data-nextless-toggle-variant`
  - `data-nextless-toggle-state`

## Clear Controls

- `style.surfaceColor` is clearable. Clear removes the field and prevents the
  runtime from forcing a pane background color.

## Data Model (summary)

```json
{
  "labels": {
    "primary": "View A",
    "secondary": "View B",
    "helper": "Switch between two content views."
  },
  "options": {
    "defaultState": "primary"
  },
  "style": {
    "surfaceColor": "var(--color-surface)",
    "borderColor": "var(--color-border)",
    "accentColor": "var(--color-text)"
  }
}
```
