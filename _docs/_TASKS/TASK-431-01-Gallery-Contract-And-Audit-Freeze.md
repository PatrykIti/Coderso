# TASK-431-01: Gallery Contract And Audit Freeze
# FileName: TASK-431-01-Gallery-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-431
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-425
**Status:** ⏳ To Do

---

## Overview

Freeze the Gallery remediation contract from
`_docs/AUDIT/gallery-2026-06-10.md`: Gallery variants currently persist as
markers only and the section still renders generic heading/text content instead
of a truthful gallery/card layout.

---

## Sub-Tasks

- [ ] TASK-431-01-L01: Gallery runtime layout and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Gallery runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

