# 1029 - TASK-343-02 Appointment Form phone validation

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-02, TASK-343

## Key Changes

### Admin UI

- Kept the Phone validation `No extra validation` preset selected after
  normalization instead of snapping back to `Default international`.
- Preserved explicit empty phone pattern/message state as a valid saved editor
  value.

### Runtime

- Omitted phone `pattern`, `title`, and validation help text when extra phone
  validation is disabled.
- Kept non-empty presets such as default international and digits/spaces active
  with their existing runtime attributes.

### QA / Docs

- Added renderer coverage for blank-pattern normalization and runtime markup.
- Added editor coverage for the `not-required` preset round-trip.
- Updated the Appointment Form widget docs, Playwright report notes, task board,
  and TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun scripts/playwright-widget-contract-smoke.ts --widget appointment-form --session task-343-02-appointment-form-final --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-02-appointment-form-final-smoke.json --output-md .tmp/task-343-02-appointment-form-final-smoke.md`

Strict smoke passed with `adminFailures=0`, `publicFailures=0`,
`fixtureGaps=0`, and `metadataGaps=0`.
