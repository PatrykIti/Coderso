# TASK-433: FAQ Section Audit Remediation
# FileName: TASK-433_FAQ_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the FAQ-section findings from `_docs/AUDIT/faq-2026-06-10.md`. FAQ
already inserts, renders, and changes compact layout truthfully on the front,
so the remaining work is to convert its inspector to the dedicated control
surface and keep that truthful variant behavior guarded.

---

## Sub-Tasks

- [ ] TASK-433-01: FAQ variant/control contract freeze.
- [ ] TASK-433-01-L01: Preserve working compact runtime behavior while adopting
      the shared dedicated controls.
- [ ] TASK-433-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for FAQ variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

