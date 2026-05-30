# 1000 - TASK-343-03 Newsletter submit guard

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-03

## Key Changes

- Prevented disconnected Newsletter states from rendering a native `<form>`, so
  browser implicit Enter submission can no longer leak email values into the
  current URL.
- Preserved real submit behavior for safe external `action-url` targets and the
  existing Forms runtime path.
- Clarified Visual editor disconnected-state guidance and synchronized the
  task board, Newsletter widget docs, and 28-05 audit report.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-03
  drift review: no blockers)
