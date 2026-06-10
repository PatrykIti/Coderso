# TASK-428: Feature Grid Section Audit Remediation
# FileName: TASK-428_Feature_Grid_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediation family for the Feature Grid section based on
`_docs/AUDIT/feature-grid-2026-06-10.md`. Runtime variant switching already
works, so this family primarily freezes that truthful behavior, closes the
empty Responsive-tab finding called out by the audit, and replaces the
remaining native control drift with the dedicated Page Editor surface.

---

## Sub-Tasks

- [ ] TASK-428-01: Feature Grid variant/control contract freeze.
- [ ] TASK-428-01-L01: Preserve working `cards`/`grid` runtime behavior while
      adopting the shared dedicated controls.
- [ ] TASK-428-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Feature Grid variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

