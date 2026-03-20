# 509. TASK-110 assistant settings run reindex action

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-110

## Key Changes

### Assistant Settings
- Added a dedicated `Run reindex` action to `Settings -> Assistant`.
- Reindex now uses a save-first flow so the current assistant settings are persisted before the DB seed is triggered.
- Added inline success and error feedback for the reindex action.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/ui/assistant-settings.test.tsx tests/vitest/admin/assistantClient.test.ts`
