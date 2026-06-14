# TASK-448: Container Block Audit Remediation
# FileName: TASK-448_Container_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Remediate the Container-block findings from
`_docs/AUDIT/container-2026-06-10.md`. Container already persists and renders,
so this family focuses on bringing nested-layout control surfaces in line with
the redesign while preserving the working runtime structure that acts as the
control case for `columns`.

---

## Sub-Tasks

- [ ] TASK-448-01: Container layout/control contract freeze.
- [ ] TASK-448-01-L01: Adopt dedicated container controls without regressing
      nested layout persistence or front rendering.
- [ ] TASK-448-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Nested layout/runtime coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

