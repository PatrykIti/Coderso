# TASK-424-03: Validation Docs And Text Path Closure
# FileName: TASK-424-03-Validation-Docs-And-Text-Path-Closure.md

**Parent Task:** TASK-424
**Priority:** High
**Category:** Admin UI / Pages / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-424-02
**Status:** ⏳ To Do

---

## Overview

Close the typography family with lane-correct validation, live browser proof on
text-bearing targets, and docs/board/changelog sync for the two-path text-edit
experience.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live text-surface smoke.

---

## Documentation Updates Required

- `docs/guide/` Page editor docs
- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

