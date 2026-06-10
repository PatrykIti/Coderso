# TASK-443: Card Block Audit Remediation
# FileName: TASK-443_Card_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Remediate the Card-block findings from `_docs/AUDIT/card-2026-06-10.md`. The
block already renders real content, but its image path still uses raw URL entry
and the inspector has no dedicated media, swatch, slider, or segmented surface.

---

## Sub-Tasks

- [ ] TASK-443-01: Card media/link/control contract freeze.
- [ ] TASK-443-01-L01: Adopt shared media-picker and dedicated layout/style
      controls while preserving truthful card rendering.
- [ ] TASK-443-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Card runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

