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

### Advanced

- technical style tokens and normalized payload snapshot

## None Token Support

- `style.gap`: `none` renders zero card gap.
- `style.radius`: `none` removes forced card rounding.

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
    "surface": "var(--color-bg)",
    "border": "var(--color-border)"
  }
}
```
