# TASK-438-02: Text Validation Docs And Closure
# FileName: TASK-438-02-Text-Validation-Docs-And-Closure.md

**Parent Task:** TASK-438
**Priority:** High
**Category:** Pages / Page Editor V2 / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-438-01
**Status:** ⏳ To Do

---

## Overview

Close the Text family with targeted validation, live browser proof, and
docs/board/changelog synchronization.

---

## Sub-Tasks

- [ ] Run the targeted validation set and capture final evidence.
- [ ] Synchronize the owned docs, task-board rows, and changelog coverage.
- [ ] Split any residual drift into explicit follow-up tasks before closure if needed.

## Implementation Pseudocode

```text
1. Exercise the Text block through the final targeted validation set.
2. Run the lane-owned tests plus lint/type checks for the text contract.
3. Replay the browser audit steps and confirm the published front still renders a real `text` block with no unresolved dedicated-control drift.
4. Sync docs, board rows, and changelog evidence before closure.
Validation commands:
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
```

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Text runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` Text smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

