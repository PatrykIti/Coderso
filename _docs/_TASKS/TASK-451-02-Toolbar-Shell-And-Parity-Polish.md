# TASK-451-02: Toolbar Shell And Parity Polish
# FileName: TASK-451-02-Toolbar-Shell-And-Parity-Polish.md

**Parent Task:** TASK-451
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-451-01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Close the remaining shell-level gaps from the cross-parity audit: toolbar-label
truthfulness, add-surface affordances, and preview-dialog parity polish after
the preview URL/environment composition fix from TASK-451-01 lands (the
`/preview` route itself is registered and gated by design).

---

## Sub-Tasks

- [x] TASK-451-02-L01: Normalize preview dialog labels and add-surface
      affordances.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `docs/guide/` Page editor docs

---

## Completion Notes

Completed 2026-06-11: shell/dialog label polish + add-surface affordances landed.
