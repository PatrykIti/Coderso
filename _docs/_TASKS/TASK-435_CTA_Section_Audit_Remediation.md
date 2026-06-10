# TASK-435: CTA Section Audit Remediation
# FileName: TASK-435_CTA_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the CTA-section findings from `_docs/AUDIT/cta-2026-06-10.md`. The
section inserts and renders, but `centered` and `full-width` variants remain
data-only no-ops on the published front, and the entire inspector still lacks
the dedicated control widgets expected by the redesign.

---

## Sub-Tasks

- [ ] TASK-435-01: CTA variant runtime contract and control ownership.
- [ ] TASK-435-01-L01: Implement real `centered`/`full-width` layout behavior
      and adopt the shared dedicated controls.
- [ ] TASK-435-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for CTA variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`

