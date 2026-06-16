# TASK-440: Image Block Audit Remediation
# FileName: TASK-440_Image_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediate the Image-block findings from `_docs/AUDIT/image-2026-06-10.md`. The
runtime path is real, and the closed TASK-421/TASK-425 foundations now provide
the shared media picker, dedicated segmented/swatch/toggle/slider widgets, and
responsive panel content. This family verifies that the Image target adopts
those shared surfaces and that the existing truthful renderer path stays
covered; it no longer owns a raw-URL media picker migration.

---

## Sub-Tasks

- [x] TASK-440-01: Image source/control contract freeze.
- [x] TASK-440-01-L01: Verify image source entry resolves through the shared
      TASK-421 media-picker path and that the image panels render the shared
      TASK-421 widgets.
- [x] TASK-440-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Image runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
