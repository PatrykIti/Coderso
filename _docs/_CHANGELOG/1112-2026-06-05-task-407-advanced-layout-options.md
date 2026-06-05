# 1112 - TASK-407 Advanced layout option registries

Date: 2026-06-05
Version: unreleased
Tasks: TASK-407-04-L02

## Key Changes

### Assistant Site Builder
- Added backend-owned Advanced menu behavior, hero variant, and section variant
  registries.
- Derived review-only `advancedLayout` facts for Navigation, Hero, Listings,
  Forms, Engagement, and CTA widget capabilities.
- Added explicit gates for conflicting menu choices, missing selected section
  roles, and design-preset support gaps.

### Safety
- Rejected arbitrary CTA URLs and unknown Advanced option ids through existing
  intake validation.
- Preserved the strict planner request shape: Advanced layout facts do not add
  `context.siteBuilderIntake`, provider-authored actions, CSS, widget aliases,
  or executor payloads.

### QA
- Added `assistantSiteBuilderIntakeAdvancedOptions.test.ts`.
- Updated registry and compiler regression coverage for Advanced option
  registries and strict `context.siteKit` handoff.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedOptions.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeDesignPresets.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
