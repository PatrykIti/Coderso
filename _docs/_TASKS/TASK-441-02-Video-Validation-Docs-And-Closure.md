# TASK-441-02: Video Validation Docs And Closure
# FileName: TASK-441-02-Video-Validation-Docs-And-Closure.md

**Parent Task:** TASK-441
**Priority:** Medium
**Category:** Pages / Page Editor V2 / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-441-01
**Status:** ⏳ To Do

---

## Overview

Close the Video family with targeted validation, live browser proof, and
docs/board/changelog synchronization.

---

## Sub-Tasks

- [ ] Run the targeted validation set and capture final evidence.
- [ ] Synchronize the owned docs, task-board rows, and changelog coverage.
- [ ] Split any residual drift into explicit follow-up tasks before closure if needed.

## Implementation Pseudocode

```text
1. Exercise the Video block through the final targeted validation set.
2. Run the lane-owned tests plus lint/type checks for the video contract.
3. Replay the browser audit steps and confirm the published front still renders a real `video` block with no unresolved dedicated-control drift.
4. Closure gate: toggling Autoplay in the editor must change the published `<video>` element (`autoplay` plus the muted/playsinline companions present when on, no `autoplay` attribute when off). The family must not close while `block.props.autoplay` remains a dead prop that never reaches the rendered element.
5. Sync docs, board rows, and changelog evidence before closure.
Validation commands:
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
```

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Video runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` Video smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

