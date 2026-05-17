# TASK-258-03: Flow Pairing, Slot Context, Locale, and Redirect

# FileName: TASK-258-03_Flow_Pairing_Slot_Context_Locale_and_Redirect.md

**Priority:** High
**Category:** Widgets + Booking Runtime + Admin UX
**Estimated Effort:** Large
**Dependencies:** TASK-258, TASK-258-01, TASK-258-02, TASK-293
**Status:** In Progress (2026-05-17)

---

## Overview

Make Appointment Form selected-slot context clearer for visitors and keep the
post-submit flow deterministic.

This leaf covers:

- BF-06: selected slot summary lacks service/resource context.
- BF-12: no configurable success redirect after reservation.
- BF-15: no locale/date formatting configuration.

`UX-02` now depends on the shared `TASK-293` booking flow editor-context seam.
This leaf only consumes that seam if it lands in the same implementation wave;
otherwise TASK-258 closure must defer the flow-pairing feedback row to
`TASK-293` explicitly instead of hiding it inside Appointment Form-local work.

Booking Calendar may be touched only to enrich the selection event payload
needed by Appointment Form. Calendar editor/product redesign remains outside
this task.

## Files to Change

- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/appointmentForm.tsx`
- `core/widgets/core/bookingCalendar.tsx`
- `core/widgets/core/bookingRuntimeScript.ts`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/widgets/bookingCalendar.test.tsx`
- `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`

## Sub-Tasks

- [ ] Enrich booking slot selections with service and resource names.
- [ ] Render Appointment Form slot summary with configured service/resource
  context when those values are available.
- [ ] Add locale/date format configuration owned by Appointment Form runtime
  data and mirrored by the booking runtime script.
- [ ] Add optional same-origin or relative success redirect after successful
  booking submission.
- [ ] If shared flow-context plumbing is not implemented in the same wave,
  record `UX-02` as deferred to `TASK-293` with exact reasoning/evidence.

## Implementation Pseudocode

```ts
const nextSelection = {
  serviceId: serviceSelect.value,
  serviceName: serviceSelect.selectedOptions[0]?.textContent?.trim() || "",
  resourceId: resourceSelect.value,
  resourceName: resourceSelect.selectedOptions[0]?.textContent?.trim() || "",
  startsAt: slot.startsAt,
  endsAt: slot.endsAt,
  timezone,
};

function renderAppointmentSelection(selection) {
  const service = form.dataset.showServiceInSummary === "true" ? selection.serviceName : "";
  const resource = form.dataset.showResourceInSummary === "true" ? selection.resourceName : "";
  summaryNode.textContent = [service, resource, dateAndTime].filter(Boolean).join(" - ");
}

function resolveSafeRedirect(raw: string, origin: string): string | null {
  if (!raw.trim()) return null;
  const url = new URL(raw, origin);
  if (url.origin !== origin) return null;
  return url.pathname + url.search + url.hash;
}
```

Error handling:

- If service/resource names are unavailable in an old selection payload, keep
  the current time-only summary.
- If locale is invalid, fall back to browser locale.
- If redirect URL is unsafe or cross-origin, normalize it away and keep the
  visitor on the page after success.

## Security Contract

No API route is added.

- Endpoint visibility: unchanged admin editing and public runtime output. The
  existing public booking write route remains `POST /api/booking/reservations`.
- Auth model: unchanged. Admin/template editors require the existing admin
  session, public booking mode uses the booking access evaluator, and internal
  booking mode still requires admin session or API key scope.
- RBAC: unchanged.
- CSRF: unchanged for admin editing; public reservation submissions keep the
  existing booking submission nonce/signature check when required.
- Rate-limit bucket: unchanged `public_write` for public reservations.
- Reject-unknown validation: new widget fields such as locale, summary display,
  and redirect URL must be schema-owned and normalized in
  `appointmentForm.tsx`.
- Anti-abuse: redirect URLs must be same-origin or relative. Do not allow
  external redirect targets from widget data. Locale and summary fields must not
  weaken nonce/signature, optional reCAPTCHA, or internal session/API-key
  checks.
- Secret handling: locale, summary, and redirect fields must not expose tokens,
  nonces, or private booking diagnostics. Flow-context exposure, if used in the
  same wave, is owned by `TASK-293`.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`,
  `tests/vitest/ui/page-editor-shell-wave.test.tsx`,
  `tests/vitest/ui/widget-template-editor.test.tsx`,
  `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`, and
  the current detail-template editor-context suite only when this leaf also
  lands the shared `TASK-293` plumbing in the same wave.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` fixed evidence for
  UX-02, BF-06, BF-12, and BF-15.
- `_docs/_TASKS/TASK-293_Booking_Flow_Editor_Context_Surface_Plumbing.md` when
  `UX-02` defers to or completes through the shared seam.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on completion.

## Acceptance Criteria

- Selected slot summary can include service/resource names when selected through
  Booking Calendar.
- Locale/date formatting is deterministic when configured and backward
  compatible when omitted.
- Success redirect accepts only relative or same-origin targets and is covered
  by tests.
- If `UX-02` is not landed in the same wave, the closure matrix points it to
  `TASK-293` explicitly rather than claiming it fixed locally.
