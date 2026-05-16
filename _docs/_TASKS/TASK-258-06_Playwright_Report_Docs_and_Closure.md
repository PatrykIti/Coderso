# TASK-258-06: Playwright Report, Docs, and Closure

# FileName: TASK-258-06_Playwright_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Docs + QA + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-258-01, TASK-258-02, TASK-258-03, TASK-258-04, TASK-258-05
**Status:** To Do

---

## Overview

Close the Appointment Form Playwright follow-up only after implementation,
tests, report evidence, docs, changelog, and board state agree.

This leaf owns final synchronization for TASK-258 and must not hide remaining
product scope inside generic "deferred" wording. Every report finding must be
marked fixed, not reproducible, or deferred to a named physical future task.

## Files to Change

- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/WIDGETS.md` only if shared wording changed.
- `_docs/WIDGET_PACK_MATRIX.md` only if booking pack readiness changed.
- `_docs/_TASKS/TASK-258_Appointment_Form_Widget_Playwright_Follow_Up.md`
- `_docs/_TASKS/TASK-258-01_Runtime_State_Admin_Preview_and_Submission_Feedback.md`
- `_docs/_TASKS/TASK-258-02_Field_Validation_Visibility_and_Accessibility.md`
- `_docs/_TASKS/TASK-258-03_Flow_Pairing_Slot_Context_Locale_and_Redirect.md`
- `_docs/_TASKS/TASK-258-04_Consent_Custom_Fields_and_Public_Write_Hardening.md`
- `_docs/_TASKS/TASK-258-05_Style_Variants_and_Advanced_Diagnostics.md`
- `_docs/_TASKS/TASK-258-06_Playwright_Report_Docs_and_Closure.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/<next>-2026-..-task-258-appointment-form-widget-playwright-follow-up.md`
- `_docs/_CHANGELOG/README.md`

## Sub-Tasks

- [ ] Build a finding-by-finding closure matrix for BUG-01, BUG-02, UX-01
  through UX-07, BF-01 through BF-18, and A1 through A6.
- [ ] Mark each finding as fixed, not reproducible, or deferred to a named
  future task with reason and owner.
- [ ] Refresh `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` with textual
  admin/frontend evidence; do not commit PNG screenshots.
- [ ] Update `_docs/_WIDGETS/APPOINTMENT_FORM.md` for final schema, editor,
  variants, public write, consent, CAPTCHA, and runtime-state behavior.
- [ ] Update source-of-truth docs only where final implementation changed a
  source-of-truth contract.
- [ ] Add changelog entry and update changelog index.
- [ ] Move TASK-258 leaves and umbrella to `Done` only after all required
  validation is green or a user-approved blocker is recorded.

## Implementation Pseudocode

```ts
type AppointmentFormFindingStatus =
  | "fixed"
  | "not-reproducible"
  | "deferred";

type AppointmentFormFindingClosure = {
  id: string;
  reportLines: string;
  status: AppointmentFormFindingStatus;
  ownerTask: string;
  evidence: string;
  validation: string[];
  deferredTask?: string;
};

function assertClosureMatrix(rows: AppointmentFormFindingClosure[]) {
  const expected = [
    "BUG-01", "BUG-02",
    "UX-01", "UX-02", "UX-03", "UX-04", "UX-05", "UX-06", "UX-07",
    "BF-01", "BF-02", "BF-03", "BF-04", "BF-05", "BF-06", "BF-07",
    "BF-08", "BF-09", "BF-10", "BF-11", "BF-12", "BF-13", "BF-14",
    "BF-15", "BF-16", "BF-17", "BF-18",
    "A1", "A2", "A3", "A4", "A5", "A6",
  ];
  for (const id of expected) {
    if (!rows.some((row) => row.id === id)) throw new Error(`Missing ${id}`);
  }
}
```

Error handling:

- If Playwright cannot run locally, record the exact blocker and use targeted
  Vitest/Bun evidence, but do not claim Playwright replay passed.
- If a finding remains valid but is not implemented by TASK-258, create a new
  physical task before moving TASK-258 to `Done`.
- If broad validation fails for unrelated existing reasons, isolate and record
  the unrelated failure separately; do not mark TASK-258 green from a red gate.

## Security Contract

No route is added by this closure leaf.

- Endpoint visibility: no new route. Closure must cite the final endpoint
  visibility from completed leaves, including public
  `POST /api/booking/reservations` when TASK-258-04 changes it.
- Auth model/RBAC: unchanged from completed implementation leaves. Public
  booking access, internal session/API-key scope, and admin editor permissions
  must be recorded where relevant.
- CSRF: unchanged from completed implementation leaves. Public booking writes
  must keep the existing nonce/signature policy where relevant.
- Rate-limit bucket: unchanged from completed implementation leaves. Public
  booking writes must keep `public_write` where relevant.
- Reject-unknown validation: closure must list final schema/API validation
  evidence when TASK-258-04 touched public booking payloads.
- Anti-abuse: closure must list nonce/CAPTCHA/security-gate evidence when
  public write behavior changed.
- Secret handling: reports and changelog must use redacted/dummy values only.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
  if created.
- `bun run test:vitest -- tests/vitest/validation/bookingSchemas.test.ts` if
  public booking metadata shape changed for consent/custom fields.
- `bun test tests/integration/runtime/appointment-form-runtime-hydration.test.ts`
  if public CAPTCHA metadata injection changed.
- `bun test tests/unit/widgets/validator.test.ts` if schema changed.
- `set -a && source .env && set +a` before DB-backed public booking API tests.
- `bun test tests/unit/server/publicBookingApi.test.ts` if public booking route
  behavior changed; confirm DB-backed reservation assertions ran, or record the
  `DATABASE_URL`/connectivity blocker and cite non-DB schema normalization
  evidence for bounded metadata.
- `bun test tests/security/codersoSecurityGate.test.ts` if nonce/CAPTCHA/public
  write hardening changed.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- Playwright appointment-form replay if the local app/test harness is available;
  otherwise record the blocker and exact replacement evidence.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md`
- `_docs/WIDGETS.md` or `_docs/WIDGET_PACK_MATRIX.md` only when source-of-truth
  contracts changed.

## Acceptance Criteria

- TASK-258 closure matrix covers every report finding and accessibility row.
- Playwright report is updated with textual fixed/deferred evidence and no PNG
  artifacts are committed.
- Appointment Form docs match final code behavior.
- Task board stats and rows match final task statuses.
- Changelog entry lists TASK-258 and any completed leaves.
- Required validation commands are green or explicitly blocked with evidence.
