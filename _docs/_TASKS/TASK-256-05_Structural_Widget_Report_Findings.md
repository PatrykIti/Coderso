# TASK-256-05: Structural Widget Report Findings

# FileName: TASK-256-05_Structural_Widget_Report_Findings.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04
**Status:** To Do

---

## Overview

Apply the shared TASK-256 repairs to structural widgets after the shared helpers
land.

This parent task owns structural-widget decomposition and sequencing. Execute
the physical child leaves below; do not implement this parent as one broad
patch.

This task family owns widget-specific fixes for:

- `section`
- `grid-columns`
- `split-layout`
- `stack`
- `spacer`
- `divider`
- structural parts of `tabs`, `accordion`, and `toggle-block` not already
  covered by TASK-256-03/04

Do not implement this leaf by broad refactor. Keep schema/defaults/normalizers,
renderers, editors, tests, and docs together per widget.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:252,270,280-298`
- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:63,90,104,150-160,173,188-191,215-227`
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:121-125,174-182,190,202,218-224`
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md:37-49,61-120`
- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md:150-171,193-211,264-274`
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:71-72,96,142-147`
- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:63,91,96,117-153`
- `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md:96,106-116,163-170`
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:82,111,124,248`

## Sub-Tasks

- [ ] TASK-256-05-01: Section and Grid Columns Structural Findings.
- [ ] TASK-256-05-02: Split Layout and Stack Variant Data Sync.
- [ ] TASK-256-05-03: Spacer and Divider Token Control Findings.
- [ ] TASK-256-05-04: Tabs, Accordion, and Toggle Block Structural Residuals.

## Files to Change

| Child | Widget scope | Primary owner files | Required change |
|---|---|---|---|
| TASK-256-05-01 | `section`, `grid-columns` | `core/widgets/core/section.tsx`; `SectionEditors.tsx`; `core/widgets/core/gridColumns.tsx`; `GridColumnsEditors.tsx` | Hide public placeholders, validate section anchors/default tokens, sync grid slots/config, and classify public column labels as editor metadata unless a caption field is intentionally added. |
| TASK-256-05-02 | `split-layout`, `stack` | `core/widgets/core/splitLayout.tsx`; `SplitLayoutEditors.tsx`; `core/widgets/core/stack.tsx`; `StackEditors.tsx` | Repair variant-bound ratio/direction data sync, duplicate zero-token choices, and redundant Advanced controls. |
| TASK-256-05-03 | `spacer`, `divider` | `core/widgets/core/spacer.tsx`; `SpacerEditors.tsx`; `core/widgets/core/divider.tsx`; `DividerEditors.tsx` | Repair fixed/responsive Advanced behavior, custom token UX, inert variant select, and divider ARIA. |
| TASK-256-05-04 | `tabs`, `accordion`, `toggle-block` | `core/widgets/core/tabs.tsx`; `TabsEditors.tsx`; `core/widgets/core/accordion.tsx`; `AccordionEditors.tsx`; `core/widgets/core/toggleBlock.tsx`; `ToggleBlockEditors.tsx` | Apply remaining slot-label, clear-control, placeholder, default-open/collapsible, and interactive structural residuals after TASK-256-03/04. |

## Implementation Pseudocode

Parent orchestration shape:

```tsx
type StructuralLeafId =
  | "TASK-256-05-01"
  | "TASK-256-05-02"
  | "TASK-256-05-03"
  | "TASK-256-05-04";

function selectStructuralLeaf(widgetType: string): StructuralLeafId {
  if (widgetType === "section" || widgetType === "grid-columns") return "TASK-256-05-01";
  if (widgetType === "split-layout" || widgetType === "stack") return "TASK-256-05-02";
  if (widgetType === "spacer" || widgetType === "divider") return "TASK-256-05-03";
  return "TASK-256-05-04";
}
```

Error handling:

- Preserve legacy data that is not currently rendered, but do not let invisible
  config confuse the editor without a warning/sync action.
- If a report asks for a broad new feature, defer it unless it repairs an
  existing broken control.
- Keep child leaf write scopes disjoint. If a shared helper change is required,
  land it in TASK-256-01/02/03/04 before the child leaf mutates widget files.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update validator tests if schemas change.
- Anti-abuse: public renderers must not output admin-only placeholders,
  duplicate DOM IDs, unsafe inline scripts, or privileged/debug identifiers.
- Secret handling: no secrets in diagnostics or widget payloads.

## Testing Requirements

- Update editor waves through the child leaves:
  - `tests/vitest/ui/section-editor-wave.test.tsx`
  - `tests/vitest/ui/grid-columns-editor-wave.test.tsx`
  - `tests/vitest/ui/split-layout-editor-wave.test.tsx`
  - `tests/vitest/ui/stack-editor-wave.test.tsx`
  - `tests/vitest/ui/spacer-editor-wave.test.tsx`
  - `tests/vitest/ui/divider-editor-wave.test.tsx`
  - `tests/vitest/ui/tabs-editor-wave.test.tsx`
  - `tests/vitest/ui/accordion-editor-wave.test.tsx`
  - `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- Update runtime tests through the child leaves:
  - `tests/vitest/widgets/section.test.tsx`
  - `tests/vitest/widgets/gridColumns.test.tsx`
  - `tests/vitest/widgets/splitLayout.test.tsx`
  - `tests/vitest/widgets/stack.test.tsx`
  - `tests/vitest/widgets/spacer.test.tsx`
  - `tests/vitest/widgets/divider.test.tsx`
  - `tests/vitest/widgets/tabs.test.tsx`
  - `tests/vitest/widgets/accordionWidget.test.tsx`
  - `tests/vitest/widgets/toggleBlock.test.tsx`
- Run targeted Vitest suites, `bun --cwd core lint`, and
  `bun --cwd core lint:types`.

## Documentation Updates Required

- Update touched structural widget docs in `_docs/_WIDGETS/*.md`, including
  `_docs/_WIDGETS/SECTION.md` when section behavior changes.
- Update structural Playwright reports with fixed/deferred status.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if readiness changes.

## Acceptance Criteria

- Structural widget controls either affect runtime output or are hidden/disabled
  with clear explanation.
- Public runtime output is free of admin-only empty-slot placeholders.
- Duplicate zero/off-token choices are resolved consistently.
- Tabs/accordion/toggle structural editors use user-facing labels instead of
  technical slot IDs.
- Tests and reports prove the fixed behavior per widget.
