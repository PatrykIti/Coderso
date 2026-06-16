# TASK-426: Hero Section Audit Remediation
# FileName: TASK-426_Hero_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediation family for the Hero section based on `_docs/AUDIT/hero-2026-06-10.md`.
Hero now inserts and renders real content, but every intended dedicated control
still collapses into native primitives, the audit also calls out an empty
Responsive tab for this section, and the remaining hero-specific style
bindings need a truthful closure pass.

Accent premise: TASK-439 now owns the fixed accent-to-button binding. This
family only replays the hero-side evidence: `toPageSectionStyle` emits
`--coderso-section-accent` from `section.style.accent`, and the published Hero
button consumes that variable through `toPageButtonElementStyle`.

---

## Sub-Tasks

- [x] TASK-426-01: Hero runtime/control contract and accent truthfulness.
- [x] TASK-426-01-L01: Verify the hero panels render the shared TASK-421
      widgets, verify variant behavior on the published front, and re-verify
      the hero-side accent flow after the TASK-439-owned accent->button
      binding fix lands.
- [x] TASK-426-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/renderer coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if hero variant/style semantics change
- `_docs/_TASKS/README.md`


---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
