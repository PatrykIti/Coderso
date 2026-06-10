# TASK-430: Timeline Section Audit Remediation
# FileName: TASK-430_Timeline_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-421, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediate the Timeline-section findings from
`_docs/AUDIT/timeline-2026-06-10.md`. The current section behaves like generic
heading/text content: variants persist only as markers, the front lacks any
timeline-specific layout semantics, the audit also calls out an empty
Responsive tab, and the dedicated control surface is still missing.

---

## Sub-Tasks

- [ ] TASK-430-01: Timeline runtime semantics and variant contract.
- [ ] TASK-430-01-L01: Implement real timeline/milestone layout behavior and
      adopt the dedicated control surface for timeline-specific options.
- [ ] TASK-430-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for timeline markup and variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`
