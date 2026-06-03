# 1084 - Appointment Form widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-394, TASK-394-01, TASK-394-02, TASK-394-03, TASK-394-04, TASK-394-05

## Key Changes

### CMS Widgets / Appointment Form

- Booking runtime rebinding is now idempotent when Booking Calendar and
  Appointment Form inline scripts run in either DOM order.
- Booking Calendar service options now expose `submissionAccess`, and
  Appointment Form scopes captcha/nonce behavior to the selected service.
- Appointment Form success copy now prefers the widget-authored success message
  over the public API runtime default.
- Appointment Form field bounds are shared through a pure contract module and
  applied to widget schema, renderer/runtime payload shaping, and public booking
  API validation.

### Public Booking API / Security

- Public booking reservation submit now regenerates server availability and
  requires exact `startsAt` / `endsAt` slot match before persistence.
- Added a public API regression for valid nonce plus client-invented slot
  duration returning `booking_slot_unavailable`.

### QA / Docs

- Added focused widget/runtime regressions for DOM-order rebinding, mixed
  public/internal captcha scoping, widget-first success copy, field bounds, and
  Booking Calendar `submissionAccess` projection.
- Re-ran Appointment Form target suites, adjacent Booking Calendar/shared
  runtime smoke tests, Bun public booking API tests, the Coderso security gate,
  lint, typecheck, Semgrep, Gitleaks worktree, Trivy secret scans, and
  whitespace diff checks.
- Updated Appointment Form and Booking Calendar widget docs, the 31-05 audit
  report/index, task board, and task closure notes.
