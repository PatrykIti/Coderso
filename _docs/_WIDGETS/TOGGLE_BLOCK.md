# Toggle Block Widget (v2)

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

Wizard handles the first-run setup path:
- variant choice with preview miniatures
- primary / secondary labels
- helper copy
- default starting pane

### Visual

Visual owns the day-to-day authoring surface:
- variant previews
- labels and helper copy
- default pane and motion choice
- shared color controls for surface, border, accent, and accent contrast
- active-pane preview notice
- two-pane authoring guidance

### Advanced

Advanced keeps the contract explicit:
- accessibility copy overrides (`ariaLabel`, `selectedSuffix`)
- independent pane token controls for `primary` and `secondary`
- reset-to-defaults with undo feedback
- normalized payload diagnostics

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

Public page renders register the Toggle Block runtime payload once per page through
 the shared widget script collector. Editor-preview output stays script-free.

Supported motion values:
- `none`
- `fade`
- `slide`

Motion is bounded and rendered from fixed class maps only. Reduced-motion users
fall back through `motion-reduce:*` classes instead of forced animation.

## Style Contract

### Root colors

`style.surfaceColor`
- Clearable.
- Removes the wrapper background color when cleared.

`style.borderColor`
- Clearable.
- Falls back to `var(--color-border)` when omitted.

`style.accentColor`
- Clearable.
- Drives the active trigger background/text accent pair.

`style.accentContrastColor`
- Clearable.
- Falls back to `var(--color-background)` when omitted.
- Keeps active trigger text readable against `accentColor`.

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
    "surfaceColor": "var(--color-surface)",
    "borderColor": "var(--color-border)",
    "accentColor": "var(--color-text)",
    "accentContrastColor": "var(--color-background)",
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
- Reset to defaults restores the normalized v2 contract and offers undo.

## TASK-336-18 Editor Contract

- Exports `toggleBlockEditorContract` with `version: 2`.
- Contract target: Wizard seeds variant, labels, and starting pane; Visual owns
  daily labels, motion, accessibility copy, and pane styling; Advanced is
  read-only runtime/contract diagnostics.
- Existing Advanced writable controls and replayable Wizard/Visual duplicates
  are routed to `TASK-336-19` / `TASK-336-16`.
