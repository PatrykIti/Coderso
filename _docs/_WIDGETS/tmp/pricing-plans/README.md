# Pricing Plans Research Cards

Summary-only archive for TASK-252. Do not copy third-party code from these sources.

## Card 1 - HyperUI pricing
- URL: https://www.hyperui.dev/components/marketing/pricing
- Access type: open-source
- License/terms summary: HyperUI is generally MIT-style; verify before reuse.
- Observed UX pattern: tier cards with price, period, features, and CTA.
- Useful Coderso fields/options: `plans[].price`, `plans[].period`, `plans[].features`, `plans[].cta`, `highlightedPlan`.
- Decision: Keep
- Copy policy: Summarize only.

## Card 2 - Preline pricing
- URL: https://preline.co/examples/pricing.html
- Access type: docs-example
- License/terms summary: Verify Preline license/commercial terms before reuse.
- Observed UX pattern: monthly/yearly toggle with tier comparison.
- Useful Coderso fields/options: `billingToggle`, `monthlyLabel`, `annualLabel`, `discountBadge`.
- Decision: Keep
- Copy policy: Pattern only.

## Card 3 - Flowbite pricing blocks
- URL: https://flowbite.com/blocks/marketing/pricing/
- Access type: docs-example
- License/terms summary: Flowbite free/pro terms vary; reference-only until confirmed.
- Observed UX pattern: pricing cards with included feature lists and CTA styles.
- Useful Coderso fields/options: `featureList`, `ctaStyle`, `cardTone`, existing plan-count `variant`.
- Decision: Keep
- Copy policy: No source copy.

## Card 4 - Tailwind UI Plus pricing sections
- URL: https://tailwindcss.com/plus/ui-blocks/marketing/sections/pricing
- Access type: premium-reference
- License/terms summary: Paid/proprietary; reference-only.
- Observed UX pattern: comparison tables, tier cards, and highlighted enterprise offers.
- Useful Coderso fields/options: `mode: cards|comparison`, `featured`, `customPriceLabel`.
- Decision: Adapt
- Copy policy: Reference-only.

## Card 5 - shadcn.io pricing blocks
- URL: https://www.shadcn.io/blocks
- Access type: docs-example
- License/terms summary: Verify block terms before reuse.
- Observed UX pattern: clean SaaS pricing cards with badges and CTA hierarchy.
- Useful Coderso fields/options: `badge`, `ctaVariant`, `popular`, `planTone`.
- Decision: Keep
- Copy policy: Summary only.

## Card 6 - Origin UI pricing
- URL: https://originui.com/
- Access type: docs-example
- License/terms summary: Verify site terms before reuse.
- Observed UX pattern: compact pricing cards with feature checkmarks and plan labels.
- Useful Coderso fields/options: `checkIcon`, `planLabel`, `style.spacing`.
- Decision: Keep
- Copy policy: Summarize only.

## Card 7 - ReUI pricing examples
- URL: https://reui.io/
- Access type: docs-example
- License/terms summary: Verify ReUI terms before reuse.
- Observed UX pattern: SaaS tiers with plan badges, limits, and CTA variants.
- Useful Coderso fields/options: `limits`, `badge`, `ctaStyle`, `highlight`.
- Decision: Adapt
- Copy policy: Pattern only.

## Card 8 - Uilib pricing references
- URL: https://www.uilib.co/
- Access type: unknown-license
- License/terms summary: License not confirmed; reference only.
- Observed UX pattern: pricing cards and comparison matrices.
- Useful Coderso fields/options: `comparisonRows`, `tierCount`, `featureGroups`.
- Decision: Adapt
- Copy policy: No copying until terms are verified.

## Card 9 - Flowbite React table reference
- URL: https://flowbite-react.com/docs/components/table
- Access type: docs-example
- License/terms summary: Flowbite React is open-source; examples should still be treated as reference.
- Observed UX pattern: accessible table structure for comparison mode.
- Useful Coderso fields/options: `comparisonMode`, `rows`, explicit comparison fields, `mobileCollapse`.
- Decision: Adapt
- Copy policy: Use concept only.

## Card 10 - MUI toggle button reference
- URL: https://mui.com/material-ui/react-toggle-button/
- Access type: docs-example
- License/terms summary: MUI is open-source; no dependency should be introduced for this widget.
- Observed UX pattern: segmented control for billing cycle selection.
- Useful Coderso fields/options: `billingCycle`, `toggleLabels`, `defaultCycle`.
- Decision: Adapt
- Copy policy: Summarize interaction only.
