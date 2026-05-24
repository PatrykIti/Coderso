# 944. Remaining widget editor contracts

- **Date:** 2026-05-24
- **Version:** Unreleased
- **Tasks:** TASK-336-18

## Key Changes

### Editor Contract
- Added strict v2 editor contracts for the 18 remaining page-builder widgets:
  Toggle Block, Feature Grid, Testimonials, Pricing Plans, FAQ Accordion,
  CTA Banner, Logo Cloud, Gallery Mosaic, Rich Text Section, Entry Teaser,
  Product Gallery, Product Compare, Timeline, Compare Timeline, Newsletter,
  Contact, Navigation, and Footer.
- Extended the strict editor-contract Vitest coverage so each remaining widget
  now validates Wizard/Visual/Advanced sections, duplicate allowances, and
  read-only Advanced diagnostics.

### UX Drift Routing
- Created `TASK-336-19` for the actual UI cleanup discovered during the sweep:
  writable Advanced controls, raw CSS/JSON/HTML/ID/technical URL fields, and
  admin fixture/metadata drift.
- Updated the shared widget spec and per-widget docs to document the contract
  target and the follow-up cleanup owner.

### QA Evidence
- Captured TASK-336-18 Playwright evidence:
  full frontend smoke stayed green, while authenticated admin smoke recorded
  the remaining UI/fixture/metadata baseline for `TASK-336-19`.
