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
The audit also records the Visible control as a switch-to-toggle drift (a
native yes/no select instead of a toggle switch, card-2026-06-10.md:59-64) and
an empty Responsive panel (card-2026-06-10.md:54-57). Ownership boundary: the
dedicated widget primitives and per-block panel adoption are owned by TASK-421
(421-02-L01/L02 primitives, 421-03-L02 block panels), and the empty Responsive
panel content is owned by TASK-425 — this family stays verification-shaped for
the card target after those land, plus card-specific residue only.

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

