# 419. TASK-105 Forms Pure Suite Migration

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-03, TASK-105-11-03-04

## Key Changes

### QA / Runner Ownership
- Moved the Bun-free forms contract/helper suites from `tests/unit/forms/*` into `tests/vitest/forms/*`.
- Kept DB-backed forms service/submission suites in Bun.
- Left `formAutomationRunner`, `formRuntimeResolver`, and `submissionNonce` in the refactor-first bucket because they still mix pure behavior with runtime or boundary imports.

### Validation
- Targeted Vitest run passed for the migrated forms suites.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.

### Remaining Focus
- The remaining migration backlog is now concentrated in `search` import-coupling, `server` ownership freeze, and the still-mixed higher-level helper/service suites.
