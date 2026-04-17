# 654. TASK-178 generic mutation mapping

Date: 2026-04-17
Version: unreleased
Tasks: TASK-178-05

## Key Changes

### Assistant/Core

- Added a generic CMS operation-to-action mapper.
- Generic operation drafts can now map to existing typed actions for supported pages, content types, custom screens, forms, listing resources, menu items, SEO documents, and widget templates.
- Broad or unsupported mutations return `needs_input` with candidate context instead of guessing or inventing actions.

### Validation

- Added Vitest mapper coverage for generic delete/update/archive drafts.
- Revalidated assistant planner, provider fixture, target resolver, executor, and route smoke tests.
