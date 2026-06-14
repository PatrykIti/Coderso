# TASK-425: Page Editor Responsive Panel UX Parity
# FileName: TASK-425_Page_Editor_Responsive_Panel_UX_Parity.md

**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-423, TASK-421
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement the editor-side responsive panel from
`_docs/AUDIT/_cross-responsive-2026-06-10.md`. The underlying breakpoint model
works, but the dedicated Responsive tab is effectively empty: no hide-on-screen
toggle, no mobile-layout toggle, no explicit override list, and the breakpoint
switcher remains icon-only with no width readout.

This family consumes the runtime contract from TASK-423 and surfaces the author
UX needed to manage overrides deliberately instead of discovering them only via
inline badges on unrelated controls.

---

## Sub-Tasks

- [x] TASK-425-01: Responsive panel scope, labels, and override-state contract.
- [x] TASK-425-01-L01: Define panel-owned responsive controls and inherited vs
      override semantics.
- [x] TASK-425-02: Responsive panel widgets and breakpoint affordances.
- [x] TASK-425-02-L01: Implement hide/layout toggles, reset actions, and device
      readouts with dedicated controls.
- [x] TASK-425-03: Validation, docs, and viewport-authoring closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites for responsive controls.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Real browser smoke through `coderso-dev-core-host` and `playwright-cli`.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `docs/guide/` Page editor docs
- `_docs/_TASKS/README.md`

---

## Completion Notes

Family completed 2026-06-11. Responsive tab now owns real content: hide-on-desktop/tablet/mobile switches (existing visibility paths), per-field override list with working resets, NEW section layout.stackVertical (full 4-layer chain + @media emission; forces grid-cols-1 beating template-floored columns), device switcher with labels + px readout (Desktop 1080 / Tablet 744 / Mobile 390) and an editing-scope pill. Live smoke B PASS: hide-on-mobile display:none @390 on the front, stackVertical 1 col @744 via tablet override.
