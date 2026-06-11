# TASK-440-01: Image Contract And Audit Freeze
# FileName: TASK-440-01-Image-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-440
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Freeze the Image-block remediation contract from
`_docs/AUDIT/image-2026-06-10.md`, especially the move from raw URL entry to
the shared media-picker path. The contract must state the ownership boundary
explicitly: TASK-421-02-L02 implements the shared media-picker primitive and
TASK-421-03-L02 the image block panel adoption; this family verifies the Image
target against those surfaces after TASK-421 lands and only owns image-specific
residue (e.g. media-type acceptance metadata) if verification surfaces any.

---

## Sub-Tasks

- [ ] TASK-440-01-L01: Image media picker and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Image runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Image source semantics change

