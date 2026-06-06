# 1122 - TASK-407 Basic intake controls

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-06-L02

## Key Changes

### Assistant Admin UI
- Added Basic site-builder intake controls to the floating LLM Guide review
  path, driven by server-owned step metadata and option registries.
- Submitted one structured answer at a time through the existing
  `/assistant/actions/plan` route using `context.siteBuilderIntakeState`.
- Kept answer state in React memory only; derived facts are stripped from the
  request session and raw answers are not stored in assistant conversation
  localStorage.
- Added friendly validation messages and a safe restored-plan state when answer
  data is unavailable after reload.

### Validation
- Filtered Basic metadata so Advanced-only fields do not appear in Basic mode.
- Extended assistant action request schema to accept strict site-builder intake
  sessions and reject unknown/tampered answer fields.

### QA
- Added UI coverage for Basic control rendering, one-answer submit shape,
  validation errors, restored-plan safety, and AssistantPanel intake submit
  integration.
- Added route schema coverage for accepted intake state and tampered-field
  rejection.
- Ran a Claude CLI read-only audit; non-blocking UX/robustness findings were
  fixed before closure.

## Validation

- `bun run test:vitest -- tests/vitest/ui/assistant-site-builder-intake-basic.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-site-builder-intake-state.test.ts tests/vitest/ui/assistant-site-builder-intake-browser-state.test.ts tests/vitest/ui/ai-site-wizard.test.tsx tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts`
  (63 tests)
- `bun test tests/unit/server/schemaValidator.test.ts`
  (6 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude --print --effort xhigh ...`
  (read-only audit; no blocking findings)
