# TASK-252-07-10: Booking Calendar Provider Event Modes and Availability

# FileName: TASK-252-07-10_Booking_Calendar_Provider_Event_Modes_and_Availability.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Define booking-calendar provider/event reference, month/week/list/slot modes, and availability display while treating Cal.com integration as reference-only.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/booking-calendar/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/booking-calendar/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/booking-calendar/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: safe provider/event reference, `displayMode` for month/week/list/slots,
  labels/messages, `slotsEndpoint`, and availability display states from
  `_docs/_WIDGETS/tmp/booking-calendar/MATRIX.md`; start from the current owner
  fields `flowId`, labels/messages, `slotsEndpoint`, `style`, and `resolved`.
- Adapt: time-slot bounds and intake-form handoff remain conditional; implement
  only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `booking-calendar`.
- `Visual`: `Provider event`, `Calendar mode`, `Availability`, `Empty states`, `Display`.
- `Advanced`: `Booking diagnostics`, `Provider mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/bookingCalendar.tsx`
- `core/services/booking/bookingSlotsToken.ts` only when public-read slots token
  behavior changes.
- `core/server/publicBookingApi.ts` only when `/api/booking/slots` public-read
  behavior changes.
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/bookingCalendar.test.tsx`
- `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/_WIDGETS/tmp/booking-calendar/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-10_Booking_Calendar_Provider_Event_Modes_and_Availability.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeBookingCalendarData(data: BookingCalendarData): BookingCalendarData {
  return {
    flowId: normalizeBookingCalendarFlowId(data.flowId),
    title: normalizeBookingCalendarTitle(data.title),
    description: normalizeBookingCalendarDescription(data.description),
    serviceLabel: normalizeBookingCalendarServiceLabel(data.serviceLabel),
    resourceLabel: normalizeBookingCalendarResourceLabel(data.resourceLabel),
    dateLabel: normalizeBookingCalendarDateLabel(data.dateLabel),
    displayMode: normalizeBookingCalendarDisplayMode(data.displayMode),
    slotsEndpoint: normalizeBookingCalendarSlotsEndpoint(data.slotsEndpoint),
    style: normalizeBookingCalendarStyle(data.style),
    resolved: normalizeBookingCalendarResolved(data.resolved),
  };
}

function BookingCalendarVisualEditor(props: WidgetEditorProps<BookingCalendarData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="booking-calendar.booking-calendar" title="Booking flow">
      <WidgetControlRow id="booking-calendar.flowId" label="Flow" data-widget-control="booking-calendar.flowId">
        <BookingFlowPicker value={value.flowId ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="booking-calendar.displayMode" label="Display mode" data-widget-control="booking-calendar.displayMode">
        <SegmentedControl value={value.displayMode ?? "slots"} onChange={(displayMode) => props.onChange(updateBookingCalendarDisplay(value, { displayMode }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/booking-calendar/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/bookingCalendar.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `booking-calendar` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets;
  - public slot availability reads stay on the existing `public_read` bucket.
- Reject-unknown validation:
  - changed `booking-calendar` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/bookingCalendar.tsx`.
- Anti-abuse:
  - availability fetch remains backend-owned through
    `core/services/booking/bookingSlotsToken.ts` and
    `core/server/publicBookingApi.ts`
  - provider secrets and privileged booking config must not enter widget data
  - if this leaf adds or changes a Coderso-owned public booking write, the
    endpoint must use nonce + signature/HMAC via
    `core/services/booking/bookingSubmissionNonce.ts`, optional reCAPTCHA
    policy, existing public rate-limit buckets, strict reject-unknown
    validation, and `tests/security/codersoSecurityGate.test.ts`

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun test tests/unit/server/publicBookingApi.test.ts` when `/api/booking/slots`
  or `/api/booking/reservations` public route behavior changes.
- `bun test tests/unit/booking/bookingAccess.test.ts` when booking access or
  slots-token policy changes.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-10_Booking_Calendar_Provider_Event_Modes_and_Availability.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `booking-calendar` editor exposes the research-backed controls named in this leaf with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
