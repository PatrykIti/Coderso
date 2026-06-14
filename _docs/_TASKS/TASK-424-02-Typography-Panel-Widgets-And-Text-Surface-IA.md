# TASK-424-02: Typography Panel Widgets And Text Surface IA
# FileName: TASK-424-02-Typography-Panel-Widgets-And-Text-Surface-IA.md

**Parent Task:** TASK-424
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-424-01, TASK-421
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement the actual Typography surface in the floating inspector and define how
text-style controls are grouped for sections and text-bearing blocks without
reverting to raw form-field sprawl. Panel writes must paint through the
renderer layer (`core/services/pages/pageRendererV2.tsx`, mandatory per the
4-layer rule in `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md:175-182`) on the
same rendered node on both the editor canvas and the published front.

---

## Sub-Tasks

- [x] TASK-424-02-L01: Render dedicated typography controls and shared
      text-surface UX.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites for text-bearing targets.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `docs/guide/` Page editor docs
- `_docs/PAGE_MODEL.md`

---

## Completion Notes

Completed 2026-06-11: Typography panel category rendered only for text-capable block selections; segmented family/size/weight + sliders lineHeight/letterSpacing; textAlign relocated into the group with storage paths unchanged.
