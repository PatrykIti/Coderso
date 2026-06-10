# TASK-440: Image Block Audit Remediation
# FileName: TASK-440_Image_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Remediate the Image-block findings from `_docs/AUDIT/image-2026-06-10.md`. The
runtime path is real, but the block still exposes raw URL entry instead of a
media picker and inherits the same segmented/swatch/toggle drift as the rest of
the editor.

---

## Sub-Tasks

- [ ] TASK-440-01: Image source/control contract freeze.
- [ ] TASK-440-01-L01: Replace raw source entry with the shared media-picker
      path and adopt the dedicated style/layout controls.
- [ ] TASK-440-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Image runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

