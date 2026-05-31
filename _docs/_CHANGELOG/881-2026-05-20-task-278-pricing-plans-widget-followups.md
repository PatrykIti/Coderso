# 881. TASK-278 pricing plans widget follow-ups

**Date:** 2026-05-20
**Version:** Unreleased
**Tasks:** TASK-278, TASK-278-01, TASK-278-02, TASK-278-03, TASK-278-04, TASK-278-05, TASK-278-06, TASK-278-07, TASK-278-08

## Key Changes

### Pricing plan hierarchy and authoring

- Added plan-level descriptions, surfaces, badge tones, CTA styles, and
  highlighted top-banner labels for Pricing Plans cards.
- Expanded Wizard authoring so a publishable plan can be configured with badge,
  billing period, CTA, and feature essentials without switching modes.
- Tightened destructive editor actions with remove confirmation, highlighted
  affordances, feature autofocus, clearer Advanced cleanup copy, and explicit
  confirmation before trimming preserved hidden plans.

### Billing, comparison, and layout behavior

- Added structured/free/custom pricing modes, annual savings copy, non-negative
  structured amount normalization, and truthful static billing status labels.
- Added bounded feature status/icon metadata, comparison-header CTA/badge
  hierarchy, sticky comparison headers, width presets, typography presets, and
  plain-text footer notes.
- Added a dedicated `two-plans` runtime/editor variant and synchronized the
  widget definition, validator, and registry coverage around it.

### Documentation and evidence

- Synchronized the Pricing Plans Playwright report, widget docs, task board, and
  closure notes with the final TASK-278 owner split after the shared
  TASK-256-02 / TASK-256-06-03 pricing baseline was re-verified.

## Validation

- Historical scoped-closeout evidence remains in `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`.
- 2026-05-21 audit rerun:
  - `bun --cwd core lint` - passed
  - `bun --cwd core lint:types` - passed
  - `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/listingRuntimeScript.test.ts tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/listing-filters-query-parser.test.ts tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-compare-admin-preview.test.tsx` - passed (`14` files, `116` tests)
  - `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts tests/unit/commerce/commerceWidgetRuntime.test.ts` - passed (`43` tests)
  - `bun run gates:coderso` - passed
  - `bun run precommit` - passed repeatedly while staging the audit follow-up commits
