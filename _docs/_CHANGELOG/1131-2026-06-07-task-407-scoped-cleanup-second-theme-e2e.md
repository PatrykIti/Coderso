# 1131 - TASK-407 Scoped cleanup and second-theme live E2E

Date: 2026-06-07
Version: unreleased
Tasks: TASK-407-07-L05, TASK-407-07, TASK-407

## Key Changes

### Solution-Kit Starters
- Added industry-specific starter content to the `medical-clinic` and
  `beauty-salon` home pages so reviewed site-builder output no longer renders
  generic widget defaults such as Coderso SaaS copy, product-overview gallery
  labels, or generic pricing/testimonial fixtures.
- Added menu-backed Navigation and Footer blocks to medical and beauty starter
  home pages so generated public sites expose real `/`, `/doctors` or `/offers`,
  and `/contact` links without placeholder `#` navigation.
- Connected medical and beauty contact pages to their solution-kit forms through
  explicit `formId` values so public contact pages render the correct
  appointment/booking forms instead of a disconnected form boundary.
- Added license-documented curated media registry assets for the medical and
  beauty starter pages, plus salon treatment package copy, testimonials, offer
  intro copy, and readable hero image overlays. This is selected-kit starter
  content, not arbitrary prompt-bespoke media generation.

### Live E2E
- Restarted `coderso-dev-core-host` with admin
  `http://coderso-b.localhost:5175/admin/`, front
  `http://coderso-b.localhost:3001/`, and site assets
  `http://coderso-b.localhost:5176/site/`.
- Ran the L05 Playwright CLI harness from a fresh browser state. The first
  beginner Polish prompt selected `medical-clinic` and recorded source apply run
  `8de2bf41-7fef-4f17-bf29-bf68355663f1`.
- Cleaned that first run only through explicit `sourceRunId` rollback. Rollback
  run `cd6191d5-d2d1-4e28-b0c8-8a0df253493e` reported 7 successful operations,
  0 failures, 4 deletes, and 3 restores.
- Verified run-item scoped cleanup by id: created resources were removed,
  updated resources were restored, and an unrelated published `about` page
  stayed unchanged.
- Cleared assistant browser/session state, then ran a second beginner Polish
  prompt that selected `beauty-salon` with source apply run
  `b6588b3e-1451-4ff6-9095-db17a22d3a55`.
- Public runtime checks passed for `/`, `/offers`, and `/contact`, including
  SEO descriptions, menu/footer links, visible booking form, curated media
  registry URLs, no broken images, desktop/mobile screenshots, no prior-kit or
  generic widget-default copy bleed, no horizontal overflow, and 0 console/page
  errors.

### Docs and Tasks
- Closed TASK-407-07-L05 and synchronized TASK-407-07, TASK-407, task board
  statistics, assistant site-builder docs, developer assistant docs, acceptance
  matrix, live coverage matrix, and changelog numbering.
- Recorded the L03 cleanup-handoff clarification as part of the L05 closeout so
  the task family no longer implies L05 depends on stale L03 resource hints.
- Recorded Claude/subagent drift review evidence; the media-contract finding was
  resolved by moving starter images through `curatedMediaProfiles`.

## Validation

- `git diff --check`
  - Passed.
- `bun test tests/unit/kits/solutionKitsCatalog.test.ts`
  - Passed during implementation: 5 tests.
- `bun test tests/unit/kits/solutionKitsCatalog.test.ts tests/unit/kits/installService.test.ts`
  - Passed after final test fix: 9 tests.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
  - Passed after final test fix.
- `playwright-cli -s=task407-l05-cleanup-theme-r9 run-code --filename .tmp/task-407-07-l05-scoped-cleanup-second-theme-e2e.js`
  - Passed after restarting `coderso-dev-core-host`.
- `bun run gates:coderso`
  - Passed: functional, ux, performance, security, and reliability.
- `bun run precommit`
  - Passed.
