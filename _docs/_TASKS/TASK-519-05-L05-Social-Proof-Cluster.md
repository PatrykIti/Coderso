# TASK-519-05-L05: Social-Proof Editors Alpha Rollout

# FileName: TASK-519-05-L05-Social-Proof-Cluster.md

**Parent Subtask:** TASK-519-05
**Priority:** High
**Category:** Admin UI / Widget Editors / Verification / Security
**Estimated Effort:** Small
**Dependencies:** 519-03 (upgraded shared widget control).
**Status:** ⏳ To Do

---

## Owned editor files (verification-first; edit only on widening)

In `core/admin/ui/widgets/editors/`:
`TeamEditors.tsx`, `TestimonialsEditors.tsx`, `TimelineEditors.tsx`.
Widget normalizers in `core/widgets/core/`: `team.tsx`, `testimonials.tsx`,
`timeline.tsx` (confirm names via `ls`).

## Procedure

Per parent §"Per-editor verification procedure" for each of the 3: grep
`SharedColorControl` sites, confirm alpha-safe widget normalize, LIVE author `#0812209e`
+ `rgba(8,17,31,.84)` → save → reopen round-trip → publish → front shows alpha.

## Widening exception (expected NONE)

Present-only widening + round-trip test only if a widget drops alpha; name it. Otherwise
record "no widening; all 3 round-trip".

## Security

Boundary unchanged (or widened only to the baseline whitelist). No route/RBAC/migration.

## Result to record

`{ editors: 3, roundTrips: yes, widened: [] }` (or named exceptions). Cluster totals
across L01–L05 = 27 editors.
