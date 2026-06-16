# TASK-439: Button Block Audit Remediation
# FileName: TASK-439_Button_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediate the Button-block findings from `_docs/AUDIT/button-2026-06-10.md`.
The block already persists and renders a real button, but its label path still
depends on native controls and button-style truthfulness stays open across
editor and front runtime. The accent scope does not come from the button audit
(which contains no accent finding): it comes from
`_docs/AUDIT/_cross-parity-2026-06-10.md` (Public runtime note) and
`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §3.8, which record that section
accent `#00ff00` was not visibly applied to the hero button on the published
front (computed background transparent, text slate) even though the CSS-var
wiring exists in source: `--coderso-section-accent` is emitted from
`section.style.accent` at `core/services/pages/pageRendererV2.tsx:126` and
consumed by the button branch at `:758`. This family owns the accent-application
fix at the button consumption site, including root-causing why the variable does
not take effect (style emission, CSS delivery of the arbitrary-value class,
specificity); TASK-426 (Hero) only re-verifies the hero-side accent flow after
this family lands.

---

## Sub-Tasks

- [x] TASK-439-01: Button label/style/control contract freeze.
- [x] TASK-439-01-L01: Adopt inline-edit and dedicated button controls, prove
      variant/size/target/link behavior stays truthful on the front, and fix
      the accent application so the button visibly consumes
      `--coderso-section-accent` on the published front (audit observed
      computed slate/transparent at `#00ff00`).
- [x] TASK-439-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Button runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

