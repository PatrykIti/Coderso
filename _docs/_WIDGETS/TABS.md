# Tabs Widget (v1)

## Purpose

Switch between grouped content areas with repeatable tabs and a bounded visual
surface.

## Widget ID

`tabs`

## Variants (v1)

- `pills`: rounded segmented triggers
- `underline`: link-style tabs with active underline
- `minimal`: lightweight compact tab navigation

## Slots

- `panel` (repeatable): slot instances are stored as `panel:<id>` in the block
  `slots` map (`panel:1`, `panel:2`, ...).

## Editor Modes

### Wizard
- rendered panel count summary from Structure-owned repeatable slots
- saved starter label count summary
- read-only starter label and content-intro summary
- repeatable content-area guidance

Wizard is setup-only in the v2 editor contract. It does not own variant,
rendered panel count, layout, tab label style, color, or daily tab copy edits.
Add/remove/reorder actions for rendered tabs live in the shared Visual
Structure controls. The one-time Wizard lifecycle from `TASK-336-16` hides
Wizard during normal daily editing and exposes setup through `Run setup again`.

### Visual
Sections:
1. Variant
2. Tab content
3. Layout
4. Tab label style
5. Colors
6. Structure (shared builder slot controls)

Notes:
- Tabs owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Tab content exposes `label`, `panelIntro`, `triggerDescription`, `icon`, and
  `disabled` through beginner-facing tab copy and unavailable-state controls.
- Layout owns orientation, alignment, container padding, tab gap, and content
  gap. Tabs wrap onto additional lines when space is tight; the old scroll
  value is accepted only as legacy data and normalizes back to wrapping.
- Tab label style owns text size, label weight, and content motion.
- Colors use swatch-only controls plus clear/replace state. Existing theme
  tokens, transparent values, and custom strings remain compatible and are
  labelled separately from fallback previews without showing editable CSS text
  to nontechnical authors.
- Structure owns rendered tab panel count through repeatable `panel` slots.
  Removing a panel prompts before deleting the slot and any nested blocks.
- Shared Structure actions expose stable metadata on `slots.panel`, including
  add actions, panel rows, and per-row Move up / Move down / Remove actions
  scoped to the rendered `panel:<id>` slot instance.

### Advanced
- behavior summary for opening tab, default tab, unavailable count, and line
  wrapping
- saved tabs summary using human labels and availability state
- saved display summary for direction, alignment, spacing, label style, motion,
  and color-readability status
- read-only contract summary

Advanced is read-only only. It must not render writable Visual controls, raw
JSON snapshots, technical IDs, CSS token text, or implementation suffixes.

## Runtime Behavior Notes

- Runtime resolves repeatable panel slots deterministically from `panel:<id>`.
- Selection state uses normalized item IDs and still falls back through legacy
  slot instance IDs when older saved defaults do not match the new selection
  surface.
- Admin/editor preview uses a React-local activation path and does not rely on
  parser-executed inline scripts. Public page renders now register the Tabs
  runtime payload once per page through the shared script collector.
- Public runtime emits deterministic markers:
  - `data-coderso-tabs`
  - `data-coderso-tabs-variant`
  - `data-coderso-tabs-active-id`
  - `data-coderso-tabs-panels`
  - `data-coderso-tabs-orientation`
  - `data-coderso-tabs-motion`
  - `data-coderso-tabs-overflow` (`wrap` after normalization)
- Disabled tabs are removed from activation order. If every item is disabled,
  normalization re-enables the first item so the widget always has one valid
  active panel.
- Saved `defaultItemId` values may still point at a disabled tab so the editor
  can show the author’s chosen default, while runtime `activeId` falls back to
  the first enabled tab until that default is changed.
- Motion variants (`fade`, `slide`) emit `motion-safe:*` classes only and fall
  back to no animation under reduced-motion preferences.
- Triggers render with `role="tab"`; the tablist uses the deterministic label
  `Content tabs`, and active panels render `tabIndex={0}` while inactive panels
  stay `hidden`.

## Clear Controls

- `style.surfaceColor`, `style.borderColor`, `style.activeBackgroundColor`,
  `style.activeTextColor`, `style.inactiveTextColor`, and
  `style.panelBackgroundColor` are clearable. Clear removes the field and keeps
  the runtime from forcing an inline style for that color.
- Imported/admin values for those six fields are color-only and normalize
  through the bounded CSS color resolver before public rendering. Safe hex,
  `rgb/rgba`, `hsl/hsla`, `transparent`, `currentColor`, and
  `var(--color-*)` values remain valid; unsafe strings such as `javascript:`,
  `expression(`, `data:`, raw URLs, semicolon injection, braces, or HTML-like
  fragments are dropped.
- When `style.activeBackgroundColor` is cleared but `style.borderColor` remains
  saved, the active trigger border falls back to the saved border color instead
  of disappearing with the active background.

## Layout Ownership Notes

- Tabs owns tab label typography, tab/content gap, and container padding.
- Saved legacy `options.triggerOverflow: "scroll"` is accepted by schema for
  backward compatibility, but normalization renders it as wrapping. Tabs are
  not an approved intentional horizontal-scroll region under the shared public
  overflow contract.
- Tabs does not introduce a duplicate local max-width field. Outer container
  width remains owned by the shared layout/container contract.

## Data Model (summary)

```json
{
  "items": [
    {
      "id": "1",
      "label": "Tab 1",
      "panelIntro": "Primary details.",
      "triggerDescription": "Optional trigger subtitle",
      "icon": "⭐",
      "disabled": false
    },
    {
      "id": "2",
      "label": "Tab 2",
      "panelIntro": "Secondary details.",
      "disabled": false
    }
  ],
  "options": {
    "defaultItemId": "1",
    "activeId": "1",
    "alignment": "start",
    "orientation": "horizontal",
    "triggerOverflow": "wrap",
    "containerPadding": "md",
    "triggerGap": "md",
    "panelGap": "md",
    "triggerTextSize": "sm",
    "triggerFontWeight": "medium",
    "motion": "none"
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

Legacy note:

- `items[].description` is still accepted for backward compatibility but now
  normalizes into `items[].panelIntro`.

## Validation Surface

- `tests/vitest/widgets/tabs.test.tsx`
- `tests/vitest/ui/tabs-editor-wave.test.tsx`
- `tests/vitest/ui/block-layout-shared-wave.test.tsx`
- `tests/vitest/ui-integration/tabs-preview-activation.test.tsx`
- `tests/unit/widgets/validator.test.ts`
