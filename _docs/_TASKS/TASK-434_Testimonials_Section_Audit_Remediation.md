# TASK-434: Testimonials Section Audit Remediation
# FileName: TASK-434_Testimonials_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediation family for the Testimonials section based on
`_docs/AUDIT/testimonials-2026-06-10.md`. Testimonials already had the shared
three-column floor through `resolvePageSectionTemplateColumns`, but `cards`
needed a visibly distinct published surface versus `grid`. The completed
remediation keeps the column contract, wraps testimonial child blocks with card
surfaces for `cards`, preserves flat grid rendering for `grid`, and closes the
shared dedicated-control/Responsive-tab findings.

---

## Sub-Tasks

- [x] TASK-434-01: Testimonials variant/control contract freeze.
- [x] TASK-434-01-L01: Give `cards` a distinct published surface versus `grid`,
      preserve working variant markers/default-column behavior, and adopt the
      shared dedicated controls.
- [x] TASK-434-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Testimonials variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`


---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
