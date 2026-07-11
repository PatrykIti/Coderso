# Accordion Widget (v1)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

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
- read-only slot-owned panel count
- initial open state, including `None - start collapsed` when all-closed is
  allowed
- read-only starter title and summary text

Wizard is setup-only in the v2 editor contract. It does not own variant, item
count, item copy, layout, motion, typography, or colors. Repeatable panel count
is owned by the page-builder Structure controls.

After the one-time Wizard lifecycle, completed widgets show `Setup complete`
with an explicit `Run setup again` action. Wizard is not a permanent daily
editing tab.

### Visual
Sections:
1. Variant
2. Item content
3. Behavior and style

Notes:
- Accordion owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- The shared page-builder Structure section owns repeatable slot add/remove
  actions. Accordion-specific add/reorder UX is not shipped yet.
- Shared Structure controls expose stable metadata on `slots.item`, including
  add actions, item rows, and per-row Move up / Move down / Remove actions
  scoped to the rendered `item:<id>` slot instance.
- Item content owns title, description, and optional decorative icon edits.
- Behavior and style owns open mode, collapsible behavior, motion, max-width,
  padding, radius, title typography, and swatch-only color controls.
- The starter default-open item remains Wizard-owned. Visual open-mode changes
  preserve the Wizard-selected all-collapsed/default-open setup.
- Saved legacy custom colors remain runtime-compatible, but normal Visual
  authoring does not ask editors to type CSS variables or token strings.

### Advanced
- behavior summary for visitor opening rules, starting item, all-closed
  behavior, and motion
- saved item summary for title, summary text, and decorative icon state
- saved display summary for preset, width, spacing, title style, and color
  choices
- read-only contract summary

Advanced is read-only and beginner-safe. It must not render writable Visual
controls, raw JSON payloads, DOM id suffixes, CSS variables, or token text.

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
- Saved `defaultOpenIds` may target custom item IDs or legacy positional slot
  IDs. Normalization resolves legacy positional IDs such as `"2"` to the
  matching custom item while public DOM and slot markers remain based on
  `item:<id>`.
- `openMode=single` uses a shared details-group name so only one item stays
  open at a time; admin preview scopes this name per render instance so the
  canvas and setup/live preview do not close each other.
- React admin preview syncs `aria-expanded` from native `<details>` toggle
  events even when injected runtime scripts are not executed. Public runtime
  keeps the same attribute synchronized after binding.
- Item icons are plain text only and render as decorative summary adornments.
- Layout/styling fields fall back to the selected variant defaults when the
  widget does not persist an explicit token.
- Runtime emits deterministic markers:
  - `data-coderso-accordion`
  - `data-coderso-accordion-variant`
  - `data-coderso-accordion-count`
  - `data-coderso-accordion-item`
  - `data-coderso-accordion-motion`

## Color Controls

- Visual color controls are swatch-only and hide raw value inputs.
- Theme-default surface, border, and title text colors display as inherited
  theme defaults instead of saved custom values.
- Saved custom colors can be replaced with a swatch or cleared when the field
  has a real custom value.
- Imported/admin values for surface, border, summary text, and description text
  colors are sanitized before public inline style output. Safe hex,
  `rgb/rgba`, `hsl/hsla`, `transparent`, `currentColor`, `var(--color-*)`, and
  legacy hyphenated color tokens are preserved; unsafe strings such as
  `javascript:`, `expression(`, `data:`, raw URLs, semicolon injection, braces,
  or HTML-like fragments are dropped or resolved back to theme defaults.

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
