# Pricing Plans Widget (v1)

## Purpose

Pricing table for plans, tiers, and comparison-style rows.

## Widget ID

`pricing-plans`

## Variants (v1)

- `three-plans`: balanced three-tier pricing
- `four-plans`: broader four-tier layout
- `comparison-rows`: row-based comparison view

## Editor Modes

### Wizard

- variant
- header text
- plan count

### Visual

- plan cards and features
- highlighted plan
- spacing, radius, and colors

### Advanced

- technical style tokens and normalized payload snapshot

## None Token Support

- `style.spacing`: `none` renders zero spacing between plan cards/rows.
- `style.radius`: `none` removes forced plan-card rounding.

## Data Model (summary)

```json
{
  "header": {
    "title": "Plans",
    "description": "Choose a package."
  },
  "plans": [],
  "style": {
    "spacing": "md",
    "radius": "lg",
    "surface": "var(--color-bg)",
    "border": "var(--color-border)"
  }
}
```
