# Spacer Widget (v1)

## Purpose

Lightweight layout primitive for explicit vertical rhythm control without
placeholder content blocks.

## Widget ID

`spacer`

## Variants (v1)

- `responsive`: independent desktop/tablet/mobile heights
- `fixed`: desktop height reused for all breakpoints

## Slots

None.

## Editor Modes (current after TASK-050-15-06)

### Wizard
- spacer mode (fixed/responsive)
- desktop height
- editor guide toggle

### Visual
Sections:
1. Variant and responsive behavior
2. Responsive heights
3. Editor guide

Notes:
- Spacer owns variant selection in Visual (`visualOwnsVariantSelection = true`).

### Advanced
- direct token/px height editing
- normalized payload snapshot

## Runtime Behavior Notes

- Renders an empty structural block with responsive height values.
- Supports token-based heights (`0..32`) and custom pixel values (for example `48px`).
- Shows optional guide label only in preview contexts.
- Exposes deterministic runtime markers:
  - `data-spacer`
  - `data-spacer-variant`
  - `data-spacer-desktop`
  - `data-spacer-tablet`
  - `data-spacer-mobile`
  - `data-spacer-show-guide`
  - `data-spacer-preview-height`

## Data Model (summary)

```json
{
  "height": {
    "desktop": "16",
    "tablet": "12",
    "mobile": "8"
  },
  "showGuideInEditor": true
}
```
