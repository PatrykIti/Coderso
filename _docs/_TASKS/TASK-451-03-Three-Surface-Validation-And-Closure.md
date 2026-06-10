# TASK-451-03: Three Surface Validation And Closure
# FileName: TASK-451-03-Three-Surface-Validation-And-Closure.md

**Parent Task:** TASK-451
**Priority:** High
**Category:** Pages / Preview / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-451-02
**Status:** ⏳ To Do

---

## Overview

Close the parity family with a fresh 3-surface replay: canvas, preview, and
front must all render truthfully, and the cross-parity shell observations must
be updated with final evidence.

---

## Testing Requirements

- Relevant Bun preview/runtime suites.
- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` three-surface replay.

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

