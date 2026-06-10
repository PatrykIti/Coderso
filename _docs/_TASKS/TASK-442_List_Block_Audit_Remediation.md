# TASK-442: List Block Audit Remediation
# FileName: TASK-442_List_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422
**Status:** ⏳ To Do

---

## Overview

Remediate the List-block findings from `_docs/AUDIT/list-2026-06-10.md`. A
populated list renders correctly, but the default empty list is pruned on save,
which turns a freshly inserted list into an empty page. The block also inherits
the shared `ordered`-toggle control drift.

---

## Sub-Tasks

- [ ] TASK-442-01: Empty-list persistence and ordered-control contract.
- [ ] TASK-442-01-L01: Preserve a freshly inserted list through save/publish
      and adopt inline/dedicated controls for items and ordered state.
- [ ] TASK-442-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- List persistence/runtime coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if empty-state semantics are clarified
- `_docs/_TASKS/README.md`

