# 847 - TASK-293 Gallery Mosaic shared residuals

Date: 2026-05-18
Version: Unreleased
Tasks: TASK-293, TASK-293-01, TASK-293-02, TASK-293-03

## Key Changes

### CMS Widgets

- Reopened the Gallery Mosaic shared-contract baseline after the `TASK-270`
  drift audit showed that several Gallery rows were closed in `TASK-256` docs
  but not fully landed in the live checkout.
- Removed the duplicate Advanced owner surface for current shared Gallery
  style fields, made current media ownership explicit in Visual, and extended
  the shared current-contract Wizard media flow to accept both image and video
  assets.
- Hardened the Gallery Mosaic shared runtime baseline with explicit
  ratio/gap/radius resolvers, semantic `figure` / `figcaption` output, visible
  current video controls, and removal of redundant featured row-span behavior.

### QA and Documentation

- Refreshed `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` and
  `_docs/_WIDGETS/GALLERY_MOSAIC.md` so reopened shared residuals are now
  marked as `TASK-293` fixes and the remaining Gallery Mosaic product backlog
  stays routed to `TASK-270`.
- Synchronized `_docs/_TASKS/TASK-293*.md`, `_docs/_TASKS/README.md`, and this
  changelog index so the reopened shared family is fully closed before
  continuing Gallery Mosaic product work.
