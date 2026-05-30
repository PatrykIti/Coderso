# 1011 - TASK-343-28 Split Layout ratio truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-28

## Key Changes

- Split Layout ratio disclosure now separates explicit saved phone ratios from
  effective starter matches.
- Visual desktop split cards preserve existing tablet and phone overrides when
  those device ratios differ from desktop.
- Variant-card selected state follows the effective desktop split so the
  highlighted card matches the rendered desktop layout.
- Updated Split Layout docs and the 28-05 audit report with the resolved
  disclosure and override-preservation contract.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-28
  drift review: no blockers)
