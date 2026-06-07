# 1100 - TASK-407 site-builder intake audit and siteKit context hardening

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-01

## Key Changes

### Task plan audit

- Closed the TASK-407 pre-implementation drift audit with Claude and agent
  review loops reporting no blocking findings.
- Reworked TASK-407 planning docs so Basic/Advanced intake extends the existing
  `siteKit`, solution-kit, and `AiSiteWizard` flow instead of introducing a
  parallel site-builder executor.
- Renamed the TASK-407 SiteKit and intake UI leaves to match the corrected
  implementation path and kept board rows/statistics synchronized.

### Admin client hardening

- Projected assistant site-kit plan context to the exact
  `AssistantSiteKitPlanInput` fields before posting `/assistant/actions/plan`.
- Kept execute-only fields such as `dryRun`, `continueOnError`, `settingsPatch`,
  `notes`, and `idempotencyKey` out of `context.siteKit` while preserving them
  for the reviewed execute request.

### QA

- Added an admin-client regression proving execute-only site-kit fields are not
  sent in the plan context.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/assistantClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
