# TASK-256-05: Structural Widget Report Findings

# FileName: TASK-256-05_Structural_Widget_Report_Findings.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04
**Status:** To Do

---

## Overview

Apply the shared TASK-256 repairs to structural widgets after the shared helpers
land.

This task owns widget-specific fixes for:

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

- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:63,90,104,150-160,173,188-191,215-227`
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:121-125,174-182,190,202,218-224`
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md:37-49,61-120`
- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md:150-171,193-211,264-274`
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:71-72,96,142-147`
- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:63,91,96,117-153`
- `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md:96,106-116,163-170`
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:82,111,124,248`

## Sub-Tasks

- [ ] Fix `grid-columns` slot/config synchronization and cardize Advanced drift.
- [ ] Fix `split-layout` duplicate `None`/`Gap 0`, redundant slot section, and
  Advanced ownership drift.
- [ ] Decide which `stack` pre-test findings are actual contract bugs vs future
  feature requests, then implement only contract repairs.
- [ ] Fix `spacer` fixed/responsive Advanced behavior and custom token UX.
- [ ] Fix `divider` custom spacing UX, inert Advanced variant select, and ARIA.
- [ ] Apply shared slot/ARIA clearups to tabs/accordion/toggle structural
  sections that remain after TASK-256-03/04.

## Files to Change

| Widget | Files and line refs | Required change |
|---|---|---|
| `grid-columns` | `core/widgets/core/gridColumns.tsx:452-503`; `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Public placeholder gating, config/slot sync, Advanced cardize fields hidden/disabled when cardize is off. |
| `split-layout` | `core/widgets/core/splitLayout.tsx:247-270`; `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Public placeholder gating, duplicate zero token cleanup, remove/rework redundant pane slot info, clarify Advanced ownership. |
| `stack` | `core/widgets/core/stack.tsx`; `core/admin/ui/widgets/editors/StackEditors.tsx` | Validate pre-test gaps against contract; avoid adding speculative options unless required by shared guidelines. |
| `spacer` | `core/admin/ui/widgets/editors/SpacerEditors.tsx:46-52,157-205`; `core/widgets/core/spacer.tsx` | Custom token UX and variant-aware Advanced controls. |
| `divider` | `core/admin/ui/widgets/editors/DividerEditors.tsx:61-69,179-217`; `core/widgets/core/divider.tsx` | Custom token UX, remove inert Advanced variant select, separator ARIA. |
| `tabs` | `core/admin/ui/widgets/editors/TabsEditors.tsx:277-302,370-430`; `core/widgets/core/tabs.tsx:432-505` | Slot labels, `inactiveTextColor` editor control, public placeholder gating. |
| `accordion` | `core/admin/ui/widgets/editors/AccordionEditors.tsx:272-430`; `core/widgets/core/accordion.tsx:361-368` | Slot labels, default-open duplication cleanup, clear controls, public placeholder gating. |
| `toggle-block` | `core/widgets/core/toggleBlock.tsx:298-389`; `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | Per-pane placeholder gating and editor mode ownership cleanup. |

## Implementation Pseudocode

```tsx
function applyStructuralWidgetFix(widgetType: StructuralWidgetType, data: unknown) {
  const normalized = normalizeByWidgetType(widgetType, data);
  const repaired = applySharedContractRepairs(widgetType, normalized, {
    clearSemantics: "delete-field",
    publicPlaceholders: "hidden",
    tokenZeroMode: "single-visible-zero-choice",
  });
  return repaired;
}
```

Grid example:

```tsx
function GridColumnsVisualEditor(props: WidgetEditorProps<GridColumnsData>) {
  const slotIds = props.context?.slotTargets?.map((target) => target.slotId) ?? [];
  const value = reconcileColumnConfigsWithSlots(props.value, slotIds);

  return (
    <WidgetEditorSection id="grid-columns.columns" title="Columns">
      {value.columns.map((column, index) => (
        <ColumnConfigRow key={column.slotId} column={column} index={index} />
      ))}
    </WidgetEditorSection>
  );
}
```

Error handling:

- Preserve legacy data that is not currently rendered, but do not let invisible
  config confuse the editor without a warning/sync action.
- If a report asks for a broad new feature, defer it unless it repairs an
  existing broken control.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update validator tests if schemas change.
- Anti-abuse: public renderers must not output admin-only placeholders or
  unsafe href/script values.
- Secret handling: no secrets in diagnostics or widget payloads.

## Testing Requirements

- Update editor waves:
  - `grid-columns-editor-wave.test.tsx`
  - `split-layout-editor-wave.test.tsx`
  - `stack-editor-wave.test.tsx`
  - `spacer-editor-wave.test.tsx`
  - `divider-editor-wave.test.tsx`
  - `tabs-editor-wave.test.tsx`
  - `accordion-editor-wave.test.tsx`
  - `toggle-block-editor-wave.test.tsx`
- Update runtime tests:
  - `gridColumns.test.tsx`
  - `splitLayout.test.tsx`
  - `stack.test.tsx`
  - `spacer.test.tsx`
  - `divider.test.tsx`
  - `tabs.test.tsx`
  - `accordionWidget.test.tsx`
  - `toggleBlock.test.tsx`
- Run targeted Vitest suites, `bun --cwd core lint`, and
  `bun --cwd core lint:types`.

## Documentation Updates Required

- Update touched structural widget docs in `_docs/_WIDGETS/*.md`.
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
