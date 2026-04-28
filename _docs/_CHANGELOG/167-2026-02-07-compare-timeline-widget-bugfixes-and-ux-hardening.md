# 167-2026-02-07 - Compare timeline widget bugfixes and UX hardening

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-050-09-01, TASK-050-09

## Summary
- Expanded Compare Timeline model and rendering parity, then hardened Wizard/Visual/Advanced editing flows for reliable dual-track setup.

## Key Changes
- CMS/Widgets: Compare Timeline data model now includes layout and highlight metadata (`layout.trackSpacing`, `layout.labelPosition`, `highlight.targetTrackId`) and extended style tokens.
- CMS/Widgets: Added deterministic normalization for axis steps (`3-6`), track IDs (`a`/`b`), marker indexes, and segment ranges (`from <= to`, clamped to axis).
- CMS/Widgets: Runtime renderer now exposes deterministic variant markers and renders highlight segments with configurable guide/layout/style behavior.
- Admin/UI: Wizard now supports full quick setup path (track labels, axis count, marker mapping for both tracks, highlight toggle/target, quick segments).
- Admin/UI: Visual mode now supports practical marker mapping and highlight segment editing with quick style/layout controls.
- Admin/UI: Advanced mode now provides full axis/track/segment editing plus guide/layout/style token control.
- Tests: Added/expanded coverage for compare timeline schema/defaults/normalization, runtime rendering, and template editor integration.
