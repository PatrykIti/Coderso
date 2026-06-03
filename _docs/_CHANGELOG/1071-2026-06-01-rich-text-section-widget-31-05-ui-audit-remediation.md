# 1071 - Rich Text Section widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-381, TASK-381-01, TASK-381-02, TASK-381-03

## Key Changes

- Preserved body sanitizer diagnostics when a clean structured block edit is
  saved, so Advanced no longer loses guidance that Visual just surfaced.
- Aligned Rich Text Section default body HTML and structured block copy so a
  pristine widget no longer reports source drift.
- Added deterministic Rich Text Section image and PDF media fixture bootstrap to
  the widget Playwright smoke harness.
- Added Rich Text Section smoke proof coverage for MediaPicker image/document
  selection, unsafe link command guidance, raw iframe paste blocking, publish,
  and public image/attachment rendering.
- Updated Rich Text Section widget docs, the 31-05 UI report, report index, task
  docs, and task board.

## Validation

- Focused regressions failed before implementation for default source drift,
  body diagnostics retention, and missing Rich Text media fixture bootstrap.
- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget rich-text-section --output-json .tmp/task-381-rich-text-section-smoke-dry-run.json --output-md .tmp/task-381-rich-text-section-smoke-dry-run.md`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Full live Playwright replay was not run because local admin/frontend servers
  returned HTTP `000` and `CODERSO_PLAYWRIGHT_EMAIL` /
  `CODERSO_PLAYWRIGHT_PASSWORD` were not available in `.env`.
