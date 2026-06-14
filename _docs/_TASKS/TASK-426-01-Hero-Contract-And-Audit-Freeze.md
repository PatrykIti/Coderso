# TASK-426-01: Hero Contract And Audit Freeze
# FileName: TASK-426-01-Hero-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-426
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Freeze the Hero-specific remediation contract from `_docs/AUDIT/hero-2026-06-10.md`, including dedicated-control adoption, hero-side accent verification, and the exact published-layout expectations that must remain stable while the control surface changes.

Accent scope to freeze: the CSS-var binding already exists in source (`--coderso-section-accent` emitted from `section.style.accent` at `core/services/pages/pageRendererV2.tsx:126`, consumed by the button branch at `:758`), yet the cross-parity audit observed accent `#00ff00` not visibly applied on the published front. Root-causing why the variable does not take effect (variant path, style emission, specificity) and fixing the accent->button binding are owned by TASK-439 (TASK-439-01-L01); this family freezes only the hero-side verification — the section truthfully emits `--coderso-section-accent` — to be replayed after TASK-439 lands.

This subtask explicitly consumes the matching responsive-panel closure from `TASK-425` so the audit's empty Responsive-tab finding cannot be dropped from the family.

---

## Sub-Tasks

- [ ] TASK-426-01-L01: Hero dedicated controls and accent truthfulness.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Hero runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Hero style semantics change

