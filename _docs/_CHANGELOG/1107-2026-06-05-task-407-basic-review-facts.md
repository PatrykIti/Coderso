# 1107 - TASK-407 Basic review facts

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-03, TASK-407-03-L03

## Key Changes

### Assistant Intake Review

- Added Basic review facts that expose deterministic page routes, menu items,
  supported homepage widget candidates, content-engine candidates, contact path,
  media policy, gates, and a redacted review summary.
- Resolved widget support through the backend-owned `modulePackMatrix`
  `assistantPageSections` catalog instead of free-form provider/widget aliases.
- Kept `featured-items` generic: it can become a `content-list` widget
  candidate, but it does not imply a portfolio content engine unless the
  selected page roles do.
- Kept review facts non-executable: this leaf does not compile `siteKit`, create
  action ids, call the provider, or persist CMS resources.

### Safety

- Unsupported Basic section roles now become explicit
  `widget_alias_unsupported` review gates.
- Media-library mode now adds a `media_library_selection_required` gate so later
  execution can require confirmed existing assets.
- Incomplete Basic facts fail closed before review output; review facts require
  Basic review readiness, required non-review steps, Basic defaults, hero, and
  media policy.
- Unknown page roles, section roles, media policies, and content-engine ids fail
  closed through shared intake registry helpers, and summary/page/menu labels are
  redacted before review output.

### QA

- Added Vitest coverage for supported widget mapping, content-engine inference,
  unsupported-section gates, media-library gates, redaction, and fail-closed
  unknown ids.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicDefaults.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicReview.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
