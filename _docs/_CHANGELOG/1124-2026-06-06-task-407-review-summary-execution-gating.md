# 1124 - TASK-407 review summary execution gating

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-06-L04

## Key Changes

### Assistant Site Builder
- Added normalized review hashes for site-builder intake sessions. Review
  confirmation now has to echo the current server-normalized hash, and any
  earlier answer edit invalidates execution readiness.
- Added a shared final review summary covering pages, menu/footer, hero,
  homepage sections, subpages, content engines, beginner custom screens, media
  policy, SEO defaults, lead capture, and visible gates.
- Enforced blocking review-summary gates server-side before reviewed intake can
  compile into a strict `siteKit` action plan.

### Admin UI
- Rendered the final review summary in the floating assistant intake stepper.
- Kept review confirmation disabled when blocking gates or stale review hashes
  are present.
- Routed reviewed active intake sessions into the existing strict `siteKit`
  action-plan path so dry-run/execute controls appear only after the reviewed
  handoff.

### Task and Docs
- Documented the review-before-mutation contract in
  `_docs/ASSISTANT_SITE_BUILDER.md`.
- Split the legacy `AiSiteWizard` convergence drift into
  TASK-407-06-L06 instead of closing the parent with a hidden divergent surface.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntake*.test.ts tests/vitest/ui/assistant-site-builder-intake-*.test.ts tests/vitest/ui/assistant-site-builder-intake-*.test.tsx`
  (23 files, 128 tests)
- `bun test tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts`
  (1 test)
- `bun test tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`
  (1 DB-backed runtime test)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Claude and subagent read-only audit findings were verified locally; the
  server-side review-gate bypass finding was fixed before closure.
