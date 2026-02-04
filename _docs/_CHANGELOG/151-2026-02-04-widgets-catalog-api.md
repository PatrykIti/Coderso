# 151-2026-02-04 - Widgets catalog API

Date: 2026-02-04
Version: Unreleased
Tasks: TASK-049-03

## Summary
- Added a widget catalog endpoint and template CRUD aliases under `/widgets/templates`.

## Key Changes
- CMS/Widgets: added widget catalog service and `/widgets` route.
- CMS/Widgets: exposed `/widgets/templates` aliases for template CRUD, preview, and revisions.
- Tests: added catalog service unit test and route wiring coverage.
- Docs: documented widget catalog endpoints and payloads.
