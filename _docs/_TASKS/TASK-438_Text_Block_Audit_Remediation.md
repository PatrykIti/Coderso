# TASK-438: Text Block Audit Remediation
# FileName: TASK-438_Text_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Text-block findings from `_docs/AUDIT/text-2026-06-10.md`. The
block renders and persists, but it still lacks dedicated controls, its toolbar
label leaks placeholder copy, and the `plain`/`rich` contract needs a truthful
closure before the typography and inline-edit work lands broadly.

---

## Sub-Tasks

- [ ] TASK-438-01: Text block content/toolbar/typography contract freeze.
- [ ] TASK-438-01-L01: Adopt inline-edit and dedicated controls while
      normalizing toolbar labeling and `plain`/`rich` behavior.
- [ ] TASK-438-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Text block renderer/format coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if text format semantics change
- `_docs/_TASKS/README.md`

