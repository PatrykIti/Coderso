# 449. TASK-105 Block List Interaction Follow-up

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `BlockList` coverage for inner select button routing, toolbar move/duplicate/delete callbacks, drag-reset state handling, nested-count rendering, and slot dragover acceptance for widget drops.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/pageBuilder/blockList.test.tsx`
- Targeted coverage re-check showed:
  - `BlockList.tsx` -> `90.80%` lines / `74.32%` branches
