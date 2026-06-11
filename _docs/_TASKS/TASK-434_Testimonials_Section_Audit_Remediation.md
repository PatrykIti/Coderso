# TASK-434: Testimonials Section Audit Remediation
# FileName: TASK-434_Testimonials_Section_Audit_Remediation.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediation family for the Testimonials section based on
`_docs/AUDIT/testimonials-2026-06-10.md`. Testimonials already switches runtime
marker classes correctly, but `cards` and `grid` currently resolve to identical
published geometry — both hit `Math.max(columns, 3)` in
`pageSectionTemplateColumns` (`core/services/pages/pageRendererV2.tsx:181-188`,
so `md:grid-cols-3`) and both emit `auto-rows-fr` (`:210`/`:212`), with only the
unconsumed `page-section-template-testimonials-<variant>` marker (`:199`)
differing — so the follow-up report flags the variant-to-front mapping. The
inspector remains entirely native, the audit also flags an empty Responsive tab,
and the section still needs an explicit closure pass around the
cards/grid/default contract: `cards` must gain a visibly distinct published
surface versus `grid`.

---

## Sub-Tasks

- [ ] TASK-434-01: Testimonials variant/control contract freeze.
- [ ] TASK-434-01-L01: Give `cards` a distinct published surface versus `grid`,
      preserve working variant markers/default-column behavior, and adopt the
      shared dedicated controls.
- [ ] TASK-434-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Testimonials variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`

