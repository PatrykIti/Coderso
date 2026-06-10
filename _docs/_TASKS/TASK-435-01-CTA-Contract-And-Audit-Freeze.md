# TASK-435-01: CTA Contract And Audit Freeze
# FileName: TASK-435-01-CTA-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-435
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424, TASK-425
**Status:** ⏳ To Do

---

## Overview

Freeze the CTA remediation contract from `_docs/AUDIT/cta-2026-06-10.md`,
especially the currently-broken `centered`/`full-width` runtime semantics, the
shared dedicated-control adoption, and the matching Responsive-tab closure
hand-off to `TASK-425`.

---

## Sub-Tasks

- [ ] TASK-435-01-L01: CTA variant layout and dedicated controls.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- CTA runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

