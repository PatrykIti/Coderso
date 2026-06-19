# TASK-471-04: Flexible Badge Widget
# FileName: TASK-471-04-Flexible-Badge-Widget.md

**Parent Task:** TASK-471
**Priority:** Medium
**Category:** Widgets / Core
**Estimated Effort:** Medium
**Dependencies:** TASK-471-01 (text-size `xs`/`2xs`), TASK-336 (widget editor
contract V2)
**Status:** ⏳ To Do

---

## Topic

There is no page-builder badge/pill/chip. This subtask ships a new **dedicated
core widget** `badge` (consistent with the V2 dedicated-widgets vision) that an
author can shape freely: text, color, size, shape, optional icon. It follows the
established atomic-widget contract (divider/spacer templates) and consumes the
`xs`/`2xs` scale from TASK-471-01.

## Current State (summary)

- No `badge` widget; admin-only component `core/admin/components/ui/badge.tsx`
  (do not promote directly).
- Templates: `core/widgets/core/divider.tsx`, `spacer.tsx`; editors
  `core/admin/ui/widgets/editors/DividerEditors.tsx`.
- Registry: `core/widgets/core/index.ts`, `core/widgets/modulePackMatrix.ts`.
- Color/clearable pattern ref: `core/widgets/core/navigation.tsx`.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-471-04-L01 | Badge widget: schema/defaults/normalize, editors, render, tests, pack-matrix, docs | Medium |

## Dependencies / Notes

- Depends on **471-01** (badge sizes). Benefits from 471-02 (align) + 471-03
  (color) but does not block on them.
- Decision (default): atomic, `content` module — confirmed in the leaf/closure.

## Security / Testing / Docs

Introduces validated widget input (colors/icon) — full Security Contract in the
leaf. Product-surface docs (`_WIDGETS/BADGE.md`, pack matrix) in the leaf; rolled
up by TASK-471-05.
