# TASK-519-05-L04: Nav / Footer / Forms Editors Alpha Rollout

# FileName: TASK-519-05-L04-Nav-Footer-Forms-Cluster.md

**Parent Subtask:** TASK-519-05
**Priority:** High
**Category:** Admin UI / Widget Editors / Verification / Security
**Estimated Effort:** Small
**Dependencies:** 519-03 (upgraded shared widget control).
**Status:** ⏳ To Do

---

## Owned editor files (verification-first; edit only on widening)

In `core/admin/ui/widgets/editors/`:
`NavigationEditors.tsx`, `FooterEditors.tsx`, `FormEmbedEditors.tsx`,
`NewsletterEditors.tsx`, `LogoCloudEditors.tsx`.
Widget normalizers in `core/widgets/core/`: `navigation.tsx` (CONFIRMED uses
`resolveClearableCssColorValue` + `resolveClearableStyleValue` :15-16, many color props
:86-95), `footer.tsx`, `formEmbed.tsx`, `newsletter.tsx` (uses `clearableStyle`),
`logoCloud.tsx` (uses `clearableStyle`).

## Procedure

Per parent §"Per-editor verification procedure" for each of the 5: grep
`SharedColorControl` sites, confirm alpha-safe widget normalize, LIVE author `#0812209e`
+ `rgba(8,17,31,.84)` → save → reopen round-trip → publish → front shows alpha.
Note: `navigation.tsx` already applies some colors RAW / via the weaker
`resolveClearableStyleValue` — those STILL persist alpha (passthrough), but the RENDER
path for any theme-derived color must remain `resolveClearableCssColorValue` (do NOT
widen a raw-borderColor seam). This is a render-safety check only, no code change unless
a hex-only normalize is found.

## Widening exception (expected NONE)

Present-only widening + round-trip test only if a widget drops alpha; name it. Otherwise
record "no widening; all 5 round-trip".

## Security

`navigation.tsx` raw-color seams must not be widened to unvalidated theme input; render
stays `resolveClearableCssColorValue`. No route/RBAC/migration.

## Result to record

`{ editors: 5, roundTrips: yes, widened: [] }` (or named exceptions).
