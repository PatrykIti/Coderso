# TASK-424-01: Typography Style Schema And Registry Contract
# FileName: TASK-424-01-Typography-Style-Schema-And-Registry-Contract.md

**Parent Task:** TASK-424
**Priority:** High
**Category:** Admin UI / Pages / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Freeze the Page-owner contract for typography fields and their registry
descriptors before wiring any new inspector UI. This subtask owns the
schema/normalizer/defaults layer for `fontFamily`, `fontSize`, `fontWeight`,
`lineHeight`, `letterSpacing`, and the shared organization of text-style
controls across sections and text-bearing blocks.

---

## Sub-Tasks

- [ ] TASK-424-01-L01: Add normalized typography fields and shared text-control
      descriptors to the Pages owner.

---

## Testing Requirements

- New Vitest coverage for typography style ownership and registry metadata.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/DESIGN_TOKENS.md`

