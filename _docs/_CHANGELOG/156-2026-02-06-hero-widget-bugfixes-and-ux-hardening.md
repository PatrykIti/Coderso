# 156-2026-02-06 - Hero widget bugfixes and UX hardening

Date: 2026-02-06
Version: Unreleased
Tasks: TASK-050-05-01

## Summary
- Stabilized Hero media selection, clarified centered media behavior, and improved slot copy semantics in builder details.

## Key Changes
- Admin/UI: fixed Hero media library selection race and stale async overwrite in Wizard/Visual.
- Admin/UI: MediaPicker now shows loading/availability states for selected assets instead of false empty-state flicker.
- CMS/Widgets: centered Hero variant uses selected image as background when no explicit background image is set.
- Admin/UI: Visual CTA labels now match actual single/dual CTA semantics.
- Admin/UI: slot details copy now communicates empty-but-available slots (`Hero Content slot`, `0 items`).
- Tests: added coverage for centered-image rendering, media picker loading state, and slot copy text.
