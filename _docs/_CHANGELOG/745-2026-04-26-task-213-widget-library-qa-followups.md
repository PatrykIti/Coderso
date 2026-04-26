# 745 - TASK-213 Widget Library QA followups

Date: 2026-04-26
Version: unreleased
Tasks: TASK-213, TASK-213-01, TASK-213-01-01, TASK-213-01-02, TASK-213-02, TASK-213-02-01, TASK-213-02-02, TASK-213-03, TASK-213-03-01, TASK-213-03-02, TASK-213-03-03, TASK-213-04, TASK-213-04-01, TASK-213-04-02, TASK-213-04-03, TASK-213-04-04, TASK-213-05, TASK-213-05-01, TASK-213-05-02, TASK-213-06, TASK-213-06-01, TASK-213-06-02, TASK-213-06-03, TASK-213-06-04, TASK-213-06-05, TASK-213-06-06, TASK-213-07, TASK-213-07-01, TASK-213-07-02

## Key Changes

### Widget Library Feedback and IA
- Made core widget cards configuration-first with accessible favorite controls, keyboard activation, view-toggle labels, advanced-mode helper copy, filtered Recommended/All counts, and user-facing module readiness labels.
- Added awaited insert feedback with shared admin success/error toasts and an `Open editor` action for the target page or template.
- Simplified duplicate Favorites signals so the rail has one clear favorites representation.

### Template Lifecycle
- Added create/update save toasts for widget templates.
- Upgraded the Templates tab with a primary `New Template` CTA, row Edit/Duplicate/Delete actions, checkbox selection, confirmed bulk delete, partial-failure feedback, and cache/catalog invalidation.
- Added service-owned duplicate behavior, case-insensitive template-name conflict detection, strict duplicate route validation, and client cache upsert/broadcast handling.
- Made category edit/delete inline modes visually distinct and accessible while preserving row context.

### Widget Editor Fixes
- Fixed the Form Embed Radix Select empty-value crash by using a UI-only sentinel.
- Added completed-empty/error/ready states for Listing Filters and Search Box listing-query selectors.
- Aligned repeatable wizard count behavior for Stats KPI, Logo Cloud, FAQ, and Rich Text Section.
- Added labels/helper copy for audited paired fields in Navigation/Footer/FAQ and related quick setup controls.
- Moved product widget sort controls to shared Select components and added cached collection picking with an ID fallback.
- Added shared MediaPicker-backed Gallery Mosaic quick setup and structured Rich Text Section wizard editing through `body.blocks`.

### Docs and QA
- Updated SUMMARY-WIDGETS closure status, widget docs, widget template docs, CMS API, Admin Cache docs, task statuses, task board counts, and changelog index.
- Validated with core lint, typecheck, full Vitest, targeted widget/admin/editor suites, and DB-backed Bun widget-template route/service suites outside the sandbox.
- Manual Playwright CLI replay was not rerun in this code pass; closure is recorded from code-level fixes plus automated coverage because this repo does not ship a maintained Playwright runner.
