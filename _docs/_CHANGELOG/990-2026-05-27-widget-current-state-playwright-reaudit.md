# 990 - Widget current-state Playwright re-audit

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-341

## Key Changes

- Added a new current-state widget QA wave under
  `_docs/PLAYWRIGHT/27-05-2026/` with one report per page-builder widget plus
  a summary `README.md`.
- Re-ran the full `playwright-widget-contract-smoke` surface against the local
  post-TASK-339 build and recorded a clean result across all `38` page-builder
  widgets:
  - `adminFailures: 0`
  - `publicFailures: 0`
  - `fixtureGaps: 3`
  - `metadataGaps: 4`
- Focused replay clarified the outliers:
  - `pricing-plans`, `faq-accordion`, `cta-banner`, and `contact` still have
    Visual automation metadata gaps (`data-widget-control-path` coverage),
    while authoring loaded correctly in the replay.
  - `product-gallery`, `product-compare`, and `product-table` render stable
    empty states on the public fixtures, so the remaining gap is fixture data,
    not a frontend crash.

## Validation

- `CODERSO_PLAYWRIGHT_EMAIL="<admin email>" CODERSO_PLAYWRIGHT_PASSWORD="<admin password>" bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-smoke-2026-05-27-clean --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/widget-contract-smoke-2026-05-27-clean.json --output-md .tmp/widget-contract-smoke-2026-05-27-clean.md`
- Focused `playwright-cli` replay for:
  - `pricing-plans`
  - `faq-accordion`
  - `cta-banner`
  - `contact`
  - `product-gallery`
  - `product-compare`
  - `product-table`
