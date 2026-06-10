# TASK-439: Button Block Audit Remediation
# FileName: TASK-439_Button_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Button-block findings from `_docs/AUDIT/button-2026-06-10.md`.
The block already persists and renders a real button, but its label path still
depends on native controls and the audit/follow-up notes leave open accent and
button-style truthfulness across editor and front runtime.

---

## Sub-Tasks

- [ ] TASK-439-01: Button label/style/control contract freeze.
- [ ] TASK-439-01-L01: Adopt inline-edit and dedicated button controls while
      proving variant/size/target/accent behavior stays truthful on the front.
- [ ] TASK-439-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Button runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

