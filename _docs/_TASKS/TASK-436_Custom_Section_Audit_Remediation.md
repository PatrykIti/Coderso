# TASK-436: Custom Section Audit Remediation
# FileName: TASK-436_Custom_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediation family for the Custom section based on
`_docs/AUDIT/custom-2026-06-10.md`. Runtime grid behavior already works, so the
remaining job is to preserve that truthful renderer path, close the empty
Responsive-tab finding from the audit, and replace the native inspector drift
with the shared dedicated control surface.

---

## Sub-Tasks

- [x] TASK-436-01: Custom variant/control contract freeze.
- [x] TASK-436-01-L01: Preserve working `grid` runtime behavior while adopting
      the shared dedicated controls.
- [x] TASK-436-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Custom variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`


---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
