# TASK-394-01: AF-31-05-01 - Calendar/form runtime binding must be idempotent regardless of DOM order
# FileName: TASK-394-01_AF_31_05_01_Calendar_Form_Runtime_Binding_Must_Be_Idempotent_Regardless.md

**Priority:** High
**Category:** Widgets + Appointment Form + Public Booking API + Security + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-394
**Status:** Done

---

## Overview

Execution-ready leaf task for AF-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_APPOINTMENT_FORM_WIDGET.md` and parent `TASK-394`.

Status log:

- 2026-06-02: Moved to In Progress with TASK-394 family implementation.
- 2026-06-02: Done; runtime rebinder now binds calendar/form nodes in either DOM order.

Shared booking runtime guard exits after first script, so later calendar/form nodes may not bind.

## Sub-Tasks

- [x] Reproduce AF-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Emit runtime once through shared registry or make repeated calls run idempotent `bindCalendars()` and `bindForms()` plus DOMContentLoaded/microtask fallback.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Runtime tests for calendar->form and form->calendar DOM order both bound.

## Owner Files

- `core/widgets/core/bookingRuntimeScript.ts`
- `core/widgets/core/appointmentForm.tsx`
- `core/widgets/core/bookingCalendar.tsx`

## Security Contract

Public write endpoint: booking reservation submit. Requires nonce/signature/token, service-level access evaluation, optional CAPTCHA for public services, rate-limit bucket for booking submissions, strict reject-unknown validation, server-side slot verification, and internal/admin path separation by session/RBAC/CSRF or API key scope.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

Leaf-specific checks:

- Endpoint visibility must be explicit if a route is touched: internal admin routes require session/RBAC/CSRF; public routes require the existing widget-specific public access contract.
- Public writes must use nonce/signature/HMAC or the existing equivalent, optional CAPTCHA where configured, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for malformed IDs, unsafe hrefs, unsafe CSS, stale runtime data, and empty resolver states.
- Browser-visible state must not contain secrets, provider keys, privileged settings, persisted nonce values, or internal-only identifiers.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/server/publicBookingApi.test.ts` when DB/env is available
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Runtime tests for calendar->form and form->calendar DOM order both bound.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_APPOINTMENT_FORM_WIDGET.md`
- `_docs/_TASKS/TASK-394_Appointment_Form_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- AF-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes

- `bookingRuntimeScript.ts` now stores an idempotent shared rebinder and calls it
  when a second inline runtime script executes.
- Focused runtime regression covers calendar -> form and form -> calendar DOM
  order with both nodes bound.
