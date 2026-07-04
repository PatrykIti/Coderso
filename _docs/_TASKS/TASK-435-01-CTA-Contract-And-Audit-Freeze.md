# TASK-435-01: CTA Contract And Audit Freeze
# FileName: TASK-435-01-CTA-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-435
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Freeze the CTA remediation contract from `_docs/AUDIT/cta-2026-06-10.md`,
recording the real no-op mechanism: `full-width` already resolves to inline
`maxWidth: "none"` via the `toPageSectionStyle` special-case, while
`pageSectionTemplateClass` previously collapsed all CTA variant classes and
`fallbackVariant: "centered"` (`core/services/pages/pageSectionTemplates.ts:92-97`)
makes `centered` render identically to `default`. Define the target published
rendering for each of `default`/`centered`/`full-width` — `centered` must show a
visible alignment/centering difference and `full-width` a true full-bleed
treatment that reconciles (not duplicates or contradicts) the existing line-143
special-case — plus the shared dedicated-control adoption and the matching
Responsive-tab closure hand-off to `TASK-425`.

---

## Sub-Tasks

- [x] TASK-435-01-L01: CTA variant layout and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- CTA runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`


---

## Completion Notes

Completed on 2026-06-16 from the merged Phase 3B section audit (`_TMP_AUDYT_PAGES_EDITOR_V2_FAZA_3B_SCALONY_2026-06-16.md`). Runtime/control evidence, public smoke, and final validation are recorded in changelog 1177 and the task-board closeout. The public smoke used a disposable published page (`/phase3b-smoke-2d0dbd92`) and removed the owned page/user fixture after verification.
