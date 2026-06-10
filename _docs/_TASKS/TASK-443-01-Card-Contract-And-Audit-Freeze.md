# TASK-443-01: Card Contract And Audit Freeze
# FileName: TASK-443-01-Card-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-443
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Freeze the Card-block remediation contract from
`_docs/AUDIT/card-2026-06-10.md`, especially the shift from raw image URL entry
to the shared media-picker path.

---

## Sub-Tasks

- [ ] TASK-443-01-L01: Card media picker and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Card runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Card media semantics change

