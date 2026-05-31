# 843 - Detail template workspace actions

Date: 2026-05-12
Version: Unreleased
Tasks: TASK-254

## Key Changes

### CMS Content/Admin UI

- Added a visible `Collection workspace` action to the content-type editor so
  admins can reach the canonical resource card from the existing
  `/admin/advanced/engine/:id` screen.
- Added collection workspace actions for creating a missing canonical detail
  template from the `Detail page` card and opening the shared builder-style
  editor after route linking.
- Creating a workspace detail template now writes a draft
  `DetailPageDocument`, creates the default content route when needed, and
  links `site.contentRoutes.detailPageId` through the existing Settings owner.
- Added confirmation-based deletion for canonical detail templates; the UI
  clears the matching route link before calling the existing detail-page delete
  endpoint.

### QA

- Added Vitest coverage for create/link and unlink/delete workspace flows,
  content-type editor entry-point rendering, and shared admin notification
  output.
