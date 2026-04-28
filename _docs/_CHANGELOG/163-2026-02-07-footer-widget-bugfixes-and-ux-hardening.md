# 163-2026-02-07 - Footer widget bugfixes and UX hardening

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-050-07-01, TASK-050-07

## Summary
- Stabilized Footer widget behavior, shipped slot MVP (`column-*` + `bottom`), and hardened Wizard/Visual/Advanced editing to remove destructive link editing paths.

## Key Changes
- CMS/Widgets: added Footer slot definitions `column-1`, `column-2`, `column-3`, and `bottom`.
- CMS/Widgets: Footer runtime now renders slot blocks in each column region and in the bottom legal/actions strip.
- CMS/Widgets: Footer column rendering is normalized by variant (`minimal`=1, `columns-2`=2, `columns-3`=3) with deterministic fallback columns.
- CMS/Widgets: Footer link/social rendering now uses stable keys while preserving compatibility with existing payloads.
- Admin/UI: Footer Wizard now supports practical quick setup (variant, per-column title + first link, legal basics, social basics).
- Admin/UI: Footer Visual now exposes structure summary + legal/social editing without lossy transformations.
- Admin/UI: Footer Advanced now uses structured link/social editing (label + href, add/remove) instead of comma-based parsing.
- Tests: added `tests/unit/widgets/footer.test.tsx` and extended renderer/template editor coverage for Footer slot/runtime/editor behavior.
