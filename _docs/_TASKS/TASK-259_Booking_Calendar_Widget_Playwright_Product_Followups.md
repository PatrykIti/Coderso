# TASK-259: Booking Calendar Widget Playwright Product Followups

# FileName: TASK-259_Booking_Calendar_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Booking + Admin UI + Runtime + Public Read API + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-10
**Status:** In Progress (2026-05-17)

---

## Overview

Create the widget-specific follow-up backlog for
`_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright reports. This
family deliberately excludes those shared-contract repairs and keeps only the
Booking Calendar product surface that is specific to:

- `core/widgets/core/bookingCalendar.tsx`
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/widgets/core/bookingRuntimeScript.ts`
- `core/server/publicBookingApi.ts`
- `core/services/booking/bookingService.ts`
- `core/services/booking/bookingRuntimeResolver.ts`
- current booking admin cache/client seams when they are needed for editor
  preview data.

The Booking Calendar widget is paired with `appointment-form`, but Appointment
Form product work is tracked by TASK-258. TASK-259 may touch the shared booking
runtime script only for calendar-owned selection, slots, date, or refresh
behavior. It must not implement Appointment Form field, consent, submit,
success, redirect, or public-write behavior.

## Scope Boundary Against TASK-256

In scope for TASK-259:

- Booking Calendar admin canvas preview with resolved booking catalog data.
- Booking Calendar date defaults, date range configuration, and public slots
  past-date safety.
- Service context shown in the calendar: price, duration, description, buffers
  where useful, resource timezone, selected-summary locale/date formatting, and
  user-facing empty-state copy.
- Calendar-owned refresh/loading, skeleton, request cancellation, slot clear,
  and slot density behavior.
- Visual calendar/date navigation and availability count signals when backed by
  booking slots data.
- Booking Calendar layout variants, mobile controls, and selected-slot visual
  style fields.
- Booking Calendar default service/resource dropdowns and runtime diagnostics.
- Booking Calendar source report/docs/changelog/board closure.

Date policy trust boundary:

- Widget-authored `defaultDate`, `minDate`, and `maxDate` fields may shape the
  client UX and admin preview.
- Public API enforcement must come from server-owned policy, service/resource
  settings, or a backend-signed runtime policy. TASK-259 must not trust raw
  client-supplied `minDate`/`maxDate` query parameters as the authority for
  public slot access.

Out of scope for TASK-259:

- Generic editor-mode atomic update helpers, owned by TASK-256-01 only when
  TASK-256-07/TASK-256-08 names a concrete Booking Calendar owner path and test
  lane.
- Generic `Clear`, `none`, token picker, and shared design-token/color-picker
  controls that still need a late physical owner. Booking Calendar's remaining
  generic frame picker row is split to TASK-297 instead of being patched inside
  TASK-259.
- Generic slot/nested-content placeholder gating, owned by TASK-256-03 only when
  TASK-256-07/TASK-256-08 names a concrete Booking Calendar owner path and test
  lane.
- Generic duplicate-ID/scoped-runtime/ARIA repairs for interactive widgets that
  now need a new physical shared owner outside TASK-256 closure. Booking
  Calendar's remaining ARIA row is split to TASK-296. TASK-259 may add labels
  for new Booking Calendar product controls, but it must not claim the report's
  shared ARIA row fixed through a stale TASK-256 reference.
- Generic frame color-picker controls remain shared follow-up scope in TASK-297.
- Booking Availability admin "Add row -> Save schedules" UX from report section
  7.4. That is a Booking admin page workflow, not a widget task; it is now
  split to TASK-298.
- Appointment Form runtime submission, consent, field visibility, or public
  write behavior, owned by TASK-258.

## Source Report Classification Matrix

