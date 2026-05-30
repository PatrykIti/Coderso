# 1026 - TASK-343-06 Booking Calendar truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-06, TASK-343

## Key Changes

### Widgets / Runtime

- Restored Booking Calendar frame fallback classes per cleared Surface field:
  frame background and frame border now fall back independently even when slot
  swatches remain saved.
- Kept selected-slot and hover swatches as root CSS variables without
  suppressing frame fallback classes.

### Admin UI

- Aligned Advanced booking-flow diagnostics with Wizard filtering so the
  current calendar block is never reported as its own matching flow.

### QA / Docs

- Added renderer regression coverage for cleared and partially overridden
  Surface styles.
- Added editor regression coverage for Advanced flow-summary self-match
  prevention.
- Updated Booking Calendar widget docs, Playwright report notes, task board,
  and TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- `bun scripts/playwright-widget-contract-smoke.ts --widget booking-calendar --session task-343-06-booking-calendar-rerun2 --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-06-booking-calendar-smoke-rerun2.json --output-md .tmp/task-343-06-booking-calendar-smoke-rerun2.md`

The first strict smoke attempt reached the public fixture but failed admin auth
because credentials were not exported into the process. The authenticated rerun
hung in the known first-helper-start admin probe. After restarting
`coderso-dev-core-host`, rerun2 passed with `adminFailures=0`,
`publicFailures=0`, `fixtureGaps=0`, and `metadataGaps=0`.
