# TASK-462-01: Admin Build Boundary Audit And Contract Freeze
# FileName: TASK-462-01-Admin-Build-Boundary-Audit-And-Contract-Freeze.md

**Parent Task:** TASK-462
**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Medium
**Dependencies:** TASK-462
**Status:** ✅ Done
**Completed:** 2026-06-13

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

- [x] TASK-462-01-L01: Map admin browser import graph and server-only leaks.

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

---

## Closeout Notes

- Reproduced the original admin build failure on HEAD `7e1675e8`: Rolldown
  resolved `@azure/storage-blob` through its browser entry and failed on
  `StorageSharedKeyCredential` from `core/services/media/storage/azure.ts`.
- Confirmed the Azure failure was the first symptom of admin importing server
  runtime data loaders through Page Editor preview/page runtime binding code.
- Read-only agent audits agreed on the primary leaks: page runtime binding,
  listing query/source execution, settings route DTO ownership, password pepper
  status, and media storage adapters.
- Frozen contract rejected final fixes based on Vite externals, aliases,
  `@vite-ignore`, or browser stubs.
