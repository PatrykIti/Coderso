# TASK-427-01: Content Contract And Audit Freeze
# FileName: TASK-427-01-Content-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-427
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424
**Status:** ⏳ To Do

---

## Overview

Freeze the Content-section remediation contract from
`_docs/AUDIT/content-2026-06-10.md`, especially the currently-broken
`compact` variant semantics and the shared dedicated-control adoption.

---

## Sub-Tasks

- [ ] TASK-427-01-L01: Content compact variant runtime and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Content runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

