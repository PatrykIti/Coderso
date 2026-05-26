# 968 - Booking editor cleanup

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

- Tightened Booking Calendar and Appointment Form mode ownership around one
  shared booking flow: Wizard uses picker-style pairing, Visual owns daily
  presentation and safe destinations, and Advanced is read-only diagnostics.
- Removed raw flow-key, endpoint, URL/path, and locale text authoring from
  beginner-facing controls. Appointment Form success/privacy/terms destinations
  now use the shared page-first destination picker.
- Removed seeded CSS-token style defaults for both widgets. Runtime theme
  fallback classes now provide default appearance until an author chooses
  explicit swatches.
- Added explicit control-path metadata across the touched editor controls and
  removed the phantom `customFields.id` writable path from Appointment Form.
- Updated widget docs, task notes, and regression tests so endpoint overrides,
  raw destination typing, raw locale text, and unowned controls do not regress.

## Validation

- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/ui/link-destination-field.test.tsx`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-booking-calendar-flow-link-2026-05-26.*`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-appointment-form-flow-link-2026-05-26.*`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-booking-appointment-focused-2026-05-26.*`
