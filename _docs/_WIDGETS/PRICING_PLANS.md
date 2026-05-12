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
- billing toggle labels and default cycle
- highlighted plan
- spacing, radius, colors, and feature marker style

### Advanced

- technical style tokens and normalized payload snapshot

## None Token Support

- `style.spacing`: `none` renders zero spacing between plan cards/rows.
- `style.radius`: `none` removes forced plan-card rounding.

## Clear Controls

- `style.cardSurface` and `style.cardBorder` are clearable. Clear removes the
  configured card/table surface or border fields and renderers omit those inline
  style keys.
- Highlight ring and plan badge semantics remain independent visual fields.

## Data Model (summary)

```json
{
  "header": {
    "title": "Plans",
    "description": "Choose a package."
  },
  "billingToggle": {
    "enabled": false,
    "monthlyLabel": "Monthly",
    "annualLabel": "Annual",
    "defaultCycle": "monthly"
  },
  "plans": [
    {
      "id": "plan-1",
      "name": "Starter",
      "price": "$19",
      "period": "/month",
      "prices": {
        "monthly": "$19",
        "annual": "$190"
      },
      "ctaLabel": "Start now",
      "ctaHref": "#",
      "highlighted": false
    }
  ],
  "style": {
    "spacing": "md",
    "radius": "lg",
    "cardSurface": "var(--color-bg)",
    "cardBorder": "var(--color-border)",
    "featureMarker": "bullet"
  }
}
```
