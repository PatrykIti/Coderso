# TASK-519-05-L01: Commerce / Booking Editors Alpha Rollout

# FileName: TASK-519-05-L01-Commerce-Booking-Cluster.md

**Parent Subtask:** TASK-519-05
**Priority:** High
**Category:** Admin UI / Widget Editors / Verification / Security
**Estimated Effort:** Small
**Dependencies:** 519-03 (upgraded shared widget control).
**Status:** ⏳ To Do

---

## Owned editor files (verification-first; edit only on widening)

In `core/admin/ui/widgets/editors/`:
`ProductTableEditors.tsx`, `ProductCompareEditors.tsx`, `ProductGalleryEditors.tsx`,
`PricingPlansEditors.tsx`, `CompareTimelineEditors.tsx`, `BookingCalendarEditors.tsx`,
`AppointmentFormEditors.tsx`.
Widget normalizers to check in `core/widgets/core/`: `productTable.tsx`,
`productCompare.tsx`, `productGallery.tsx`, `pricingPlans.tsx`, `compareTimeline.tsx`,
`bookingCalendar.tsx`, `appointmentForm.tsx` (names as present; confirm via `ls`).

## Procedure

Follow the parent subtask §"Per-editor verification procedure" for each of the 7:
grep the `SharedColorControl` sites, confirm the widget normalize routes colors through
`resolveClearableCssColorValue`/`resolveClearableStyleValue` (alpha-safe), then LIVE
author `#0812209e` + `rgba(8,17,31,.84)` → save → reopen round-trip → publish → front
render shows alpha.

## Widening exception (expected NONE)

If any of these widgets uses a bespoke hex-only normalize that drops alpha, apply the
present-only widening + round-trip test per parent §"Widening exception protocol"; name
the editor + widget here. Otherwise record "no widening; all 7 round-trip".

## Security

Per-widget normalize + `resolveClearableCssColorValue` render boundary unchanged (or
widened only to match the baseline whitelist). No route/RBAC/migration.

## Result to record

`{ editors: 7, roundTrips: yes, widened: [] }` (or the named exceptions).
