# 650. TASK-177 Vitest happy-dom cleanup

**Date:** 2026-04-15
**Version:** 0.1.0
**Tasks:** TASK-177, TASK-177-01, TASK-177-02, TASK-177-03, TASK-177-04

## Key Changes

### Test Infrastructure
- Identified post editor iframe preview rendering as the reproducible happy-dom navigation noise source.
- Updated shared Vitest setup to prevent real component-test browser navigation/fetch side effects.
- Added a happy-dom network guard for browser-managed HTTP(S) requests such as iframe preview loading.
- Added a global unexpected browser/console error guard for component tests.
- Full `bun run test:vitest` now passes without `AsyncTaskManager`, `ECONNREFUSED localhost:3000`, or `AggregateError` noise.

### Validation
- Ran:
  - targeted `tests/vitest/ui/post-editor-canvas-wave.test.tsx`
  - `bun run test:vitest`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Full Vitest result: 494 files passed, 1968 tests passed, log-clean.
