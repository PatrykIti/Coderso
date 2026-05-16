# TASK-258-01: Runtime State, Admin Preview, and Submission Feedback

# FileName: TASK-258-01_Runtime_State_Admin_Preview_and_Submission_Feedback.md

**Priority:** High
**Category:** Widgets + Booking Runtime + Admin Preview
**Estimated Effort:** Large
**Dependencies:** TASK-258
**Status:** To Do

---

## Overview

Fix Appointment Form runtime-state drift from the Playwright report without
changing the public booking API contract.

This leaf covers:

- BUG-01: the admin canvas renders an enabled submit button when no slot is
  selected.
- BUG-02 and UX-07: API error text remains visible after the visitor edits a
  field.
- BF-09: no loading message or visible submit-state change during submission.
- BF-13: successful submission resets form inputs but leaves the selected slot
  active, allowing duplicate reservation attempts.

## Files to Change

- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/bookingRuntimeScript.ts`
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts` (create)
- `_docs/_TASKS/TASK-258-01_Runtime_State_Admin_Preview_and_Submission_Feedback.md`
- `_docs/_TASKS/README.md` on status changes

## New Files to Create

- `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`

## Sub-Tasks

- [ ] Render Appointment Form submit disabled by default so SSR/admin canvas
  matches the no-slot public runtime state.
- [ ] Add schema/default/normalizer/render/editor support for configurable
  `loadingMessage` without adding a new API route.
- [ ] Update `bindAppointmentForm` to hide stale error text on first
  visitor input/change after a failed submission.
- [ ] Update submission state so the submit button exposes loading copy while
  the request is in flight and restores the configured label afterward.
- [ ] Clear the selected booking runtime state after successful submission and
  dispatch the existing booking slot event with `selection: null`.
- [ ] Add runtime-script DOM tests that exercise no-slot disabled state,
  selection enablement, API error clearing, loading copy, and success slot clear.

## Implementation Pseudocode

```ts
type AppointmentFormData = {
  submitLabel?: string;
  loadingMessage?: string;
  successMessage?: string;
  noSelectionMessage?: string;
};

function clearSelection(flowId: string) {
  if (!flowId) return;
  delete state.selections[flowId];
  window.dispatchEvent(new CustomEvent(SLOT_EVENT_NAME, {
    detail: { flowId, selection: null },
  }));
}

function setSubmittingState(form: HTMLFormElement, submitting: boolean) {
  const button = form.querySelector("[data-booking-submit]");
  if (!(button instanceof HTMLButtonElement)) return;
  const idleLabel = button.dataset.idleLabel || button.textContent || "Book appointment";
  const loadingLabel = form.dataset.loadingMessage || "Booking...";
  button.disabled = submitting || !Boolean(getSelection(flowId));
  button.textContent = submitting ? loadingLabel : idleLabel;
}

function bindAppointmentForm(form: HTMLFormElement) {
  form.addEventListener("input", () => {
    hide(errorNode);
  }, { passive: true });

  form.addEventListener("change", () => {
    hide(errorNode);
  }, { passive: true });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!getSelection(flowId)) return showNoSelectionError();
    setSubmittingState(form, true);
    try {
      await submitReservation();
      form.reset();
      clearSelection(flowId);
      renderSelection(null);
    } finally {
      setSubmittingState(form, false);
    }
  });
}
```

Error handling:

- If submission fails, keep the selected slot and restore the enabled submit
  state when a selection still exists.
- If submission succeeds, clear the selected slot before restoring the idle
  state so the button remains disabled until a new slot is selected.
- If the loading label is blank, normalize it to the default value.
- If the runtime script is not executed, server-rendered/admin-preview markup
  still starts with a disabled no-slot submit button.
- `loadingMessage` must be owned in `appointmentForm.tsx` alongside
  `submitLabel`: schema field, default, normalizer fallback, rendered
  `data-loading-message`, Wizard editor control beside `submitLabel`, and
  editor/widget regression coverage all move together.

## Security Contract

No route is added and the public booking request shape remains unchanged.

- Endpoint visibility: unchanged existing public `POST /api/booking/reservations`.
- Auth model: unchanged public/internal booking access evaluator.
- RBAC: unchanged.
- CSRF: unchanged booking nonce requirement when policy requires public
  protection.
- Rate-limit bucket: unchanged `public_write`.
- Reject-unknown validation: unchanged; no new public payload fields in this
  leaf unless loading copy is rendered only as widget data attributes.
- Anti-abuse: successful submission must not leave a reusable selected slot in
  client runtime state.
- Secret handling: no nonce values or tokens in tests beyond local dummy values.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun test tests/unit/server/publicBookingApi.test.ts` only if this leaf changes
  public reservation payload semantics.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md` after implementation.
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` fixed evidence for
  BUG-01, BUG-02, UX-07, BF-09, and BF-13.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on completion.

## Acceptance Criteria

- Server-rendered/admin canvas Appointment Form markup starts with disabled
  submit when no slot is selected.
- Public runtime enables the button only after the matching `flowId` selection.
- API errors disappear on first user input/change after the failed submission.
- The submit button has deterministic in-flight copy and no duplicate submits.
- Successful submission clears the selected slot summary and disables submit.
