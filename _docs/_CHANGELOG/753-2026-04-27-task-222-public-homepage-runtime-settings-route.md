# 753 - TASK-222 Public homepage runtime settings route

Date: 2026-04-27
Version: Nextless Runtime
Tasks: TASK-222

## Key Changes

### Public Runtime

- Fixed public `/` so it resolves the configured `site.homepageId` page by ID
  before falling back to ordinary slug-based page routing.
- Preserved the existing public safety rule: homepage output renders only when
  the selected page is published and has a published snapshot.
- Kept homepage HTML cached under the existing `/` cache key.

### Validation

- Added DB-backed Bun runtime coverage proving Settings-selected homepages render
  at `/` even when the page slug is not `/`.
