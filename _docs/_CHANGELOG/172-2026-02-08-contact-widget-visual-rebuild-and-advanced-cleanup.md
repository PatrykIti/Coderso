# 172-2026-02-08 - Contact widget visual rebuild and advanced cleanup

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-11-02, TASK-050-11

## Summary
- Finalized Contact editor mode boundaries: Wizard remains onboarding-focused, Visual becomes the primary section-based editing surface, and Advanced is reduced to technical controls and diagnostics.

## Key Changes
- CMS/Widgets: Contact widget now declares `editorCapabilities.visualOwnsVariantSelection = true`, so generic VisualPanel variant controls are suppressed.
- Admin/UI: Rebuilt Contact Visual editor into six sections (variant/layout, fields/required, contact details, map behavior, colors/borders/surface, spacing/columns).
- Admin/UI: Reworked Contact Advanced mode to technical-only scope (map runtime metadata, normalization action, diagnostics snapshot).
- CMS/Widgets: Finalized style model with panel-level surface and border tokens (`surfaceColor`, `borderColor`, `borderWidth`) and runtime output markers.
- Tests: Added/updated regression coverage for Contact visual section rendering and VisualPanel ownership behavior.
- Docs: Updated Contact widget spec and task board statuses for `TASK-050-11` / `TASK-050-11-02` completion.
