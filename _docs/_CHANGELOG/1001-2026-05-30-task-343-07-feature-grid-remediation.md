# 1001 - TASK-343-07 Feature Grid remediation

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343, TASK-343-07

## Key Changes

- Reworked Feature Grid card editor fields to avoid the audited emoji preset
  pointer interception from the neighboring MediaPicker column.
- Added destructive confirmation before card-count or variant changes truncate
  saved cards.
- Added public section accessible naming and synchronized the task board,
  Feature Grid widget docs, and 28-05 audit report.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `playwright-cli -s=task343-feature-grid-smoke run-code ...`
  (constrained 1280x720 emoji hit-target smoke: passed)
- Full authenticated admin Playwright replay was not run locally because
  Playwright admin credentials are not configured in `.env`.
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-07
  drift review: no blockers)
