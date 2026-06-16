# TASK-429: Media Split Section Audit Remediation
# FileName: TASK-429_Media_Split_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-421, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediate the Media Split findings from
`_docs/AUDIT/media-split-2026-06-10.md`. Premise correction (2026-06-16 merged
audit): non-default Media Split variants already changed grid geometry through
`resolvePageSectionTemplateColumns`, but they still lacked a semantic
media-beside-content presentation. The completed remediation keeps the
two-column floor, groups media-bearing child blocks into a media zone, groups
remaining blocks into a content zone, and makes `split` media-first while
`horizontal` is content-first. TASK-425 owns the shared Responsive-tab closure
and TASK-421 owns the shared dedicated control widgets.

---

## Sub-Tasks

- [x] TASK-429-01: Media Split runtime variant and media-surface contract.
- [x] TASK-429-01-L01: Make `split`/`horizontal` visibly distinct with a real
      media-beside-content presentation and verify the shared TASK-421
      media/toggle/color/segmented widgets render for Media Split panels.
- [x] TASK-429-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Media Split variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`


---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
