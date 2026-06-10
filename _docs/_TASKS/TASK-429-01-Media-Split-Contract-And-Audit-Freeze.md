# TASK-429-01: Media Split Contract And Audit Freeze
# FileName: TASK-429-01-Media-Split-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-429
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-425
**Status:** ⏳ To Do

---

## Overview

Freeze the Media Split remediation contract from
`_docs/AUDIT/media-split-2026-06-10.md`, especially the currently-marker-only
variant behavior and the missing dedicated media/responsive controls.

---

## Sub-Tasks

- [ ] TASK-429-01-L01: Media Split variant layout and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Media Split runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

