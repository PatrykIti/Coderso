# TASK-447: Quote Block Audit Remediation
# FileName: TASK-447_Quote_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Quote-block findings from `_docs/AUDIT/quote-2026-06-10.md`. The
block already persists and renders quote/citation content correctly, so the work
centers on dedicated text/style controls and a small polish pass on toolbar
label truthfulness.

---

## Sub-Tasks

- [ ] TASK-447-01: Quote text/control contract freeze.
- [ ] TASK-447-01-L01: Adopt inline-edit and dedicated controls for quote/cite
      content while normalizing toolbar labeling.
- [ ] TASK-447-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Quote renderer coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

