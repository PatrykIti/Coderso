# 1068 - Logo Cloud widget 31-05 UI audit media fixture seed

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-378, TASK-378-01

## Key Changes

- Added Logo Cloud media-fixture detection to the widget Playwright smoke
  harness.
- Seeded a deterministic SVG logo through the existing authenticated admin
  media API with CSRF before Logo Cloud browser probes run.
- Added a Logo Cloud `mediaProof` that selects the seeded asset through the real
  MediaPicker, publishes the fixture page, and checks public `<img>`
  alt/grayscale/hover output.
- Kept valid existing fixture images idempotent and patched only metadata drift.
- Updated the Logo Cloud audit report, widget docs, task board, and task
  closure notes.

## Validation

- Focused Bun regression failed before the helper existed:
  `bun test tests/unit/playwright-widget-contract-smoke.test.ts -t "media fixture bootstrap"`.
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts -t "media fixture bootstrap"`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget logo-cloud --output-json .tmp/task-378-logo-cloud-smoke-dry-run.json --output-md .tmp/task-378-logo-cloud-smoke-dry-run.md`
- Full live Playwright replay was not run because local admin/frontend servers
  were not running and `.env` did not provide `CODERSO_PLAYWRIGHT_EMAIL` /
  `CODERSO_PLAYWRIGHT_PASSWORD`.
