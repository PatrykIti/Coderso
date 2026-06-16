# TASK-443: Card Block Audit Remediation
# FileName: TASK-443_Card_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediate the Card-block findings from `_docs/AUDIT/card-2026-06-10.md`. The
closed shared-control foundations now provide the media picker, visibility
toggle, responsive panel, and dedicated style/layout widgets for the card
target. This family verifies that adoption and owns the card-specific runtime
residue: safe `image` output above the copy and safe `href` rendering for the
title link.

---

## Sub-Tasks

- [x] TASK-443-01: Card media/link/control contract freeze.
- [x] TASK-443-01-L01: Adopt shared media-picker and dedicated layout/style
      controls while preserving truthful card rendering.
- [x] TASK-443-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Card runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
