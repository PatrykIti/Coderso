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
the editor. Ownership boundary: the shared media-picker widget primitive is
implemented by TASK-421-02-L02, the segmented/toggle/slider/swatch primitives
by TASK-421-02-L01/L02, and the per-block image panel adoption by
TASK-421-03-L02 — this family only verifies that the Image target adopts those
shared surfaces after TASK-421 lands and closes image-specific residue. The
audit's empty Responsive panel finding (image-2026-06-10.md:54-57) is owned by
TASK-425; this family only verifies the image target once TASK-425 lands.

---

## Sub-Tasks

- [ ] TASK-440-01: Image source/control contract freeze.
- [ ] TASK-440-01-L01: Verify image source entry resolves through the shared
      TASK-421 media-picker path and that the image panels render the shared
      TASK-421 widgets.
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

