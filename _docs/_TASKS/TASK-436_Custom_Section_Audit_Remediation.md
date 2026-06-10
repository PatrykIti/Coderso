# TASK-436: Custom Section Audit Remediation
# FileName: TASK-436_Custom_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Custom-section findings from
`_docs/AUDIT/custom-2026-06-10.md`. Runtime grid behavior already works, so the
remaining job is to preserve that truthful renderer path and replace the native
inspector drift with the shared dedicated control surface.

---

## Sub-Tasks

- [ ] TASK-436-01: Custom variant/control contract freeze.
- [ ] TASK-436-01-L01: Preserve working `grid` runtime behavior while adopting
      the shared dedicated controls.
- [ ] TASK-436-02: Validation, docs, and closure.

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

