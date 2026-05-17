# Feature Grid Widget (v1)

## Purpose

Marketing grid for feature cards with optional highlighted first item.

## Widget ID

`feature-grid`

## Variants (v1)

- `cards-3`: three balanced feature cards
- `cards-4`: four-card grid for broader coverage
- `highlight-first`: first card emphasized, remaining cards secondary

## Editor Modes

### Wizard

- variant
- header text
- item count

### Visual

- layout columns and gap
- feature cards
- colors, radius, and borders
- inline invalid URL feedback for card images and CTA links

### Advanced

- read-only layout diagnostics, normalization actions, and raw payload snapshot

## None Token Support

- `style.gap`: `none` renders zero card gap.
- `style.radius`: `none` removes forced card rounding.

## Clear Controls

- `style.surfaceColor` is clearable; clear removes the card background field and
  the renderer omits forced card background output.
- `style.borderColor` is also clearable; clear removes the forced border color
  field and lets runtime fall back to the shared border token.

## Shared Safety Baseline

- invalid `items[].image` values stay visible in the editor for correction, but
  runtime output skips unsafe image URLs instead of rendering broken media
  elements
- invalid `items[].ctaHref` values stay visible in the editor with inline
  feedback while public output continues to reject unsafe links
- decorative emoji output is marked `aria-hidden="true"`

## Data Model (summary)

```json
{
  "header": {
    "title": "Features",
    "description": "Key product capabilities."
  },
  "items": [],
  "style": {
    "columns": "3",
    "gap": "md",
    "radius": "lg",
    "borderWidth": "1",
    "surfaceColor": "var(--color-bg)",
    "borderColor": "var(--color-border)"
  }
}
```
