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
`_docs/AUDIT/media-split-2026-06-10.md`. Re-verify variant -> published-front
behavior live at current HEAD first: non-default variants already force a
two-column grid (`md:grid-cols-2`, plus `items-center` for `horizontal`) and
emit per-variant marker classes per the closed TASK-418-04-L04 contract, so
the freeze must target the genuine gaps — a real media-beside-content
presentation with a visible split-vs-horizontal distinction, and the missing
dedicated media/responsive controls (shared widgets owned by TASK-421,
Responsive panel content owned by TASK-425). If the live front still shows no
variant difference at current HEAD, scope the fix at the actually failing
layer (publish/delivery pipeline), not the renderer that already implements
the mapping.

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

