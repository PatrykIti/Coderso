# TASK-432-01: Comparison Contract And Audit Freeze
# FileName: TASK-432-01-Comparison-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-432
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Freeze the Comparison remediation contract from
`_docs/AUDIT/comparison-2026-06-10.md`, preserving the currently-working
grid/cards runtime behavior while replacing the shared dedicated-control drift
and explicitly consuming the matching Responsive-tab closure from `TASK-425`.

---

## Sub-Tasks

- [ ] TASK-432-01-L01: Comparison runtime guard and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Comparison runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Comparison semantics change

