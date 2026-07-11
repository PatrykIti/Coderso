# Toggle Block Widget (v2)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Swap between two alternate content panes with a bounded toggle surface, fixed
builder-owned `primary` / `secondary` slots, and explicit two-pane product
scope.

## Widget ID

`toggle-block`

## Variants

- `switch`: compact segmented trigger for fast content swaps
- `cards`: larger selector cards with stronger pane framing and card-like rhythm

## Slots

- `primary` (fixed)
- `secondary` (fixed)

Toggle Block intentionally stops at two panes in v2. Use Tabs or a future task
for 3+ views instead of widening this widget implicitly.

## Editor Modes

### Wizard

Wizard is now a read-only starter summary:
- current toggle surface summary
- guidance that Visual owns pane naming, helper copy, starting pane, motion, and styling

### Visual

Visual owns the day-to-day authoring surface:
- variant previews
- labels and helper copy
- default pane and motion choice
- shared color controls for surface, border, accent, and accent contrast
- accessibility copy overrides with beginner-facing labels
- independent pane-card controls for `primary` and `secondary`
- active-pane preview notice
- two-pane authoring guidance

### Advanced

Advanced keeps the contract explicit:
- read-only runtime summary
- read-only style and pane-card diagnostics
- read-only support summary for fixed `primary` / `secondary` slots
- no mutations, reset buttons, or editable raw payload controls

## Runtime Contract

### Data markers

The public runtime uses the scoped `data-coderso-*` markers below:
- `data-coderso-toggle-block`
- `data-coderso-toggle-variant`
- `data-coderso-toggle-state`
- `data-coderso-toggle-motion`
- `data-coderso-toggle-trigger`
- `data-coderso-toggle-state-id`
- `data-coderso-toggle-status-label`
- `data-coderso-toggle-pane`
- `data-coderso-toggle-status`

### Accessibility

Runtime renders:
- one `radiogroup`
- two `radio` triggers with scoped `aria-controls`
- one active pane at a time via `hidden`
- a polite live-status target based on the active label plus `selectedSuffix`

`labels.ariaLabel` overrides the radiogroup label. `labels.selectedSuffix`
controls the live-status suffix and defaults to `selected`.

### Motion

Public page renders register the Toggle Block runtime payload once per page
through the shared widget script collector. Editor-preview output stays
script-free and is documented in the editor as a static preview; authors inspect
the alternate pane by changing the default state.

Supported motion values:
- `none`
- `fade`
- `slide`

Motion is bounded and rendered from fixed class maps only. Reduced-motion users
fall back through `motion-reduce:*` classes instead of forced animation.

## Style Contract

### Root colors

Root color fields are optional in fresh payloads. When omitted, runtime applies
theme fallbacks without persisting CSS variable strings as saved custom values.
Imported/admin/API payloads are normalized before public rendering. Unsafe CSS
strings such as `url(...)`, `expression(...)`, `javascript:`, `data:`,
delimiter injection, unknown functions, and malformed colors are rejected before
they can reach inline styles or Toggle Block CSS custom properties.

Allowed root color values are bounded CSS colors from the shared clearable color
contract:
- hex colors (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`)
- bounded `rgb/rgba` and `hsl/hsla` values
- `var(--color-*)` theme tokens
- `transparent`, `currentColor`, and `inherit`

`style.surfaceColor`
- Clearable.
- Removes the wrapper background color when cleared.

`style.borderColor`
- Clearable.
- Falls back to `var(--color-border)` when omitted.

`style.accentColor`
- Clearable.
- Drives the active trigger background and optional inactive trigger text accent.
- Must not render as inline text color on the active trigger.

`style.accentContrastColor`
- Clearable.
- Falls back to `var(--color-background)` when omitted.
- Renders active trigger text through `--nextless-toggle-accent-contrast` so it
  stays readable against `accentColor`.

### Per-pane tokens

`style.panes.primary` and `style.panes.secondary` are normalized independently.
Each pane supports bounded tokens only:
- `surface`: `default | soft | contrast`
- `padding`: `compact | comfortable | spacious`
- `radius`: `sm | md | lg`
- `borderEmphasis`: `subtle | strong`

Unknown values are rejected by schema validation and normalized back to safe
fallbacks in editor/runtime code.

## Data Model (summary)

```json
{
  "labels": {
    "primary": "View A",
    "secondary": "View B",
    "helper": "Switch between two content views.",
    "ariaLabel": "Toggle content view",
    "selectedSuffix": "selected"
  },
  "options": {
    "defaultState": "primary",
    "motion": "none"
  },
  "style": {
    "panes": {
      "primary": {
        "surface": "default",
        "padding": "comfortable",
        "radius": "md",
        "borderEmphasis": "subtle"
      },
      "secondary": {
        "surface": "default",
        "padding": "comfortable",
        "radius": "md",
        "borderEmphasis": "subtle"
      }
    }
  }
}
```

## Authoring Notes

- Empty-pane guidance is editor-preview-only and uses human-facing pane labels.
  Public runtime does not leak page-builder instructions.
- Shared color controls are reused instead of raw-only local token inputs.
- Visual color authoring is swatch-only for normal users. Saved theme tokens or
  custom legacy color values remain compatible as replace-or-clear state instead
  of editable raw CSS/text fields.
- Advanced diagnostics report the normalized/effective root color state. Rejected
  imported values are shown as theme defaults instead of active configured
  colors.

## TASK-336-19 Editor Contract Cleanup

- Exports `toggleBlockEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only starter summary; Visual owns variant,
  daily labels, motion, accessibility copy, colors, and pane styling; Advanced
  is read-only runtime/contract diagnostics.
- `TASK-336-19` removes the remaining Advanced writable controls, moves
  accessibility and pane-card styling to Visual, and retargets temporary
  Wizard/Visual duplicate allowances until the shared contract matches strict
  ownership semantics end to end.
