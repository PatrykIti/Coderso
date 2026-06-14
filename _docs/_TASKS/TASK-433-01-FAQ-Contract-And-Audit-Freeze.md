# TASK-433-01: FAQ Contract And Audit Freeze
# FileName: TASK-433-01-FAQ-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-433
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Freeze the FAQ remediation contract from `_docs/AUDIT/faq-2026-06-10.md`,
preserving the currently-working compact runtime behavior while replacing the
shared dedicated-control drift and explicitly consuming the matching
Responsive-tab closure from `TASK-425`.

---

## Sub-Tasks

- [ ] TASK-433-01-L01: FAQ compact runtime and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- FAQ runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if FAQ semantics change

