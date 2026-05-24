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

- `panel` (repeatable): slot instances are stored as `panel:<id>` in the block
  `slots` map (`panel:1`, `panel:2`, ...).

## Editor Modes

### Wizard
- starter tab count
- default tab selection with badge state
- read-only starter label and `panelIntro` summary
- repeatable panel-slot guidance

Wizard is setup-only in the v2 editor contract. It does not own variant,
layout, trigger style, color, or daily tab copy edits.

Interim before `TASK-336-16`: Wizard still appears as a normal editor tab in
the existing builder shell. The one-time Wizard lifecycle and `Run setup again`
affordance are not part of `TASK-336-07`.

### Visual
Sections:
1. Variant
2. Tab content
3. Layout
4. Trigger style
5. Colors

Notes:
- Tabs owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Tab content exposes `label`, `panelIntro`, `triggerDescription`, `icon`, and
  `disabled`.
- Layout owns orientation, alignment, trigger overflow, container padding,
  trigger gap, and panel gap.
- Trigger style owns trigger text size, trigger font weight, and motion.
- Colors reuse the shared clearable-surface policy for `surfaceColor`,
  `activeBackgroundColor`, and `panelBackgroundColor`, plus a bounded contrast
  advisory for active/inactive trigger text.

### Advanced
- runtime diagnostics for resolved active/default tab state and disabled count
- technical IDs for tab, trigger, and panel wiring
- normalized payload snapshot for diagnostics
- read-only contract summary

Advanced is technical/read-only only. It must not render writable Visual
controls for variant, tab content, layout, trigger style, or colors.

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
  - `data-coderso-tabs-overflow`
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

- `style.surfaceColor`, `style.activeBackgroundColor`, and
  `style.panelBackgroundColor` are clearable. Clear removes the field and keeps
  the runtime from forcing an inline style for that surface.

## Layout Ownership Notes

- Tabs now owns bounded trigger overflow, trigger typography, trigger/panel gap,
  and container padding.
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
- `tests/vitest/ui-integration/tabs-preview-activation.test.tsx`
- `tests/unit/widgets/validator.test.ts`
