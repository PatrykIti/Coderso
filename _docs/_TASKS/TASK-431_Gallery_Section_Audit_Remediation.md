# TASK-431: Gallery Section Audit Remediation
# FileName: TASK-431_Gallery_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-421, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediate the Gallery-section findings from
`_docs/AUDIT/gallery-2026-06-10.md`. The section currently renders generic
heading/text content and stores variant changes only as data markers; it does
not yet deliver truthful gallery/card runtime layouts or the expected media-led
control surface.

---

## Sub-Tasks

- [ ] TASK-431-01: Gallery runtime template and media-control contract.
- [ ] TASK-431-01-L01: Implement real gallery/card layout behavior and adopt
      dedicated media, variant, and style controls.
- [ ] TASK-431-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Gallery variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`

