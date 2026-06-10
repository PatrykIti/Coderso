# TASK-437: Heading Block Audit Remediation
# FileName: TASK-437_Heading_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Heading-block findings from `_docs/AUDIT/heading-2026-06-10.md`.
The block already persists and renders correctly, so this family mainly closes
the control-fidelity gap and ensures heading text participates cleanly in the
inline-edit and typography paths.

---

## Sub-Tasks

- [ ] TASK-437-01: Heading text/control contract freeze.
- [ ] TASK-437-01-L01: Adopt inline-edit, typography, and dedicated control
      behavior for heading props without regressing publish/reload parity.
- [ ] TASK-437-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Block renderer coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

