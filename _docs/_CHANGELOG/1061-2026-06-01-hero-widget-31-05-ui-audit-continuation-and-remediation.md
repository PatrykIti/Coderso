# 1061 - Hero widget 31-05 UI audit continuation and remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-371, TASK-371-01, TASK-371-02

## Key Changes

- Fixed Hero Visual CTA layout switching so `Single CTA -> Dual CTA` restores
  the last useful secondary CTA, or the default secondary CTA when no authored
  secondary action exists.
- Preserved the existing runtime/domain contract: saved single-CTA Hero blocks
  still keep `secondaryCta` absent, and truly empty CTA payloads still render no
  secondary link.
- Added focused Hero UI regression coverage for authored and default secondary
  CTA restoration.
- Closed the remaining Hero matrix gap with UI replay coverage for destination
  picker, media/background, rich copy, social proof, layout, typography,
  appearance, Advanced summaries, and renderer contracts.
- Updated Hero widget docs, the 31-05 Hero report, task board, and task closure
  notes.

## Validation

- Focused CTA regression failed before the fix: `expected { label: "", href: "" }`
  after `Single -> Dual`.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/hero-editor-wave.test.tsx -t "restores a useful secondary CTA"`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/hero.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/hero.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-371-hero-2026-06-01 --admin http://localhost:5173/admin --front http://localhost:3000 --widget hero --strict ...` - attempted; local artifact reports `admin_unreachable` and `/homepage` 404 fixture gap.
- `bun scripts/playwright-widget-contract-smoke.ts --session task-371-hero-admin-2026-06-01 --admin http://localhost:5173/admin/ --front http://localhost:3000 --widget hero --strict --skip-front ...` - attempted; local artifact reports `admin_unreachable`.
- `timeout 180s claude -p --dangerously-skip-permissions --max-budget-usd 0.8 "Review the current staged TASK-371 Hero diff only..."` - no blockers
