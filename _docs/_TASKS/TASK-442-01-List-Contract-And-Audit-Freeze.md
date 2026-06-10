# TASK-442-01: List Contract And Audit Freeze
# FileName: TASK-442-01-List-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-442
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422
**Status:** ⏳ To Do

---

## Overview

Freeze the List-block remediation contract from `_docs/AUDIT/list-2026-06-10.md`,
especially the disappearing default-empty list state and the current `ordered`
toggle drift.

---

## Sub-Tasks

- [ ] TASK-442-01-L01: Empty-list persistence, ordered toggle, and shared
      editing surface.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- List runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

