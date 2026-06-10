# TASK-450: Group Block Audit Remediation
# FileName: TASK-450_Group_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Remediate the Group-block findings from `_docs/AUDIT/group-2026-06-10.md`. The
runtime path is already real, but `direction`, `wrap`, and `gap` are precisely
the kind of layout controls the redesign was meant to surface as segmented
buttons, toggles, and sliders instead of native primitives.

---

## Sub-Tasks

- [ ] TASK-450-01: Group layout/control contract freeze.
- [ ] TASK-450-01-L01: Adopt dedicated direction, wrap, gap, and shared style
      controls without regressing nested rendering.
- [ ] TASK-450-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Group runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

