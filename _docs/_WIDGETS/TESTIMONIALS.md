# Testimonials Widget (v1)

## Purpose

Customer proof section with quote cards, spotlight, or static slider layout.

## Widget ID

`testimonials`

## Variants (v1)

- `grid`: multiple quote cards
- `spotlight`: primary quote plus supporting quote
- `slider-static`: horizontal slider-ready strip

## Editor Modes

### Wizard

- variant
- header text
- testimonial count

### Visual

- quote content
- rating and attribution
- spacing and colors

### Advanced

- technical style tokens and normalized payload snapshot

## None Token Support

- `style.spacing`: `none` renders zero testimonial card spacing.

## Data Model (summary)

```json
{
  "header": {
    "title": "What customers say",
    "description": "Proof points from real users."
  },
  "items": [],
  "style": {
    "spacing": "md",
    "surface": "var(--color-bg)",
    "text": "var(--color-text)"
  }
}
```
