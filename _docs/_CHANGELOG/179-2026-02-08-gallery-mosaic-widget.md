# 179-2026-02-08 - Gallery mosaic widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-13-02, TASK-050-13, TASK-050

## Summary
- Added new `gallery-mosaic` core widget with deterministic rendering and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `gallery-mosaic` schema, defaults, normalization, and renderer variants (`mosaic`, `uniform-grid`, `feature-left`).
- CMS/Widgets: Added deterministic runtime markers (`data-gallery-mosaic-*`, `data-gallery-media-type`) for preview/runtime assertions.
- Admin/UI: Added `GalleryMosaicEditors` with Visual-first IA for media management, caption behavior, and layout/overlay controls.
- Admin/UI: Registered Gallery Mosaic in core/admin/runtime widget pipelines for template editor and runtime preview.
- Tests: Added dedicated Gallery Mosaic unit tests and extended renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-13-02` as done and moved pack progress to next step `TASK-050-13-03`.
