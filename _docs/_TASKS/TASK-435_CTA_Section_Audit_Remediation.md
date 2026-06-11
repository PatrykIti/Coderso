# TASK-435: CTA Section Audit Remediation
# FileName: TASK-435_CTA_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediation family for the CTA section based on `_docs/AUDIT/cta-2026-06-10.md`.
The section inserts and renders, but CTA variants produce no visible difference
on the published front. Real mechanism (not a pure data-only no-op):
`full-width` already maps to inline `maxWidth: "none"` at
`core/services/pages/pageRendererV2.tsx:143`, a real but class-invisible
difference the audit run did not surface; the class-level no-op comes from
`pageSectionTemplateClass` collapsing every hero/CTA variant to the same
`place-items-center text-center` classes (`pageRendererV2.tsx:206-207`, with
only the inert marker string differing), and `fallbackVariant: "centered"`
(`core/services/pages/pageSectionTemplates.ts:92-97`) makes `centered` render
identically to `default`. The audit also calls out an empty Responsive tab, and
the entire inspector still lacks the dedicated control widgets expected by the
redesign.

---

## Sub-Tasks

- [ ] TASK-435-01: CTA variant runtime contract and control ownership.
- [ ] TASK-435-01-L01: Implement a visible published-front layout difference for
      `centered`/`full-width` and adopt the shared dedicated controls.
- [ ] TASK-435-02: Validation, docs, and closure.

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

