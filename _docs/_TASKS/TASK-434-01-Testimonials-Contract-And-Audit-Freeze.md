# TASK-434-01: Testimonials Contract And Audit Freeze
# FileName: TASK-434-01-Testimonials-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-434
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Freeze the Testimonials remediation contract from
`_docs/AUDIT/testimonials-2026-06-10.md`. Audit fact to record: `cards` and
`grid` resolve to identical published geometry (`md:grid-cols-3 auto-rows-fr`
via `pageSectionTemplateColumns` at
`core/services/pages/pageRendererV2.tsx:181-188` and `:210`/`:212`); only the
marker class from `:199` differs and no stylesheet consumes it. Decision:
differentiate `cards` visually — `cards` adds a per-item card surface
(padding/border/shadow) on the published front while `grid` stays flat —
preserving the current marker contract and default single-column behavior,
replacing the shared dedicated-control drift, and explicitly consuming the
matching Responsive-tab closure from `TASK-425`.

---

## Sub-Tasks

- [ ] TASK-434-01-L01: Testimonials variant guard and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Testimonials runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Testimonials semantics change

