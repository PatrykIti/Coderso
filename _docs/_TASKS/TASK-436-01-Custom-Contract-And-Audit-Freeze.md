# TASK-436-01: Custom Contract And Audit Freeze
# FileName: TASK-436-01-Custom-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-436
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424
**Status:** ⏳ To Do

---

## Overview

Freeze the Custom-section remediation contract from
`_docs/AUDIT/custom-2026-06-10.md`, preserving the currently-working `grid`
runtime behavior while replacing the shared dedicated-control drift.

---

## Sub-Tasks

- [ ] TASK-436-01-L01: Custom grid runtime and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Custom runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Custom semantics change

