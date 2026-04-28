# 165-2026-02-07 - Timeline widget bugfixes and UX hardening

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-050-08-01, TASK-050-08

## Summary
- Expanded Timeline widget to match documented v1 model fields, hardened Wizard flow, and aligned runtime renderer with variant/orientation/label behavior.

## Key Changes
- CMS/Widgets: expanded Timeline data model with step `id` and `accent`, layout `spacing`, style `thickness`, and `background.color`.
- CMS/Widgets: added deterministic step normalization (`3-8` range, unique stable IDs) for legacy and partial payloads.
- CMS/Widgets: Timeline renderer now supports all variants (`milestones`, `cards`, `compact`) with explicit orientation and label-position output markers.
- CMS/Widgets: guides, line style, marker size, line thickness, and color tokens are now applied at runtime.
- Admin/UI: Timeline Wizard now supports documented quick setup (step count, variant, orientation, label position, guides, step titles).
- Admin/UI: Timeline Visual now exposes practical content + layout + line/color editing without leaving Visual mode.
- Admin/UI: Timeline Advanced now includes full step metadata management (add/remove/edit) and full layout/style token controls.
- Tests: expanded `tests/unit/widgets/timeline.test.tsx`, `tests/unit/widgets/renderer.test.tsx`, and `tests/unit/ui/widget-template-editor.test.tsx` for schema/runtime/editor regression coverage.
