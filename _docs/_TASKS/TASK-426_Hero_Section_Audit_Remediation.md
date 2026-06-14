# TASK-426: Hero Section Audit Remediation
# FileName: TASK-426_Hero_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediation family for the Hero section based on `_docs/AUDIT/hero-2026-06-10.md`.
Hero now inserts and renders real content, but every intended dedicated control
still collapses into native primitives, the audit also calls out an empty
Responsive tab for this section, and the remaining hero-specific style
bindings need a truthful closure pass.

Accent premise: the accent CSS-var wiring already EXISTS in source —
`--coderso-section-accent` is emitted from `section.style.accent` at
`core/services/pages/pageRendererV2.tsx:126` and consumed by the button branch
at `:758` — but the cross-parity audit
(`_docs/AUDIT/_cross-parity-2026-06-10.md` Public runtime note) observed accent
`#00ff00` not visibly applied to the hero button on the published front. The
investigation (why the variable does not take effect: variant path, style
emission, specificity) and the accent->button binding fix are owned by TASK-439
(TASK-439-01-L01); this family only re-verifies the hero-side accent flow
(the section truthfully emits `--coderso-section-accent`) after TASK-439 lands.

---

## Sub-Tasks

- [ ] TASK-426-01: Hero runtime/control contract and accent truthfulness.
- [ ] TASK-426-01-L01: Verify the hero panels render the shared TASK-421
      widgets, verify variant behavior on the published front, and re-verify
      the hero-side accent flow after the TASK-439-owned accent->button
      binding fix lands.
- [ ] TASK-426-02: Validation, docs, and closure.

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

