# 160-2026-02-07 - Admin page layout settings and runtime preview unification

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-051-03, TASK-051

## Summary
- Completed admin UX layer for page-level layout settings and unified runtime preview behavior across page/content/template editors.

## Key Changes
- Admin/UI: added `Page settings` drawer sections for template/navigation, layout and appearance, and default widget layout.
- Admin/UI: added reset-to-defaults and `applyDefaultsToNewBlocks` toggle in page settings.
- Admin/UI: page editor canvas now applies page wrapper settings (container/max-width/padding/background/section gap).
- Admin/UI: new block insertion in page editor can apply page defaults when enabled.
- Admin/UI: introduced shared `RuntimePreviewDialog` (device switcher + unified loading/error/empty states).
- Admin/UI: page editor and content entry editor now open runtime preview in shared dialog instead of opening new tabs.
- Admin/UI: widget template preview dialog now reuses shared runtime preview dialog.
- CMS/Pages: page settings drawer writes layout/template/navigation into `page.data.settings`.
- Tests: added/updated unit/integration coverage for page settings drawer and runtime preview parity across editors.
- Docs: updated task statuses and preview/page/widget API/model docs for 051-03 completion.
