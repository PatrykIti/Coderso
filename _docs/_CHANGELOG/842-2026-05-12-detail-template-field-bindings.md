# 842 - Detail template field bindings

Date: 2026-05-12
Version: Unreleased
Tasks: TASK-253

## Key Changes

### CMS Content/Admin UI

- Added a detail template Data tab that maps selected block prop paths to
  content type entry fields, entry metadata, or existing computed detail-page
  sources.
- Saved detail template drafts now preserve `DetailPageDocument.bindings`
  alongside blocks, so static widget values remain fallback/default content
  while public detail runtime overlays entry-specific values.
- Deleted detail-template blocks now prune stale bindings for removed block ids.

### QA

- Added Vitest coverage for saving detail-template bindings and pruning bindings
  when their target block is deleted.
