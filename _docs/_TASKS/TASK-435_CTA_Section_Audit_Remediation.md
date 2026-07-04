# TASK-435: CTA Section Audit Remediation
# FileName: TASK-435_CTA_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediation family for the CTA section based on `_docs/AUDIT/cta-2026-06-10.md`.
The section inserts and renders, but CTA variants produced little visible
difference on the published front. Real mechanism (not a pure data-only no-op):
`full-width` already mapped to inline `maxWidth: "none"` through
`toPageSectionStyle`, while `pageSectionTemplateClass` collapsed CTA alignment
classes. The completed remediation keeps `full-width` at `max-width: none` and
gives `default`/`centered`/`full-width` distinct alignment/min-height classes.

---

## Sub-Tasks

- [x] TASK-435-01: CTA variant runtime contract and control ownership.
- [x] TASK-435-01-L01: Implement a visible published-front layout difference for
      `centered`/`full-width` and adopt the shared dedicated controls.
- [x] TASK-435-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for CTA variants.
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
