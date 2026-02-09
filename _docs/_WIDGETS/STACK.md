# Stack Widget (v1)

## Purpose

Flow layout primitive for arranging heterogeneous widgets in a predictable
vertical/horizontal stack with responsive direction and spacing.

## Widget ID

`stack`

## Variants (v1)

- `vertical`: column flow on all breakpoints
- `horizontal`: row flow on all breakpoints
- `responsive`: column on mobile, row on tablet/desktop

## Slots

- `content` (fixed): single content slot for nested widgets

## Editor Modes (current after TASK-050-15-04)

### Wizard
- stack variant
- mobile direction
- base gap

### Visual
Sections:
1. Variant and flow
2. Responsive direction
3. Spacing and distribution
4. Wrapping and slot behavior

Notes:
- Stack owns variant selection in Visual (`visualOwnsVariantSelection = true`).

### Advanced
- token-level control for direction/gap/align/justify/wrap
- normalized payload snapshot

## Runtime Behavior Notes

- Renders as responsive flex container using per-breakpoint direction and gap tokens.
- Applies alignment (`align`), distribution (`justify`), and wrap mode (`wrap`).
- Exposes deterministic runtime markers:
  - `data-stack-variant`
  - `data-stack-direction-desktop|tablet|mobile`
  - `data-stack-gap-desktop|tablet|mobile`
  - `data-stack-align`
  - `data-stack-justify`
  - `data-stack-wrap`
  - `data-stack-items`

## Data Model (summary)

```json
{
  "direction": {
    "desktop": "column",
    "tablet": "column",
    "mobile": "column"
  },
  "gap": {
    "desktop": "6",
    "tablet": "6",
    "mobile": "4"
  },
  "align": "stretch",
  "justify": "start",
  "wrap": false
}
```
