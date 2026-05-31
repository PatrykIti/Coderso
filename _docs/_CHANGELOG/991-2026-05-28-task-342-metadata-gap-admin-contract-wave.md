# 991 - TASK-342 metadata-gap admin contract wave

Date: 2026-05-28
Version: Unreleased
Tasks: TASK-342-02, TASK-342-02-01, TASK-342-02-02, TASK-342-02-03, TASK-342-02-04

## Key Changes

- Restored strict `data-widget-control-path` ownership coverage for the four
  admin metadata outliers from the 2026-05-27 Playwright wave:
  - `pricing-plans`
  - `faq-accordion`
  - `cta-banner`
  - `contact`
- The fixes stayed local to the widget editors and did not require a shared
  `SharedColorControl` or `WidgetControlRow` contract rewrite.
- Added regression assertions in the widget editor render smoke tests so the
  flagged controls now keep persisted-path metadata visible to the strict smoke
  lane.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-342-02-pricing-plans --widget pricing-plans --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-02-pricing-plans.json --output-md .tmp/task-342-02-pricing-plans.md --strict`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-342-02-faq-accordion --widget faq-accordion --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-02-faq-accordion.json --output-md .tmp/task-342-02-faq-accordion.md --strict`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-342-02-cta-banner --widget cta-banner --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-02-cta-banner.json --output-md .tmp/task-342-02-cta-banner.md --strict`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-342-02-contact --widget contact --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-02-contact.json --output-md .tmp/task-342-02-contact.md --strict`
