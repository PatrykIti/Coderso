# Accordion Widget (v1)

## Purpose

Expandable stacked content panels with repeatable item slots, bounded open
state behavior, and Accordion-local layout/styling controls.

## Widget ID

`accordion`

## Variants (v1)

- `soft`: roomy cards with gentle spacing
- `bordered`: structured accordion with stronger borders
- `compact`: dense accordion for tighter layouts

## Slots

- `item` (repeatable): slot instances are stored as `item:<id>` in the block
  `slots` map (`item:1`, `item:2`, ...).

## Editor Modes

### Wizard
- starter item count
- initial open state, including `None - start collapsed` when all-closed is
  allowed
- read-only starter title and summary text

Wizard is setup-only in the v2 editor contract. It does not own variant, item
copy, layout, motion, typography, or colors.

Interim before `TASK-336-16`: Wizard still appears as a normal editor tab in
the existing builder shell. The one-time Wizard lifecycle and `Run setup again`
affordance are not part of `TASK-336-08`.

### Visual
Sections:
1. Variant
2. Item content
3. Behavior and style

Notes:
- Accordion owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- The shared page-builder Structure section owns repeatable slot add/remove
  actions. Accordion-specific add/reorder UX is not shipped yet.
- Item content owns title, description, and optional decorative icon edits.
- Behavior and style owns open mode, collapsible behavior, motion, max-width,
  padding, radius, title typography, and color-picker controls.
- The starter default-open item remains Wizard-owned in this interim ownership
  split.

### Advanced
- runtime diagnostics for open mode, default open ids, collapsible behavior, and
  motion
- technical item/summary/content id suffixes
- normalized payload snapshot
- read-only contract summary

Advanced is technical/read-only only. It must not render writable Visual
controls for variant, item content, behavior, layout, typography, or colors.

## Runtime Behavior Notes

- Runtime resolves repeatable item slots deterministically from `item:<id>`.
- Canonical behavior fields are:
  - `options.openMode`
  - `options.defaultOpenIds`
  - `options.collapsible`
  - `options.motion`
- `defaultOpenIds: []` is preserved as an intentional all-collapsed initial
  state only when `collapsible !== false`.
- Legacy `initiallyOpenId` and `allowMultiple` inputs are still normalized for
  backward compatibility.
- Stale saved `defaultOpenIds` fall back to the first resolved item instead of
  becoming an accidental all-collapsed state.
- `openMode=single` uses a shared details-group name so only one item stays
  open at a time; `openMode=multiple` allows multiple open items.
- Item icons are plain text only and render as decorative summary adornments.
- Layout/styling fields fall back to the selected variant defaults when the
  widget does not persist an explicit token.
- Runtime emits deterministic markers:
  - `data-coderso-accordion`
  - `data-coderso-accordion-variant`
  - `data-coderso-accordion-count`
  - `data-coderso-accordion-item`
  - `data-coderso-accordion-motion`

## Clear Controls

- `style.surfaceColor`, `style.borderColor`, `style.summaryTextColor`, and
  `style.descriptionTextColor` are clearable in the current editor.
- Clearing `surfaceColor` removes the background override from item containers.
- Clearing the other color fields falls back to the Accordion defaults or the
  selected variant fallback.

## Data Model (summary)

```json
{
  "items": [
    {
      "id": "1",
      "title": "Section 1",
      "description": "Open this panel to reveal the first content area.",
      "icon": "✨"
    },
    {
      "id": "2",
      "title": "Section 2",
      "description": "Use additional sections for FAQs or grouped details."
    }
  ],
  "options": {
    "openMode": "single",
    "defaultOpenIds": [],
    "collapsible": true,
    "motion": "subtle",
    "allowMultiple": false
  },
  "style": {
    "surfaceColor": "var(--color-surface)",
    "borderColor": "var(--color-border)",
    "summaryTextColor": "var(--color-text)",
    "descriptionTextColor": "var(--color-muted)",
    "summaryPadding": "md",
    "contentPadding": "lg",
    "radius": "xl",
    "summaryFontSize": "lg",
    "summaryFontWeight": "bold"
  },
  "layout": {
    "maxWidth": "md"
  }
}
```
