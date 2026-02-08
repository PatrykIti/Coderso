# 168-2026-02-08 - Compare timeline widget visual rebuild and advanced cleanup

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-09-02, TASK-050-09

## Summary
- Finalized Compare Timeline editor mode boundaries: Wizard is minimal onboarding, Visual is section-based primary editing, and Advanced is technical-only.

## Key Changes
- CMS/Widgets: Compare Timeline widget now declares `editorCapabilities.visualOwnsVariantSelection = true`, so generic Visual variant controls are suppressed.
- CMS/Widgets: Extended Compare Timeline style model with typography tokens (`trackLabelSize`, `stepLabelSize`, `segmentLabelSize`) and applied them in runtime rendering.
- Admin/UI: Rebuilt Compare Timeline Visual editor into six sections: variant structure, axis/labels, markers/segments, highlight/guides, colors/typography, and spacing/layout hints.
- Admin/UI: Simplified Wizard to onboarding scope only (highlight toggle, step count, track labels, marker baseline).
- Admin/UI: Cleaned Advanced mode to technical scope only (layout tokens, raw metadata fields, normalization tooling).
- Tests: Added/updated coverage for visual variant ownership, section-based Visual IA, and technical-only Advanced boundaries.
- Docs: Updated Compare Timeline widget documentation and task board statuses for TASK-050-09 and TASK-050-09-02.
