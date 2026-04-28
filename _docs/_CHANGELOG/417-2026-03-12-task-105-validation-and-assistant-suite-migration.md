# 417. TASK-105 Validation And Assistant Suite Migration

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-03, TASK-105-11-03-02

## Key Changes

### QA / Runner Ownership
- Moved all validation schema suites from `tests/unit/validation/*` into `tests/vitest/validation/*`.
- Moved the Bun-free assistant helper/provider/planner slice from `tests/unit/assistant/*` into `tests/vitest/assistant/*`.
- Re-confirmed that the remaining search unit suites are still blocked by import-time DB coupling rather than test-runner syntax alone.

### Validation
- Targeted Vitest run passed for the migrated `validation` and `assistant` suites.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.

### Remaining Focus
- `search` still needs a small code refactor before its pure logic suites can move.
- The next large migration candidates remain `posts` pure editor/model suites and Bun-free `forms` contract/helper suites.
