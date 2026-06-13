# TASK-462-01: Admin Build Boundary Audit And Contract Freeze
# FileName: TASK-462-01-Admin-Build-Boundary-Audit-And-Contract-Freeze.md

**Parent Task:** TASK-462
**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Medium
**Dependencies:** TASK-462
**Status:** ⏳ To Do

---

## Overview

Freeze the real implementation contract before changing code. The build failure
must be treated as runtime-boundary drift, not as a one-off SDK bundling error.

This subtask owns:

- reproducing the current `bun --cwd core build:admin` failure,
- mapping the import paths that bring server-only modules into the admin build,
- separating confirmed leaks from harmless warnings,
- defining the exact module ownership changes that TASK-462-02 must implement,
- recording audit evidence in the task closeout.

---

## Sub-Tasks

- [ ] TASK-462-01-L01: Map admin browser import graph and server-only leaks.

---

## Testing Requirements

- `bun --cwd core build:admin` as the reproduction lane.
- `rg`/source inspection for import ownership.
- `git diff --check` for task/document edits.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-462*.md`
- `_docs/_TASKS/README.md`
- Optional temporary audit notes if the import graph is too large to summarize
  directly in the task closeout.
