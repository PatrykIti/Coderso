# 422. TASK-105 Search Pure Suite Migration

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-03, TASK-105-11-03-01

## Key Changes

### QA / Runner Ownership
- Moved the Bun-free search pure-logic suites from `tests/unit/search/*` into `tests/vitest/search/*`.
- Refactored the `search*` module import paths so pure helpers no longer pull `db/client` at module load time.
- Left `searchHistoryService` in Bun because it is DB-backed.

### Validation
- Targeted Vitest run passed for the migrated search pure-logic suites.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.
- Bun smoke for `searchHistoryService` still requires repo DB env bootstrap and was not runnable in this worktree because `.env` is absent.

### Remaining Focus
- The remaining runner split backlog is now mostly explicit Bun-owned runtime/server/database cases plus a few higher-level mixed service modules that need deeper refactors rather than file moves.
