# 159-2026-02-07 - Widget template layout settings and runtime preview styling

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-051-03 (partial)

## Summary
- Added template-level layout/appearance settings for widget templates and wired them into runtime preview rendering.

## Key Changes
- Core/DB: added `settings` JSONB to `widget_templates` and `widget_template_revisions` with migration `0032_widget_template_settings.sql`.
- CMS/Widgets: added `widgetTemplateSettings` normalizer and typed settings model shared by services and runtime preview.
- CMS/Widgets: template CRUD/revision/preview services now persist and return normalized template settings.
- CMS/API: widget template create/update validation now accepts strict `settings.layout` payload.
- CMS/Site: widget template runtime preview now applies template wrapper layout settings (background/container/padding/gap) in the same runtime renderer path.
- Admin/UI: template editor now includes `Template layout and appearance` controls (container, max width, padding, gap, background color/image, reset defaults).
- Admin/UI: template canvas reflects wrapper settings to make edit-time preview closer to runtime output.
- Tests: updated template editor and widget template service/revision/preview tests for settings support.
