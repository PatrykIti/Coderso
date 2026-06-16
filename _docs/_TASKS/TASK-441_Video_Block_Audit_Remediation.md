# TASK-441: Video Block Audit Remediation
# FileName: TASK-441_Video_Block_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediate the Video-block findings from `_docs/AUDIT/video-2026-06-10.md`. The
runtime path is real, and the closed shared-control foundations now provide the
media picker plus switch-style controls for video source and booleans. This
family also owned the remaining runtime truthfulness fix: `autoplay` now binds
through the public `<video>` output with muted and `playsInline` browser-policy
companions, while non-autoplay videos preserve manual playback behavior.

---

## Sub-Tasks

- [x] TASK-441-01: Video source/toggle/control contract freeze.
- [x] TASK-441-01-L01: Adopt shared media-picker and switch controls for video
      props and bind `autoplay` (with muted/playsInline autoplay-policy
      companions) plus `title` accessible labeling into the published `<video>`
      render so the controls are truthful end-to-end.
- [x] TASK-441-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Video runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
