# TASK-252-07-11: Appointment Form Fields Validation Copy and States

# FileName: TASK-252-07-11_Appointment_Form_Fields_Validation_Copy_and_States.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Add appointment-form fields, validation copy, and state copy first while keeping
the existing booking-owned public submission endpoint intact. Provider/embed
mode stays Adapt-only, and CAPTCHA/nonce remain backend policy rather than
widget options.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/appointment-form/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/appointment-form/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/appointment-form/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/appointment-form/MATRIX.md`; for this leaf, start from the current owner fields `flowId`, field labels/placeholders, `submissionEndpoint`, `style`, `resolved` and add only the schema fields that the matrix explicitly keeps.
- Adapt: rows marked `Adapt` are conditional scope, not required scope.
  Provider/embed mode requires a backend-owned submission flow; implement only
  when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `appointment-form`.
- `Visual`: `Fields`, `Validation copy`, `State copy`, `Layout`.
- `Advanced`: `Public-write diagnostics`, `Booking submission boundary`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/server/publicBookingApi.ts` only when `/api/booking/reservations`
  submission behavior changes.
- `core/services/booking/bookingSubmissionNonce.ts` only when booking nonce
  behavior changes.
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/_WIDGETS/tmp/appointment-form/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-11_Appointment_Form_Fields_Validation_Copy_and_States.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeAppointmentFormData(data: AppointmentFormData): AppointmentFormData {
  return {
    flowId: normalizeAppointmentFormFlowId(data.flowId),
    title: normalizeAppointmentFormTitle(data.title),
    description: normalizeAppointmentFormDescription(data.description),
    submitLabel: normalizeAppointmentFormSubmitLabel(data.submitLabel),
    showPhone: normalizeAppointmentFormShowPhone(data.showPhone),
    showNotes: normalizeAppointmentFormShowNotes(data.showNotes),
    submissionEndpoint: normalizeAppointmentFormSubmissionEndpoint(data.submissionEndpoint),
    style: normalizeAppointmentFormStyle(data.style),
    resolved: normalizeAppointmentFormResolved(data.resolved),
  };
}

function AppointmentFormVisualEditor(props: WidgetEditorProps<AppointmentFormData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="appointment-form.appointment-form" title="Fields and copy">
      <WidgetControlRow id="appointment-form.customerEmailLabel" label="Email label" data-widget-control="appointment-form.customerEmailLabel">
        <Input value={value.customerEmailLabel ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/appointment-form/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/appointmentForm.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `appointment-form` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - rendered appointment forms continue to submit to the existing
    `POST /api/booking/reservations` endpoint by default;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling;
  - public reservation writes do not use admin CSRF and must keep the booking
    nonce/signature boundary.
- Rate-limit bucket:
  - unchanged admin write buckets;
  - existing reservation submissions stay on the `public_write` bucket.
- Reject-unknown validation:
  - changed `appointment-form` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/appointmentForm.tsx`.
- Anti-abuse:
  - CAPTCHA, nonce, and provider-secret settings are not widget-data options
  - the existing Coderso-owned reservation write must keep nonce + signature/
    HMAC via `core/services/booking/bookingSubmissionNonce.ts` and
    `assertBookingSubmissionNonce`, optional reCAPTCHA policy, existing
    `public_write` rate-limit handling, strict reject-unknown validation,
    `tests/unit/server/publicBookingApi.test.ts`, and
    `tests/security/codersoSecurityGate.test.ts`
  - raw provider scripts and secrets are rejected

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun test tests/unit/server/publicBookingApi.test.ts` when
  `/api/booking/reservations` submission behavior changes.
- `bun test tests/security/codersoSecurityGate.test.ts` when booking nonce,
  bot-protection, or public-write hardening changes.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-11_Appointment_Form_Fields_Validation_Copy_and_States.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `appointment-form` editor exposes research-backed source/display/state controls with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
