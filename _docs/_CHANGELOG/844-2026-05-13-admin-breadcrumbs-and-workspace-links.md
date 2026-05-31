# 844 - Admin breadcrumbs and workspace links

Date: 2026-05-13
Version: Unreleased
Tasks: TASK-255

## Key Changes

### Admin UI

- Added a shared `AdminBreadcrumbs` renderer in `TopBar` so shorthand label
  arrays, structured breadcrumb items, and legacy local breadcrumb JSX render
  consistently with clickable admin links when labels are recognized.
- Updated `AdminShell` to accept structured breadcrumb items, and moved the
  collection workspace breadcrumbs to that format.
- Migrated existing admin page/editor shells to label-array breadcrumbs, moving
  editor status/unsaved indicators into `topbarActions` where old headers mixed
  breadcrumb navigation with document state.

### CMS Content

- Added collection workspace actions for canonical route settings, list pages,
  listing queries, listing templates, and admin screens so admins can jump to
  the owning resource surfaces from one place.
- Listing templates can now be opened directly with
  `/advanced/listings?tab=templates`, and missing listing query actions open the
  new query editor with the current content type ID pre-filled.

### QA

- Added Vitest coverage for clickable admin breadcrumbs, collection workspace
  owner links, Listings templates-tab deep linking, and the entry/post editor
  breadcrumb shell migration.
