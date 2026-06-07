# 1123 - TASK-407 Advanced intake controls

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-06-L03

## Key Changes

### Assistant Planning
- Added server-owned Advanced site-builder intake progression and metadata.
- Routed explicit Advanced mode and active Advanced sessions through the same
  structured `needs_input` plan path before provider drafting or executable
  actions.
- Kept Basic as the default broad full-site prompt path for nontechnical users.

### Assistant Admin UI
- Generalized the floating LLM Guide site-builder stepper for Basic and
  Advanced modes.
- Added explicit Basic-to-Advanced confirmation, selectable step chips, and
  controlled Advanced fields for menu behavior, CTA page role, hero variant,
  section variants, content engines, design presets, and references.
- Kept intake request sessions stripped to `version`, `mode`, `currentStepId`,
  and `answers`; derived facts and raw reference/provider material remain out of
  browser cache and request payloads.

### Validation
- Added Advanced planner, UI, panel handoff, and route-schema coverage.
- Documented the Advanced admin UI contract in the assistant site-builder docs.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/ui/assistant-site-builder-intake-advanced.test.tsx tests/vitest/ui/assistant-site-builder-intake-basic.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
  (42 tests)
- `bun test tests/unit/server/schemaValidator.test.ts`
  (6 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- `git diff --check`
- `claude --print --effort xhigh ...`
  (two read-only audit passes; no remaining blocking or medium findings)
