# TASK-432: Comparison Section Audit Remediation
# FileName: TASK-432_Comparison_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediation family for the Comparison section based on
`_docs/AUDIT/comparison-2026-06-10.md`. Runtime variant switching already
produces a truthful grid layout, so this family focuses on locking that
behavior in tests, closing the empty Responsive-tab finding from the audit,
and removing the remaining dedicated-control drift.

---

## Sub-Tasks

- [x] TASK-432-01: Comparison variant/control contract freeze.
- [x] TASK-432-01-L01: Preserve working grid/cards renderer behavior while
      adopting the shared dedicated controls.
- [x] TASK-432-02: Validation, docs, and closure.

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


---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
