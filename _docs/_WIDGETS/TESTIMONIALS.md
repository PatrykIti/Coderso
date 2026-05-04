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

## Clear Controls

- `style.cardSurface` and `style.cardBorder` are clearable; clear removes card
  background/border fields and the renderer omits those inline style keys.
- `style.textColor` and `style.accentColor` remain normal authored colors.

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
    "cardSurface": "var(--color-bg)",
    "cardBorder": "var(--color-border)",
    "textColor": "var(--color-text)",
    "accentColor": "var(--color-primary)"
  }
}
```
