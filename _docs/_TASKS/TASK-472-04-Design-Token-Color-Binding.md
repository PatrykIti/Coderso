# TASK-472-04: Design-Token Color Binding
# FileName: TASK-472-04-Design-Token-Color-Binding.md

**Parent Task:** TASK-472
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Controls
**Estimated Effort:** Medium
**Dependencies:** None (complements TASK-471-03 / TASK-471-04 color sinks)
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Topic

All page color controls accept only raw hex/rgb; there is no affordance to bind a
color to a **site design token** (primary/secondary/accent/…), so brand changes
don't propagate and authors mix raw values with tokens. This subtask adds a
token-aware color control that stores a validated token reference
(`var(--color-<token>)`) or a raw value.

## Current State (summary)

- Color controls use a swatch/color input (`pageEditorControlRegistry.ts:375-392,
  442-450`), sanitized by `sanitizeAuthoringCssColor`.
- Site tokens: `core/services/theme/tokenTypes.ts`; emitted as `--color-*` by
  `core/ui/theme/tokenCss.ts`.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-472-04-L01 | Token-aware color control + allowlist sink | Medium |

## Security / Testing / Docs

Token references must be allowlisted (`var(--color-<known>)`); detail in the leaf;
rolled up by TASK-472-06.