| Report section/finding | Owner | TASK-259 action |
|---|---|---|
| 4.5, 6, 7.1, recommendation 1: admin preview never receives booking services/resources | TASK-259-01 | Hydrate admin canvas/editor preview from booking catalog data without leaking tokens or secrets. |
| 3.9, 3.10, 5.4, 7.3, recommendations 2, 13, 16: default date, min/max range, and past-date acceptance | TASK-259-02 | Add date defaults/range config and enforce public slots date policy in the route/service lane. |
| 3.2, 3.3, 3.4, 3.11, 5.3, 5.7, recommendations 4, 5, 6, 10: price, duration, description, selected-summary locale/date formatting, timezone, and empty state | TASK-259-03 | Render service/resource context, summary formatting, and make empty state copy widget-owned. |
| 3.5, 3.6, 3.17, 3.18, 5.2, recommendations 7, 8, 15: refresh/loading, skeleton, clear selection, AbortController | TASK-259-04 | Add calendar-owned loading/concurrency/selection UX in the runtime script and renderer markers. |
| 3.1, 3.8, 7.2: visual date navigation, availability signals, and overlapping slot density | TASK-259-05 | Add visual calendar/date navigation, availability signals, and non-overlapping slot density mode. |
| 3.7, 3.13, 3.16, recommendations 12, 14: layout variants, selected/hover styling, mobile controls | TASK-259-06 | Add Booking Calendar variants, mobile control layout, and selected-slot style tokens. |
| 3.15, 4.4, 7.5, recommendation 9: default service/resource raw IDs and stale diagnostics | TASK-259-01 plus TASK-259-07 | Keep preview-catalog truth in TASK-259-01 and editor picker/diagnostic UX in TASK-259-07. |
| 3.12, 5.6, recommendation 3: shared slot/status ARIA baseline | TASK-296 | Excluded from TASK-259 implementation and routed to the new shared physical task. Do not cite TASK-256-04 as fixed for Booking Calendar. |
| 3.14, recommendation 11: generic color picker for frame background/border text fields | TASK-297 | Excluded from TASK-259 implementation and routed to the new shared physical task. |
| 7.4: Booking admin availability "Add row -> Save" UX | TASK-298 | Excluded because it is a Booking admin workflow, not the Booking Calendar widget surface. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Booking Calendar schema/defaults/normalizer/render | `core/widgets/core/bookingCalendar.tsx` | `tests/vitest/widgets/bookingCalendar.test.tsx` | Add data/range/style/variant/service-context render and validator coverage. |
| Booking Calendar editors | `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add default pickers, date-range controls, diagnostics, and style/variant editor coverage. |
| Admin canvas/editor preview hydration | `core/admin/ui/pages/PageEditor.tsx`, `core/admin/ui/pages/builder/BlockList.tsx`, `core/admin/ui/pages/builder/BlockSettings.tsx`, `core/widgets/renderers/widgetRenderer.tsx`, booking admin cached clients | Current page-editor shell tests cover surrounding editor state but mock `BlockList`; current booking client tests cover cached reads | Add `tests/vitest/ui/booking-calendar-admin-preview.test.tsx` as the required real `BlockList -> WidgetRenderer` hydration proof; update page-editor/editor coverage where the preview catalog is loaded or passed to selected editors. |
| Calendar runtime script | `core/widgets/core/bookingRuntimeScript.ts` | Appointment/booking widget render tests indirectly cover markers | Add a focused happy-dom runtime script suite for Booking Calendar refresh, abort, clear selection, and slot state. |
| Public slots endpoint and service | `core/server/publicBookingApi.ts`, `core/server/routes/bookingRoutes.ts`, `core/server/validation/bookingSchemas.ts`, `core/services/booking/bookingService.ts`, `core/services/booking/bookingSlotsToken.ts` | `tests/unit/server/publicBookingApi.test.ts`, `tests/unit/booking/bookingService.test.ts`, `tests/integration/routes/bookingRoutes.test.ts` | Add past-date/range/non-overlap assertions in the Bun-owned DB/route lanes and extend `tests/vitest/validation/bookingSchemas.test.ts` with `bookingPublicSlotQuerySchema` coverage before relying on it for public slot proof. |
| Widget docs/report | `_docs/_WIDGETS/BOOKING_CALENDAR.md`, `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` | docs diff checks | Update fixed/deferred evidence and final Booking Calendar contract. |

## Sub-Tasks

- [ ] TASK-259-01: Booking Calendar Admin Preview Runtime Catalog Parity
- [ ] TASK-259-02: Booking Calendar Date Defaults, Range, and Past-Date Safety
- [ ] TASK-259-03: Booking Calendar Service Context and Timezone Copy
- [ ] TASK-259-04: Booking Calendar Loading, Concurrency, and Selection UX
- [ ] TASK-259-05: Booking Calendar Availability Calendar and Slot Density
- [ ] TASK-259-06: Booking Calendar Layout Variants and Mobile Styling
- [ ] TASK-259-07: Booking Calendar Default Pickers and Diagnostics
- [ ] TASK-259-08: Booking Calendar Report, Docs, and Closure

## Implementation Order

1. Keep residual shared/admin rows out of widget scope by referencing the
   physical follow-up tasks TASK-296, TASK-297, and TASK-298 before
   implementing TASK-259 fixes.
2. Complete TASK-259-01 first because preview catalog data is also useful for
   editor default pickers and diagnostics.
3. Complete TASK-259-02 before calendar availability signals so date range
   rules and public API safety are stable.
4. Complete TASK-259-03 before visual calendar/slot density work so service and
   timezone labels have final normalized data.
5. Complete TASK-259-04 before TASK-259-05 because visual calendar requests must
   reuse the final request cancellation/loading behavior.
6. Complete TASK-259-05 after date and request behavior are stable.
7. Complete TASK-259-06 and TASK-259-07 after the data model is stable.
8. Complete TASK-259-08 last after code, tests, report evidence, docs,
   changelog, and task-board rows are synchronized.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Prefer a dedicated worktree for implementation because this family touches
  public runtime, admin UI, route/service behavior, and shared booking runtime
  script code that may overlap with TASK-258.
- Stage only `TASK-259*`, Booking Calendar owners, explicitly required booking
  runtime/API/service owners, tests, docs, report, changelog, and board files.
- Do not stage TASK-257, TASK-258, TASK-256, Appointment Form, or unrelated
  Playwright report changes unless the user explicitly combines those scopes.

## Security Contract

This umbrella may affect the existing public read endpoint
`GET /api/booking/slots`, but must not introduce a weaker public endpoint.

- Endpoint visibility: public runtime read for slot lookup; admin editing and
  booking catalog management remain internal.
- Auth model: public slot reads keep the existing booking access evaluator;
  internal mode stays session/API-key scoped through `booking:read`.
- RBAC: unchanged for admin page/editor access; new admin preview reads must use
  existing admin booking read permissions or existing cached admin clients.
- CSRF: unchanged for reads; no public write path is introduced.
- Rate-limit bucket: `public_read` for public slot reads; no weaker bucket.
- Reject-unknown validation: widget schema stays `additionalProperties: false`;
  public query schemas must stay allowlisted before service execution.
- Anti-abuse: runtime slot tokens remain backend-owned when captcha/access policy
  requires them; visual calendar availability requests must be bounded by date
  range and rate limits.
- Date policy authority: public slot reads must enforce past-date and booking
  window limits from server-owned settings or a backend-signed runtime policy,
  not from raw client-supplied widget range fields.
- Secret handling: no slots token secrets, nonce secrets, provider credentials,
  private URLs, or raw privileged diagnostics in widget JSON, browser cache,
  Playwright reports, or changelog notes.

## Testing Requirements

- Docs-only task creation: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - Create or extend
    `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`, then
    run `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
    for runtime script changes.
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
  - `bun test tests/unit/server/publicBookingApi.test.ts` when public slots
    query, route error mapping, token, or date validation changes.
  - `bun test tests/unit/booking/bookingService.test.ts` when slot generation,
    date policy, or interval/non-overlap behavior changes.
  - `bun run test:vitest -- tests/vitest/validation/bookingSchemas.test.ts`
    when route/admin schemas change. Extend this suite with
    `bookingPublicSlotQuerySchema` coverage before using it as public slot
    proof.
  - Extend
    `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` with
    linked Appointment Form event-consumption assertions when the shared runtime
    selection payload changes.
  - `bun run gates:coderso`, `bun run scan:security:strict`, and
    `bun run precommit` before final family closure.

DB-backed Bun tests require `DATABASE_URL`; load repo env first with
`set -a && source .env && set +a`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`
- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/WIDGETS.md` only if this family intentionally changes the general
  widget-mode contract, not for Booking Calendar-only fields.
- `_docs/WIDGET_PACK_MATRIX.md` only if Booking pack readiness/completeness
  changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-259 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-259 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every Booking Calendar report finding is fixed, excluded to TASK-258,
  excluded to TASK-296/TASK-297/TASK-298, or deferred to a named future task
  with a reason.
- Booking Calendar schema, defaults, normalizer, render, editor, runtime script,
  tests, and docs move together for every new product field.
- Public slot reads reject or omit disallowed past/out-of-range dates through
  the route/service contract when the restriction is server-owned or signed,
  not only through client-side input attributes.
- Admin canvas/editor preview and public runtime use the same booking catalog
  shape without exposing private tokens or secrets.
- TASK-259 does not weaken shared clear, mode, placeholder, ARIA, or public
  write contracts owned by TASK-256/TASK-258.
