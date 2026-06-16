# TASK-441-01: Video Contract And Audit Freeze
# FileName: TASK-441-01-Video-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-441
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Freeze the Video-block remediation contract from
`_docs/AUDIT/video-2026-06-10.md`, especially the shift from raw URL entry and
yes/no selects to the shared media/toggle control surfaces.

---

## Sub-Tasks

- [x] TASK-441-01-L01: Video media picker, toggle controls, and runtime guard.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Video runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Video source semantics change

