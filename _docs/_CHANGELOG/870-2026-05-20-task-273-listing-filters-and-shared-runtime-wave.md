# 870. TASK-273 listing-filters and shared runtime wave

Date: 2026-05-20
Version: Unreleased
Tasks: TASK-273, TASK-273-01, TASK-273-02, TASK-273-03, TASK-273-04, TASK-273-05, TASK-273-06, TASK-273-07, TASK-273-08, TASK-315, TASK-316

## Key Changes

### Listing Filters widget closure
- Listing Filters now supports resilient picker/canvas flows, structured facet authoring, practical range/date controls, taxonomy hierarchy, searchable option mode, active filter chips with `Clear all`, truthful unloaded counts, and bounded `horizontal` / `sidebar` / `drawer` layout variants.
- Wizard, Visual, and Advanced now reflect the live authoring contract with diagnostics, preview guidance, layout controls, and native collapsible behavior instead of report-era placeholder gaps.

### Shared listing runtime and picker owners
- Shared listing-query pickers now use one `useListingQueries()` owner with bounded transient-auth retry and manual refresh behavior across Listing Filters and Search Box.
- Shared listing runtime refresh no longer falls back to immediate redirect on recoverable failures; it now uses scoped busy/error markers, stale-response protection, deterministic cross-block replacement, and explicit post-replacement rebind coverage for Listing Filters, Search Box, Content List, and Entry Teaser.

### Documentation and closure evidence
- The Playwright report, widget source-of-truth doc, task board, and closure evidence now match the live contract and explicitly separate TASK-256/TASK-262-03/TASK-315/TASK-316 ownership from widget-local work.

## Validation

- Historical closeout recorded the broad command surface for the TASK-273 wave.
- 2026-05-21 audit rerun:
  - `bun --cwd core lint` - passed
  - `bun --cwd core lint:types` - passed
  - `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/listingRuntimeScript.test.ts tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/listing-filters-query-parser.test.ts tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-compare-admin-preview.test.tsx` - passed (`14` files, `116` tests)
  - `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts tests/unit/commerce/commerceWidgetRuntime.test.ts` - passed (`43` tests)
  - `bun run gates:coderso` - passed
  - `bun run precommit` - passed repeatedly while staging the audit follow-up commits
