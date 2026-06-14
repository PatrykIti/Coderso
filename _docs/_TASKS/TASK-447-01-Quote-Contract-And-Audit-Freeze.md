# TASK-447-01: Quote Contract And Audit Freeze
# FileName: TASK-447-01-Quote-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-447
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424, TASK-451-02
**Status:** ⏳ To Do

---

## Overview

Freeze the Quote-block remediation contract from
`_docs/AUDIT/quote-2026-06-10.md`, especially the shared inline-edit/typography
paths and the small toolbar-label casing gap (lowercase `quote tools`).
Toolbar-label derivation is owned by TASK-451-02-L01
(`resolveToolbarTargetLabel`); this family only verifies the capitalized
`Quote tools` fallback once the owner lands.

---

## Sub-Tasks

- [ ] TASK-447-01-L01: Quote inline-edit, toolbar labeling, and dedicated
      controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Quote runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if Quote semantics change

