# TASK-450-01: Group Contract And Audit Freeze
# FileName: TASK-450-01-Group-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-450
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Freeze the Group-block remediation contract from `_docs/AUDIT/group-2026-06-10.md`,
especially the heaviest remaining segmented/toggle/gap control drift around
direction, wrap, and group gap.

---

## Sub-Tasks

- [ ] TASK-450-01-L01: Group direction, wrap, gap, and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Group runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Group semantics change

