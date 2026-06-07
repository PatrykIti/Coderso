# 1132 - TASK-407 Guided site-builder closure

Date: 2026-06-07
Version: unreleased
Tasks: TASK-407, TASK-407-01, TASK-407-02, TASK-407-02-L01, TASK-407-02-L02, TASK-407-02-L03, TASK-407-02-L04, TASK-407-03, TASK-407-03-L01, TASK-407-03-L02, TASK-407-03-L03, TASK-407-03-L04, TASK-407-04, TASK-407-04-L01, TASK-407-04-L02, TASK-407-04-L03, TASK-407-04-L04, TASK-407-05, TASK-407-05-L01, TASK-407-05-L02, TASK-407-05-L03, TASK-407-05-L04, TASK-407-05-L05, TASK-407-05-L06, TASK-407-06, TASK-407-06-L01, TASK-407-06-L02, TASK-407-06-L03, TASK-407-06-L04, TASK-407-06-L05, TASK-407-06-L06, TASK-407-07, TASK-407-07-L01, TASK-407-07-L02, TASK-407-07-L03, TASK-407-07-L04, TASK-407-07-L05, TASK-407-07-L06

## Key Changes

### Closure
- Closed the TASK-407 guided site-builder family after Basic, Advanced,
  follow-up/fail-closed, scoped cleanup, and second-theme live Playwright E2E
  evidence was recorded in the prior TASK-407-07 leaves.
- Synchronized TASK-407, TASK-407-07, TASK-407-07-L06, the task board
  statistics, assistant docs, developer docs, media spec, and LLM Guide
  acceptance matrix.
- Added the missing Advanced live-E2E evidence to the assistant site-builder
  source-of-truth docs and refreshed stale content-engine matrix wording.

### Drift Fixes
- Added `core/widgets/core/navigationContract.ts` as the single runtime owner
  for Navigation variant and mobile-mode ids.
- Updated the Navigation widget, Advanced intake option registry, intake types,
  and strict action-plan schema to import the shared Navigation contract instead
  of keeping duplicated literal sets.
- Updated the admin Navigation editor to derive its variant and mobile-mode
  options from the same shared Navigation contract, with label records keyed by
  contract ids.
- Added a direct Advanced runtime override regression that normalizes produced
  Navigation, Hero, testimonials, FAQ, and CTA blocks through the widget
  validator.
- Tightened curated media profile selection so an industry/vertical match is
  required before theme keywords can rank profiles.

### Audit Evidence
- Claude and subagent pre-audits found no parent/child closure blockers, but
  flagged the duplicated Navigation option literals and missing widget-validator
  regression as real drift.
- The actionable findings were fixed before closure. Final read-only drift pass
  evidence is recorded in the TASK-407-07-L06 closeout.

## Validation

- `set -a && source .env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedOptions.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/navigation-editor-wave.test.tsx`
  - Passed after the admin Navigation editor contract-owner cleanup: 4 files,
    202 tests.
- `git diff --check`
  - Passed.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
  - Passed.
- `bun run gates:coderso`
  - Passed: functional, ux, performance, security, and reliability.
- `bun run precommit`
  - Passed.
- Final Claude/subagent drift audit
  - Claude reported no blocking drift after the first closure pass and flagged a
    low-severity admin Navigation editor literal-set drift; that drift was
    fixed by deriving admin editor options from the shared Navigation contract.
  - Bernoulli subagent re-audit then reported no blocking implementation,
    task-graph, security, or test failure remained; it identified only this
    changelog evidence refresh before commit.
