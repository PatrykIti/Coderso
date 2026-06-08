# 1136 - TASK-414 Generic Content-Type Field Refinement

**Date:** 2026-06-07
**Version:** Unreleased
**Tasks:** TASK-414, TASK-414-01

## Key Changes

### Assistant
- Added the executable `content-type.field.add` action for generic, additive field refinement on existing content types.
- Added deterministic field-list inference for supported scalar/select/media fields, with nested object arrays and unsupported generic arrays gated instead of silently inventing schema.
- Added generic markdown-brief catalog setup for nontechnical prompts that paste a field list, deriving an industry-neutral catalog preset instead of falling back to a fixed product vertical.
- Expanded docs-question classification for beginner wording such as "do czego jest Engine?" so documentation prompts remain non-mutating.
- Kept full content-type schemas server-side for dry-run/execute merge while stripping schemas from provider-facing resource context.
- Replaced fixed 2,000-character prompt validation with model-capacity-aware planning budgets, provider package overhead reservation, explicit 413 mapping, and a high route-level transport cap.

### Admin UI
- Constrained the floating assistant composer and long message bubbles with vertical scrolling/resizing so long pasted prompts do not break the chat window.
- Added cache invalidation coverage for assistant-driven content-type field updates.

### Validation
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts`
  - Passed: 123 tests.
- `bunx vitest run tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - Passed: 2 files, 20 tests.
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-rate-limit.test.ts`
  - Passed: 3 tests, including `assistant_prompt_too_large` HTTP 413 route mapping.
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - Passed: 8 files, 239 tests.
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts`
  - Passed: 3 files, 136 tests.
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/content-type-field-add.test.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - Passed: 8 files, 248 tests.
- `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - Passed: 77 tests.
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-rate-limit.test.ts tests/integration/routes/assistant-openrouter-live.test.ts`
  - Passed: 5 tests, including the natural CMS prompt matrix, generic Content Type field-refinement prompt, and 413 mapping.
- `set -a && source .env && set +a && bun - <<'TS' ...`
  - Passed real markdown catalog smoke using `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL`: 54,680-character nontechnical car-catalog markdown prompt returned `generic-catalog-samochodow`, 7 reviewed actions, zero provider calls, and schema fields for brand, mileage, and featured image.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `git diff --check`
  - Passed.
- `git diff --check HEAD`
  - Passed.
- `git diff --check --cached`
  - Passed after synchronizing the staged changelog whitespace fix.
- `playwright-cli -s=task414-long-prompt-ui run-code --filename .tmp/task-414-assistant-long-prompt-ui-smoke.js`
  - Passed after `coderso-dev-core-host` startup and local helper setup; verified 722 pasted lines, internal textarea scroll, no horizontal overflow, and assistant plan HTTP 200 without invalid payload.
- `bun run precommit`
  - Not run because no manual commit is being created and the script runs `format:staged` against the mixed worktree.
