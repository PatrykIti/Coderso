# 1002 - TASK-343-09 Stack responsive class maps

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-09

## Key Changes

- Replaced Stack's runtime-composed `md:`/`lg:` Tailwind utilities with
  explicit literal class maps for direction, gap, align, justify, and wrap.
- Added renderer coverage for every responsive Stack token so default and
  non-default tablet/desktop classes stay present in source.
- Synchronized the task board, Stack widget docs, and 28-05 audit report with
  the closed responsive class contract.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-09
  drift review: no blockers)
