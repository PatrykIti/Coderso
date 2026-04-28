# TASK-105-11-03-05: Server Cluster Bun Ownership Freeze
# FileName: TASK-105-11-03-05_Server_Cluster_Bun_Ownership_Freeze.md

**Priority:** Medium  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-03  
**Status:** To Do

---

## Overview

Document and freeze the remaining `tests/unit/server/*` ownership so contributors do not mistakenly migrate server contract suites that still belong in Bun.

## Acceptance Criteria

1. Each `tests/unit/server/*` suite has an explicit ownership note.
2. The docs make clear why these remain Bun even when they look unit-like.
3. Future migrations stop reopening the same server-runner ambiguity.

## Testing Requirements

- ownership review only unless a suite classification changes

## Documentation Updates Required

- `tests/RUNNER_OWNERSHIP.md`
- `tests/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
