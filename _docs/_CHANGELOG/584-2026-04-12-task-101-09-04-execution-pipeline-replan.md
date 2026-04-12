# 584. TASK-101-09-04 execution pipeline replan

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-101-09-04, TASK-101-09-04-01, TASK-101-09-04-02, TASK-101-09-04-03

## Key Changes

### Planning
- Refreshed the action execution task family against the current implementation.
- Clarified that site-kit convergence is already complete and must not be reimplemented in TASK-101-09-04-03.
- Scoped remaining work to formal action registry, conflict/dependency model, persistent idempotency, audit/revision hardening, and targeted helper extraction.

### Test Ownership
- Clarified Vitest ownership for pure registry/diff/helper logic.
- Kept runtime-coupled executor and route verification in Bun until import-time DB/runtime coupling is removed.

### Security
- Documented persistent idempotency requirements, DB migration expectations if storage is added, and advisory nature of registry metadata.
