# TASK-426-01: Hero Contract And Audit Freeze
# FileName: TASK-426-01-Hero-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-426
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Freeze the Hero-specific remediation contract from `_docs/AUDIT/hero-2026-06-10.md`, including dedicated-control adoption, hero-side accent verification, and the exact published-layout expectations that must remain stable while the control surface changes.

Accent scope to freeze: TASK-439 now owns the fixed accent-to-button binding.
This family only verifies that Hero continues to emit
`--coderso-section-accent` through `toPageSectionStyle` and that the published
button consumes it through `toPageButtonElementStyle`.

This subtask explicitly consumes the matching responsive-panel closure from `TASK-425` so the audit's empty Responsive-tab finding cannot be dropped from the family.

---

## Sub-Tasks

- [x] TASK-426-01-L01: Hero dedicated controls and accent truthfulness.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Hero runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Hero style semantics change


---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
