# TASK-424-02: Typography Panel Widgets And Text Surface IA
# FileName: TASK-424-02-Typography-Panel-Widgets-And-Text-Surface-IA.md

**Parent Task:** TASK-424
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-424-01, TASK-421
**Status:** ⏳ To Do

---

## Overview

Implement the actual Typography surface in the floating inspector and define how
text-style controls are grouped for sections and text-bearing blocks without
reverting to raw form-field sprawl.

---

## Sub-Tasks

- [ ] TASK-424-02-L01: Render dedicated typography controls and shared
      text-surface UX.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites for text-bearing targets.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `docs/guide/` Page editor docs
- `_docs/PAGE_MODEL.md`

