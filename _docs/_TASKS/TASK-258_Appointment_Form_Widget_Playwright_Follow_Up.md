# TASK-258: Appointment Form Widget Playwright Follow-Up

# FileName: TASK-258_Appointment_Form_Widget_Playwright_Follow_Up.md

**Priority:** High
**Category:** Widgets + Booking + Admin UI + Runtime + Public Write Security + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-11, TASK-256-07
**Status:** In Progress (2026-05-17)

---

## Overview

Create the widget-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`.

This family owns only Appointment Form behavior and its booking-form runtime
contract. It must not re-open the shared widget contract already tracked by
TASK-256. If implementation discovers a problem in shared editor mode updates,
generic `Clear`/`none` semantics, slot placeholder gating, or generic
interactive ARIA helpers, fix that through the existing TASK-256 leaves before
returning here.

The current Appointment Form owners are:

- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/bookingRuntimeScript.ts`
- `core/server/publicBookingApi.ts`
- `core/server/validation/bookingSchemas.ts`
- `core/services/booking/bookingRuntimeResolver.ts`
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/unit/server/publicBookingApi.test.ts`
- `tests/security/codersoSecurityGate.test.ts`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`

## Scope Boundary Against TASK-256

In scope for TASK-258:

- Appointment Form admin preview parity, booking selection state, stale error
  handling, loading copy, and post-success slot clearing.
- Appointment Form field visibility, required-field controls, phone/notes
  validation, split-name mode, autocomplete, and form accessible naming.
- Appointment Form flow-key pairing guidance, slot summary service/resource
  context, locale formatting, and success redirect.
- Appointment Form consent, custom fields, and backend-owned public-write
  CAPTCHA token bridge.
- Appointment Form variants, submit text color, style status indicators, and
  read-only runtime diagnostics.
- Appointment Form docs, report closure, changelog, and task board sync.

Out of scope for TASK-258:

- Cross-widget editor mode atomic update helpers, owned by TASK-256-01.
- Generic `Clear` versus `none` semantics, owned by TASK-256-02.
- Generic slot/nested-content placeholder gating, owned by TASK-256-03.
- Generic duplicate-ID/runtime binding/ARIA fixes across unrelated widgets,
  owned by TASK-256-04.
- Booking Calendar product redesign beyond the minimal runtime selection data
  needed by Appointment Form slot summaries.
- New public endpoint policy, custom endpoint removal, or cross-widget
  bot-protection projection redesign not required by the Appointment Form
  report. If public-write implementation discovers a real endpoint ownership
  issue, route it through TASK-258-04 or a new physical security task with a
  backward-compatibility plan; do not hide it inside TASK-258-05 styling work.

## Source Report Coverage

| Report finding | Route |
|---|---|
| BUG-01, BUG-02, UX-07, BF-09, BF-13 | TASK-258-01 |
| UX-01, UX-03, BF-02, BF-04, BF-10, BF-11, BF-14, BF-17, BF-18, A1-A5 | TASK-258-02 |
| UX-02 | TASK-293 |
| BF-06, BF-12, BF-15 | TASK-258-03 |
| BF-05 | TASK-294 |
| BF-07, BF-08 | TASK-258-04 |
| UX-04 | TASK-256-02 |
| UX-05, UX-06, BF-01, BF-03, BF-16, A6 | TASK-258-05 |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-258-06 |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-258-01 | Report IDs: BUG-01, BUG-02, UX-07, BF-09, BF-13 | `appointmentForm.tsx`, `AppointmentFormEditors.tsx`, `bookingRuntimeScript.ts` | Vitest widget render, editor wave for `loadingMessage`, new booking runtime script DOM suite, Bun public API only if payload changes |
| TASK-258-02 | Report IDs: UX-01, UX-03, BF-02, BF-04, BF-10, BF-11, BF-14, BF-17, BF-18, A1-A5 | `appointmentForm.tsx`, `AppointmentFormEditors.tsx`, `bookingRuntimeScript.ts` | Vitest widget render, editor wave, validator, runtime payload DOM assertions |
| TASK-258-03 | Report IDs: BF-06, BF-12, BF-15 | `AppointmentFormEditors.tsx`, `bookingRuntimeScript.ts`, `bookingCalendar.tsx`, `appointmentForm.tsx` | Vitest editor wave plus booking runtime script/widget render assertions for summary context, locale formatting, and safe redirect |
| TASK-258-04 | Report IDs: BF-07, BF-08 | `appointmentForm.tsx`, `AppointmentFormEditors.tsx`, `bookingRuntimeScript.ts`, `publicSite.tsx`, `publicBookingApi.ts`, `bookingSchemas.ts`, `bookingRuntimeResolver.ts`, `securitySettings.ts`, optional shared CAPTCHA helper only if extracted | Vitest widget/editor, booking schema validation, public runtime hydration, Bun public booking API route-boundary coverage including known error mapping, current public request entrypoint coverage when dispatch changes, security gate |
| TASK-258-05 | Report IDs: UX-05, UX-06, BF-01, BF-03, BF-16, A6 | `appointmentForm.tsx`, `AppointmentFormEditors.tsx`, widget registry/docs only when Appointment Form variants or docs metadata change | Vitest widget/editor, validator coverage when variant/style schema changes, style clear adjacency only if shared styles change |
| TASK-258-06 | Report closure table plus every fixed/deferred source row | `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`, `_docs/_WIDGETS/APPOINTMENT_FORM.md`, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves, `gates:coderso`, `scan:security:strict`, `precommit`, and Playwright replay or exact blocker note |

