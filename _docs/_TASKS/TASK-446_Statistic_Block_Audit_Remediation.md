# TASK-446: Statistic Block Audit Remediation
# FileName: TASK-446_Statistic_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Statistic-block findings from
`_docs/AUDIT/statistic-2026-06-10.md`. The value/label/caption path already
renders truthfully, but the toolbar label is content-derived (`0 tools`) and
the block still lacks the dedicated text/style controls needed for a polished
metric-editing flow.

---

## Sub-Tasks

- [ ] TASK-446-01: Statistic text/control and toolbar contract freeze.
- [ ] TASK-446-01-L01: Adopt inline-edit and dedicated controls while
      normalizing toolbar labeling for statistic blocks.
- [ ] TASK-446-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Statistic renderer coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

