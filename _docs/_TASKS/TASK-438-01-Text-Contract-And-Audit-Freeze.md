# TASK-438-01: Text Contract And Audit Freeze
# FileName: TASK-438-01-Text-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-438
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424
**Status:** ⏳ To Do

---

## Overview

Freeze the Text-block remediation contract from `_docs/AUDIT/text-2026-06-10.md`,
including inline-edit ownership, typography ownership, toolbar-label cleanup,
and truthful `plain`/`rich` behavior.

---

## Sub-Tasks

- [ ] TASK-438-01-L01: Text inline-edit, typography, format truthfulness, and
      toolbar labeling.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Text runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

