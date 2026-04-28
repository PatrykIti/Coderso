# 510. TASK-111 assistant reindex action decoupled from save

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-111

## Key Changes

### Assistant Settings
- Updated `Run reindex` so it no longer performs an implicit settings save before triggering the assistant DB reindex.
- The action now runs strictly against the already persisted assistant settings state.
- Added an interaction test verifying that `Run reindex` does not call `onSave`.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/ui/assistant-settings.test.tsx tests/vitest/admin/assistantClient.test.ts`
