# Accordion Widget (v1)

## Purpose

Expandable stacked content panels with repeatable item slots and bounded open
state behavior.

## Widget ID

`accordion`

## Variants (v1)

- `soft`: roomy cards with gentle spacing
- `bordered`: structured accordion with stronger borders
- `compact`: dense accordion for tighter layouts

## Slots

- `item` (repeatable): slot instances are stored as `item:<id>` in block
  `slots` map (`item:1`, `item:2`, ...).

## Editor Modes

### Wizard
- variant selection
- item count and item labels
- initially open item

### Visual
Sections:
1. Variant
2. Structure
3. Behavior and style

Notes:
- Accordion owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Repeatable item slot count is builder-owned through the page-model slot
  contract.

### Advanced
- variant and behavior tuning
- normalized payload snapshot

## Runtime Behavior Notes

- Runtime resolves repeatable item slots deterministically from `item:<id>`.
- Canonical behavior fields are:
  - `options.openMode`
  - `options.defaultOpenIds`
  - `options.collapsible`
- Legacy `initiallyOpenId` and `allowMultiple` inputs are still normalized for
  backward compatibility.
- `defaultOpenIds` fall back to the first resolved item when saved data no
  longer matches a slot instance.
- `openMode=single` uses a shared details-group name so only one item stays
  open at a time; `openMode=multiple` allows multiple open items.
- Runtime emits deterministic markers:
  - `data-nextless-accordion`
  - `data-nextless-accordion-variant`
  - `data-nextless-accordion-count`
  - `data-nextless-accordion-item`

## Clear Controls

- `style.surfaceColor` is clearable. Clear removes the field and the runtime no
  longer forces a background color for item containers.

## Data Model (summary)

```json
{
  "items": [
    {
      "id": "1",
      "title": "Section 1",
      "description": "Open this panel to reveal the first content area."
    },
    {
      "id": "2",
      "title": "Section 2",
      "description": "Use additional sections for FAQs or grouped details."
    }
  ],
  "options": {
    "openMode": "single",
    "defaultOpenIds": ["1"],
    "collapsible": true,
    "initiallyOpenId": "1",
    "allowMultiple": false
  },
  "style": {
    "surfaceColor": "var(--color-surface)",
    "borderColor": "var(--color-border)",
    "summaryTextColor": "var(--color-text)"
  }
}
```
