# TASK-393-02: BC-31-05-02 - Build bounded week dates without duplicates
# FileName: TASK-393-02_BC_31_05_02_Build_Bounded_Week_Dates_Without_Duplicates.md

**Priority:** High
**Category:** Widgets + Booking Calendar + Runtime Security + Admin Preview + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-393
**Status:** Done (2026-06-02)

---

## Overview

Execution-ready leaf task for BC-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_BOOKING_CALENDAR_WIDGET.md` and parent `TASK-393`.

Week picker clamps each of seven dates independently, producing duplicate dates/fetches near min/max bounds.

## Sub-Tasks

- [x] Reproduce BC-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Closure Notes (2026-06-02)

- Added `buildBoundedWeekDates(anchor, policy, today)` in the runtime script and reused it for week buttons, week labels, and availability request dates.
- Added `data-booking-week-date` markers on generated week buttons and regression coverage proving the `2030-01-18` to `2030-01-20` edge renders three unique dates and starts with a unique availability request batch.
- Validation covered by TASK-393 parent changelog 1083.

## Implementation Pseudocode

**Helper/function shape:** Add `buildBoundedWeekDates(anchor, policy, today)` returning unique in-range dates; use it for UI label/buttons and availability requests.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Runtime test: min/max edge has no duplicate buttons or duplicate requests.

## Owner Files

- `core/widgets/core/bookingRuntimeScript.ts`

## Security Contract

Public booking slot endpoints remain public read with signed token/nonce expectations and rate limits. No public write added here, but runtime copy handling is XSS-sensitive. Admin preview remains internal session/RBAC/CSRF scoped and must not expose backend-only settings.

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

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts tests/vitest/admin/bookingCalendarPreview.test.ts tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Runtime test: min/max edge has no duplicate buttons or duplicate requests.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_BOOKING_CALENDAR_WIDGET.md`
- `_docs/_TASKS/TASK-393_Booking_Calendar_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- BC-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
