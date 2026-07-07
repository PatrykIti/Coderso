# TASK-519-05-L03: Layout / Structure Editors Alpha Rollout

# FileName: TASK-519-05-L03-Layout-Structure-Cluster.md

**Parent Subtask:** TASK-519-05
**Priority:** High
**Category:** Admin UI / Widget Editors / Verification / Security
**Estimated Effort:** Small
**Dependencies:** 519-03 (upgraded shared widget control).
**Status:** ⏳ To Do

---

## Owned editor files (verification-first; edit only on widening)

In `core/admin/ui/widgets/editors/`:
`GridColumnsEditors.tsx`, `DividerEditors.tsx`, `TabsEditors.tsx`, `AccordionEditors.tsx`,
`ToggleBlockEditors.tsx`, `FeatureGridEditors.tsx`.
Widget normalizers in `core/widgets/core/`: `gridColumns.tsx`, `divider.tsx`, `tabs.tsx`,
`faqAccordion.tsx`, `toggleBlock.tsx`, `featureGrid.tsx` (confirm names via `ls`; `tabs.tsx`
and `faqAccordion.tsx` are confirmed to use `clearableStyle`).

## Procedure

Per parent §"Per-editor verification procedure" for each of the 6: grep
`SharedColorControl` sites, confirm alpha-safe widget normalize, LIVE author `#0812209e`
+ `rgba(8,17,31,.84)` → save → reopen round-trip → publish → front shows alpha.

## Widening exception (expected NONE)

Present-only widening + round-trip test only if a widget drops alpha; name it. Otherwise
record "no widening; all 6 round-trip".

## Security

Boundary unchanged (or widened only to the baseline whitelist). No route/RBAC/migration.

## Result to record

`{ editors: 6, roundTrips: yes, widened: [] }` (or named exceptions).
