# 664. TASK-179 assistant cache refresh

Date: 2026-04-17
Version: unreleased
Tasks: TASK-179-07

## Key Changes

### Admin/UI

- Assistant action execution now invalidates known resource-family caches from successful execution results.
- Custom screen mutations executed by the assistant invalidate custom screen list/detail cache keys.
- Existing cache bus subscribers can refresh the current Screens list and Coderso sidebar shortcuts without a full reload.

### Docs

- Updated admin cache docs and cache map for assistant-driven custom screen invalidation.

## Validation

- Added admin client coverage for custom-screen cache invalidation after assistant execute.
