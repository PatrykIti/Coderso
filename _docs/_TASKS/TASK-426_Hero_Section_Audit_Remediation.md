# TASK-426: Hero Section Audit Remediation
# FileName: TASK-426_Hero_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Hero-section findings from `_docs/AUDIT/hero-2026-06-10.md`.
Hero now inserts and renders real content, but every intended dedicated control
still collapses into native primitives and the remaining hero-specific style
bindings need a truthful closure pass.

---

## Sub-Tasks

- [ ] TASK-426-01: Hero runtime/control contract and accent truthfulness.
- [ ] TASK-426-01-L01: Implement hero-specific control-surface adoption and
      confirm accent/variant behavior on the published front.
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

