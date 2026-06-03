# 1070 - Team widget 31-05 UI audit UX and fixtures

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-380, TASK-380-01, TASK-380-02

## Key Changes

- Replaced Team member-count native confirmation with shared
  `ConfirmActionDialog` cancel/accept behavior.
- Kept the existing normalized destructive count semantics while making cancel
  preserve member order, photos, bios, and social links.
- Added Team media fixture bootstrap to the widget Playwright smoke harness with
  a deterministic portrait image uploaded through the authenticated admin media
  API.
- Added Team `mediaProof` coverage for real MediaPicker photo selection, Clear
  photo recovery, publish, and public image rendering.
- Updated Team widget docs, the 31-05 UI report, report index, task docs, and
  task board.

## Validation

- Focused UI regression failed before implementation because count reduction
  still used the native confirm path.
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx tests/vitest/ui/team-editor-wave.test.tsx`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget team --output-json .tmp/task-380-team-smoke-dry-run.json --output-md .tmp/task-380-team-smoke-dry-run.md`
- Full live Playwright replay was not run because local admin/frontend servers
  and `CODERSO_PLAYWRIGHT_EMAIL` / `CODERSO_PLAYWRIGHT_PASSWORD` were not
  available in this environment.
