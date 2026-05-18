# 847. TASK-258 Appointment Form Widget Follow-Up

**Date:** 2026-05-18
**Version:** Unreleased
**Tasks:** TASK-258, TASK-258-01, TASK-258-02, TASK-258-03, TASK-258-04, TASK-258-05, TASK-258-06

## Key Changes

### Appointment Form runtime and editor contract

- Landed disabled/no-slot parity, loading copy, stale-error reset, and selected
  slot clearing after successful submission.
- Added truthful field visibility, required email/phone controls, split-name
  mode, phone validation, notes limits, autocomplete hints, and accessible form
  naming.
- Added service/resource summary context, locale-aware formatting, safe success
  redirects, widget variants, submit text color, and read-only runtime
  diagnostics.

### Public booking hardening

- Tightened public booking metadata to an allowlisted shape and kept nonce plus
  CAPTCHA behavior backend-owned.
- Added Appointment Form consent controls and the public CAPTCHA bridge without
  exposing secrets in widget data or runtime markup.

### Task routing and closure evidence

- Split new non-local shared/product scope to named follow-ups:
  `TASK-293` for booking flow editor context, `TASK-294` for custom fields, and
  `TASK-256-02` for shared clearable control state indicators.
- Synchronized task board/report status so the Appointment Form family now
  closes findings as fixed or explicitly deferred to named owners.
