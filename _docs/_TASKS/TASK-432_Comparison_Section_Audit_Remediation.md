# TASK-432: Comparison Section Audit Remediation
# FileName: TASK-432_Comparison_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediation family for the Comparison section based on
`_docs/AUDIT/comparison-2026-06-10.md`. Runtime variant switching already
produces a truthful grid layout, so this family focuses on locking that
behavior in tests, closing the empty Responsive-tab finding from the audit,
and removing the remaining dedicated-control drift.

---

## Sub-Tasks

- [ ] TASK-432-01: Comparison variant/control contract freeze.
- [ ] TASK-432-01-L01: Preserve working grid/cards renderer behavior while
      adopting the shared dedicated controls.
- [ ] TASK-432-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Comparison variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

