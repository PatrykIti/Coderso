# 418. TASK-105 Posts Pure Suite Migration

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-03, TASK-105-11-03-03

## Key Changes

### QA / Runner Ownership
- Moved the Bun-free posts editor/model suites from `tests/unit/posts/*` into `tests/vitest/posts/*`.
- Removed the old Bun `block-transforms` duplicate because the stronger Vitest-owned coverage already exists.
- Kept `tests/unit/posts/schema.test.ts` in Bun for DB-backed contract coverage and left `post-block-runtime-renderer.test.tsx` out of the migration because it still imports runtime/media coupling at module load.

### Validation
- Targeted Vitest run passed for the migrated posts editor/model suites.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.

### Remaining Focus
- The next migration candidates are Bun-free forms contract/helper suites.
- The remaining posts Bun test backlog is now the DB/runtime part, not the pure editor/model layer.
