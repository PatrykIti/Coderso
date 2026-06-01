# 1060 - Stack widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-370, TASK-370-01

## Key Changes

- Preserved absent Stack `direction` on non-empty saved/imported payloads so
  variant-aware defaults can resolve after validation.
- Added public `WidgetRenderer` regressions for responsive `row/row/column` and
  horizontal `row/row/row` defaults when `direction` is omitted.
- Added Stack and Bun validator regressions proving `normalizeWidgetBlock()`
  does not inject vertical direction into non-empty payloads that omit it.
- Updated Stack docs, the 31-05 Playwright report, task board, and task closure
  notes.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/ui/block-layout-shared-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `timeout 180s claude -p --dangerously-skip-permissions --max-budget-usd 0.8 "Review the current staged TASK-370 Stack diff only..."` - no blockers
