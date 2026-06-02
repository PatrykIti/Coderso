# TASK-394: Appointment Form 31-05 UI Audit Remediation Family
# FileName: TASK-394_Appointment_Form_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Appointment Form + Public Booking API + Security + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_APPOINTMENT_FORM_WIDGET.md
**Status:** Done

---

## Overview

Close Appointment Form pairing, reservation trust, mixed access, success copy, and field-bound drift issues.

Status log:

- 2026-06-02: Moved to In Progress for implementation.
- 2026-06-02: Closed after implementing Appointment Form runtime/API/security
  remediations and focused regression coverage.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_APPOINTMENT_FORM_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Appointment Form. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- AF-31-05-01: Calendar/form runtime binding must be idempotent regardless of DOM order
- AF-31-05-02: Public reservation API must verify server-generated slot match
- AF-31-05-03: Mixed public/internal service catalog must scope captcha/nonce per selected service
- AF-31-05-04: Widget custom success copy must outrank API default
- AF-31-05-05: Align client maxLength with public API schema bounds

## Sub-Tasks

- [x] [TASK-394-01](TASK-394-01_AF_31_05_01_Calendar_Form_Runtime_Binding_Must_Be_Idempotent_Regardless.md): AF-31-05-01 - Calendar/form runtime binding must be idempotent regardless of DOM order
- [x] [TASK-394-02](TASK-394-02_AF_31_05_02_Public_Reservation_API_Must_Verify_Server_Generated_Slot.md): AF-31-05-02 - Public reservation API must verify server-generated slot match
- [x] [TASK-394-03](TASK-394-03_AF_31_05_03_Mixed_Public_Internal_Service_Catalog_Must_Scope_Captcha.md): AF-31-05-03 - Mixed public/internal service catalog must scope captcha/nonce per selected service
- [x] [TASK-394-04](TASK-394-04_AF_31_05_04_Widget_Custom_Success_Copy_Must_Outrank_API_Default.md): AF-31-05-04 - Widget custom success copy must outrank API default
- [x] [TASK-394-05](TASK-394-05_AF_31_05_05_Align_Client_MaxLength_With_Public_API_Schema_Bounds.md): AF-31-05-05 - Align client maxLength with public API schema bounds

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

Public write endpoint: booking reservation submit. Requires nonce/signature/token, service-level access evaluation, optional CAPTCHA for public services, rate-limit bucket for booking submissions, strict reject-unknown validation, server-side slot verification, and internal/admin path separation by session/RBAC/CSRF or API key scope.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/server/publicBookingApi.test.ts` when DB/env is available
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_APPOINTMENT_FORM_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1084; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes

- Closed AF-31-05-01 by storing `window.__nextlessBookingRuntimeBind` and
  rebinding calendars/forms on repeated inline runtime calls plus microtask /
  DOMContentLoaded.
- Closed AF-31-05-02 by requiring exact server-generated slot match before
  public reservation persistence.
- Closed AF-31-05-03 by projecting `submissionAccess` through Booking Calendar
  service options and slot selections, then scoping captcha/nonce behavior to
  the selected service.
- Closed AF-31-05-04 by making widget success copy outrank API runtime default.
- Closed AF-31-05-05 by adding shared Appointment Form field-limit constants and
  applying them in widget schema, normalizer, renderer/runtime payload shaping,
  and public booking API validation.
- Validation passed: targeted Vitest Appointment Form/Booking Calendar suites,
  Bun public booking API suite with DB env, Coderso security gate, shared
  runtime/public renderer smoke tests, `bun --cwd core lint`,
  `bun --cwd core lint:types`, Semgrep advisory scan, Gitleaks worktree scan,
  Trivy secret scan, and `git diff --check`.
