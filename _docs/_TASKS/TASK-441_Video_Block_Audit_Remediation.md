# TASK-441: Video Block Audit Remediation
# FileName: TASK-441_Video_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Remediate the Video-block findings from `_docs/AUDIT/video-2026-06-10.md`. The
runtime path is real, but the source path remains a raw URL, all three toggle-like props (`autoplay`, `muted`, `visible`) are still native yes/no selects, and the audit also leaves the remaining shared dedicated-control drift (width/align, colors, radius, background type, visibility) in scope through `TASK-421`.

---

## Sub-Tasks

- [ ] TASK-441-01: Video source/toggle/control contract freeze.
- [ ] TASK-441-01-L01: Adopt shared media-picker and switch controls for video
      props while preserving truthful front runtime behavior.
- [ ] TASK-441-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Video runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
