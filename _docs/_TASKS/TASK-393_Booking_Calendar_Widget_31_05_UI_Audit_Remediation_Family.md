# TASK-393: Booking Calendar 31-05 UI Audit Remediation Family
# FileName: TASK-393_Booking_Calendar_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Booking Calendar + Runtime Security + Admin Preview + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_BOOKING_CALENDAR_WIDGET.md
**Status:** Done (2026-06-02)

---

## Overview

Close Booking Calendar runtime copy injection, bounded week picker, admin preview, and catalog parity issues.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_BOOKING_CALENDAR_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Booking Calendar. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- BC-31-05-01: Replace runtime `innerHTML` copy composition
- BC-31-05-02: Build bounded week dates without duplicates
- BC-31-05-03: Define admin canvas behavior for runtime-only controls
- BC-31-05-04: Unify admin/public preview catalog filtering

## Sub-Tasks

- [x] [TASK-393-01](TASK-393-01_BC_31_05_01_Replace_Runtime_InnerHTML_Copy_Composition.md): BC-31-05-01 - Replace runtime `innerHTML` copy composition
- [x] [TASK-393-02](TASK-393-02_BC_31_05_02_Build_Bounded_Week_Dates_Without_Duplicates.md): BC-31-05-02 - Build bounded week dates without duplicates
- [x] [TASK-393-03](TASK-393-03_BC_31_05_03_Define_Admin_Canvas_Behavior_For_Runtime_Only_Controls.md): BC-31-05-03 - Define admin canvas behavior for runtime-only controls
- [x] [TASK-393-04](TASK-393-04_BC_31_05_04_Unify_Admin_Public_Preview_Catalog_Filtering.md): BC-31-05-04 - Unify admin/public preview catalog filtering

## Closure Notes (2026-06-02)

- Reproduced the report findings from the audit evidence: runtime string HTML composition, bounded week duplicate dates, empty admin week shell, and admin/public preview catalog filtering drift.
- Replaced Booking Calendar runtime copy composition with DOM node creation and `textContent`, including service context, empty/missing/error copy, and week button labels.
- Added unique bounded week-date generation and `data-booking-week-date` markers so buttons and first availability request batches do not duplicate clamped dates.
- Added an explicit noninteractive admin/runtime boundary for week mode when no slots token is injected in editor preview.
- Moved active linked catalog filtering into shared `buildBookingRuntimeCatalog`, consumed by both admin preview and public runtime resolver.
- Validation: targeted Booking Calendar Vitest suite passed (4 files / 25 tests), adjacent public-render/editor-contract checks passed (3 files / 33 tests), Coderso security gate passed (4 tests), `bun --cwd core lint` passed, `bun --cwd core lint:types` passed, and `git diff --check` passed.

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

Public booking slot endpoints remain public read with signed token/nonce expectations and rate limits. No public write added here, but runtime copy handling is XSS-sensitive. Admin preview remains internal session/RBAC/CSRF scoped and must not expose backend-only settings.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts tests/vitest/admin/bookingCalendarPreview.test.ts tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_BOOKING_CALENDAR_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1083; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
