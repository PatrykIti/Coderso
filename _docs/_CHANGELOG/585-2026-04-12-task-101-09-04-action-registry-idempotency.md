# 585. TASK-101-09-04 action registry and idempotency

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-101-09-04, TASK-101-09-04-01, TASK-101-09-04-02, TASK-101-09-04-03

## Key Changes

### Registry
- Added a formal assistant action registry and handler lookup for every supported action family.
- Replaced hidden preview/execute switch dispatch with registry handlers.
- Added machine-readable `conflicts[]` and `dependencies[]` arrays to preview changes.

### Idempotency
- Added persistent assistant action execution storage in `assistant_action_executions`.
- Execution replay is scoped by idempotency key, actor, plan id, and plan hash.
- Added conflict handling for reusing a key against a different actor/plan/hash.
- Added `db:migrate` and `db:generate` root scripts for Drizzle migrations.

### Validation
- Added Vitest coverage for registry and diff helpers.
- Added Bun coverage for persistent idempotency replay/conflict and route error mapping.
- Applied the new migration locally before rerunning the DB-backed assistant executor test.
