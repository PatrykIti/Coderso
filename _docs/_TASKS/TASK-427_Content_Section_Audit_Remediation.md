# TASK-427: Content Section Audit Remediation
# FileName: TASK-427_Content_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Remediation family for the Content section based on
`_docs/AUDIT/content-2026-06-10.md`. The main section-specific bug is that
`variant=compact` produces no visible published-layout change. At HEAD the
renderer ALREADY emits a per-variant marker class plus `content-start` on the
inner content node (`pageSectionTemplateClass` in
`core/services/pages/pageRendererV2.tsx`), but `content-start` is visually
inert on this auto-height grid and the outer `<section>` stays
variant-invariant — that outer node is what the audit measured. So compact
persists and emits an inert class, yet yields no visible layout difference.
The family also closes the shared dedicated-control drift and the empty
Responsive-tab finding called out by the audit.

---

## Sub-Tasks

- [x] TASK-427-01: Content variant runtime contract and control ownership.
- [x] TASK-427-01-L01: Implement a real `compact` runtime/layout effect and
      adopt the shared dedicated inspector controls.
- [x] TASK-427-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for content variants.
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
