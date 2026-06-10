# TASK-427-02: Content Validation Docs And Closure
# FileName: TASK-427-02-Content-Validation-Docs-And-Closure.md

**Parent Task:** TASK-427
**Priority:** High
**Category:** Pages / Page Editor V2 / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-427-01
**Status:** ⏳ To Do

---

## Overview

Close the Content family with targeted validation, live published-front proof
for `compact`, and docs/board/changelog sync.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Content runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` Content smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

