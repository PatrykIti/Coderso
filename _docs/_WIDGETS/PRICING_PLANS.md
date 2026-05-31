# Pricing Plans Widget (v1)

## Purpose

Pricing table for plans, tiers, and comparison-style rows.

## Widget ID

`pricing-plans`

## Variants (v1)

- `two-plans`: compact two-tier pricing
- `three-plans`: balanced three-tier pricing
- `four-plans`: broader four-tier layout
- `comparison-rows`: row-based comparison view

## Editor Modes

### Wizard

- read-only current layout summary
- fixed-count layout guidance that separates layout capacity from currently
  rendered saved plans
- read-only visible-plan preview that points daily copy, pricing, features,
  badges, and CTAs to Visual

### Visual

- plan cards and features
- sectioned Visual IA:
  - `Variant and plan structure`
  - `Header copy`
  - `Billing toggle`
  - `Plans, features, and actions`
  - `Comparison rows behavior` (comparison variant only)
  - `Layout and notes`
  - `Colors and emphasis`
- billing toggle labels and default cycle; public rendering is a static billing
  cycle status, not an interactive toggle
- highlighted plan
- plan-level card hierarchy, CTA style, CTA destination, and product copy
- comparison-table hierarchy, layout, notes, and width controls
- spacing, radius, colors, and feature marker style
- color fields use swatches plus clear/legacy-token summaries instead of raw
  token textboxes in the beginner UI
- color fields use the shared widget color-state labels, so theme tokens,
  selected swatches, custom values, and cleared/inherited states are not
  conflated

### Advanced

- shared diagnostics and fix/reset actions only; active spacing/radius editing
  stays in Visual mode
- sectioned Advanced IA:
  - `Visual-owned tokens`
  - `Fix and reset`
  - `Runtime summary`

## None Token Support

- `style.spacing`: `none` renders zero spacing between plan cards/rows.
- `style.radius`: `none` removes forced plan-card rounding.

## Clear Controls

- `style.cardSurface` and `style.cardBorder` are clearable. Clear removes the
  configured card/table surface or border fields and renderers omit those inline
  style keys.
- `style.highlightRing` is also clearable and restores the documented widget
  default highlight color.

## Shared Fixed-Count Baseline

- Fixed-count variants preserve hidden authored plans instead of truncating
  them on variant changes.
- Wizard and Visual show truthful layout-count guidance: the variant capacity is
  reported separately from the number of saved plans that actually render.
- Advanced alignment is now the only destructive count-reset path and confirms
  before trimming preserved hidden plans.

## Billing And Price Semantics

- Billing-cycle rendering is intentionally truthful-static. Runtime announces
  the active authored cycle in a non-interactive status label instead of
  pretending the toggle is interactive.
- `plans[].priceDisplay.mode` supports:
  - `legacy`: keep existing `price` and `prices.monthly/annual` strings
  - `structured`: bounded numeric amount + currency + optional annual amount
  - `free`: explicit free-plan label without awkward `$0` fallback
  - `custom`: explicit custom-contact label
- Structured price amounts are normalized as non-negative values and annual
  cycle rendering updates common monthly period copy such as `/month` to
  `/year`.

## Plan-Level Product Fields

- `plans[].description`: optional card subline under the plan name
- `plans[].surface`: optional clearable per-plan card surface
- `plans[].badgeTone`: `neutral | accent | highlight`
- `plans[].ctaStyle`: `outline | filled | ghost`
- `plans[].ctaHref`: persisted safe destination string selected through
  `LinkDestinationField` in Wizard and Visual. Published pages are selectable;
  saved custom/hash/external values from older edits stay visible as
  replace-or-clear compatibility state.
- `plans[].highlightLabel`: optional top-banner label for highlighted plans
- `plans[].features[]`: legacy strings remain valid; typed feature items may
  also carry bounded `status` and `icon` presets
- Highlighted plans still render their badge when the badge text matches the
  highlight banner label, so saved badge tone remains visible and testable.

## Destructive Authoring Guardrails

- Visual plan removal and feature removal both use the shared
  `ConfirmActionDialog` pattern.
- Advanced repair actions keep the same confirmation pattern before aligning
  plan count or normalizing the payload.

## Comparison And Layout Fields

- `comparison.stickyHeader`: keeps comparison headers visible during long table
  scrolls
- `comparison.showHeaderBadges` / `comparison.showHeaderCta`: repeat product
  hierarchy directly in the comparison header
- `layout.maxWidth`: `narrow | default | wide`
- `layout.typography`: `compact | balanced | prominent`
- `layout.footerNote`: plain-text pricing caveat or contact note rendered below
  the cards/table

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
  "comparison": {
    "stickyHeader": false,
    "showHeaderBadges": true,
    "showHeaderCta": true
  },
  "layout": {
    "maxWidth": "default",
    "typography": "balanced",
    "footerNote": "All prices exclude VAT."
  },
  "plans": [
    {
      "id": "plan-1",
      "name": "Starter",
      "description": "For small teams getting started",
      "price": "$19",
      "period": "/month",
      "badgeTone": "neutral",
      "ctaStyle": "outline",
      "prices": {
        "monthly": "$19",
        "annual": "$190"
      },
      "priceDisplay": {
        "mode": "structured",
        "amount": 19,
        "annualAmount": 190,
        "currency": "USD",
        "annualSavingsLabel": "2 months free"
      },
      "features": [
        { "text": "Email support", "status": "included", "icon": "check" }
      ],
      "ctaLabel": "Start now",
      "ctaHref": "/checkout",
      "highlighted": false
    }
  ],
  "style": {
    "spacing": "md",
    "radius": "lg",
    "cardSurface": "var(--color-bg)",
    "cardBorder": "var(--color-border)",
    "highlightRing": "var(--color-primary)",
    "featureMarker": "bullet"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `pricingPlansEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only starter summary; Visual owns plan
  details, billing, comparison rows, layout, and style; Advanced is read-only
  runtime diagnostics.
- TASK-336-19 replaced normal Wizard/Visual `CTA URL` text inputs with
  page-first destination pickers, removed fake `href: "#"` defaults, hid raw
  color token textboxes behind swatch/clear controls, and corrected Wizard
  ownership so it no longer claims `header.description`.
- TASK-336-19 also moved Advanced align/cleanup into review-first confirmed
  support actions and replaced raw payload snapshots with human runtime
  summaries.