## Sub-Tasks

- [ ] TASK-258-01: Runtime State, Admin Preview, and Submission Feedback
- [ ] TASK-258-02: Field Validation, Visibility, and Accessibility
- [ ] TASK-258-03: Flow Pairing, Slot Context, Locale, and Redirect
- [ ] TASK-258-04: Consent, Custom Fields, and Public Write Hardening
- [ ] TASK-258-05: Style, Variants, and Advanced Diagnostics
- [ ] TASK-258-06: Playwright Report, Docs, and Closure

## Implementation Order

1. Complete TASK-258-01 first because the runtime state contract is the base for
   form submission feedback, slot clearing, and later CAPTCHA/redirect behavior.
2. Complete TASK-258-02 next because it stabilizes the Appointment Form schema,
   field names, validation attributes, and editor sections used by later leaves.
3. Complete TASK-258-03 after the core field model exists so flow context and
   redirect/locale data can use stable schema fields.
4. Complete TASK-258-04 after field validation because consent and custom fields
   extend the public payload and must stay bounded by the final field model.
5. Complete TASK-258-05 after shared TASK-256 style helpers are available where
   needed, then add Appointment Form variants and runtime diagnostics.
6. Complete TASK-258-06 last after code, tests, docs, Playwright report evidence,
   changelog, and board rows are synchronized.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Prefer a dedicated worktree for implementation because this family touches
  public runtime, admin UI, server validation, and docs.
- Stage only `TASK-258*`, Appointment Form owners, explicitly required booking
  runtime/API owners, tests, docs, report, changelog, and board files.
- Do not stage unrelated TASK-256 edits or unrelated Playwright report changes.

## Security Contract

This umbrella may affect the existing public write endpoint
`POST /api/booking/reservations`, but must not introduce a new public endpoint.

- Endpoint visibility: public runtime rendering and existing public reservation
  write; admin editing remains internal.
- Auth model: public reservation writes keep the existing booking access
  evaluator; internal mode stays session/API-key scoped through
  `booking:write`.
- RBAC: unchanged admin page/template/widget-template write permissions.
- CSRF: admin writes keep existing CSRF handling; public reservation writes keep
  the current booking nonce/signature enforcement when the access policy
  requires it.
- Rate-limit bucket: `public_write` for reservation submission; no weaker bucket.
- Reject-unknown validation: widget schema stays `additionalProperties: false`;
  public request bodies must stay allowlisted through booking schemas before
  persistence.
- Anti-abuse: nonce/CAPTCHA remain backend-owned; widget data may expose copy and
  visible controls, but not provider secrets or privileged security config.
- Secret handling: no provider keys, nonce secrets, CAPTCHA secrets, raw tokens,
  or private URLs in widget JSON, browser cache, reports, or changelog notes.

## Testing Requirements

- Docs-only task creation: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
    once that suite exists.
  - `bun test tests/unit/widgets/validator.test.ts` when schema validation
    changes.
  - `bun test tests/unit/server/publicBookingApi.test.ts` when public booking
    payload, nonce, CAPTCHA, or metadata validation changes.
  - `bun test tests/security/codersoSecurityGate.test.ts` when public-write
    hardening, scanner-relevant, nonce, or CAPTCHA behavior changes.
  - `bun run gates:coderso`, `bun run scan:security:strict`, and
    `bun run precommit` before final family closure.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/WIDGETS.md` only if this family changes general widget-mode wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if Appointment Form variant/readiness
  changes affect booking pack completeness.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-258 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-258 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` is fixed
  or explicitly deferred to a named future task with a reason.
- TASK-258 leaves do not duplicate implementation already owned by TASK-256.
- Appointment Form admin preview and public runtime agree on disabled/no-slot,
  selected-slot, loading, success, and error behavior.
- Appointment Form schema/defaults/normalizer/render/editor/tests move together
  for every new user-facing option.
- Public booking write hardening remains backend-owned and tested in the Bun
  route/security lanes when touched.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
