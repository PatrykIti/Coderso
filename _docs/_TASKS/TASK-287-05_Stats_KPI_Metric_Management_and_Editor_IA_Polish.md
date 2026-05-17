# TASK-287-05: Stats KPI Metric Management and Editor IA Polish

# FileName: TASK-287-05_Stats_KPI_Metric_Management_and_Editor_IA_Polish.md

**Priority:** Medium
**Category:** Widgets + Stats KPI + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-287, TASK-287-01, TASK-287-02, TASK-287-03
**Status:** To Do

---

## Overview

Polish Stats KPI editor workflows after the content/style/link fields are
stable: metric drag/drop or efficient reorder controls, safer remove/undo or
confirmation, clearer Visual IA grouping, and Stats KPI-local Advanced cleanup
that follows the TASK-256-01 editor-mode policy.

This leaf must preserve the existing keyboard-friendly Move up/Move down
fallback even if drag/drop is added.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:85-88` - U6, U7, U8, U9 editor
  IA issues.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:262` - drag/drop is a medium
  priority issue.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:435-525` - current metric
  repeated item management owner.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:527-619` - current mixed
  text/surface/layout Visual grouping owner.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:624-724` - current
  Advanced duplicate controls owner.
- `_docs/WIDGETS.md:83-88` - Advanced should not duplicate basic Visual
  content/style fields.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Add efficient metric reorder workflow, safer removal recovery/confirmation, split Visual groups into text/style/surface/layout, and align Advanced with TASK-256-01 policy. |
| `core/widgets/core/statsKpi.tsx` | Export focused reorder/remove helpers only if editor tests need pure helper coverage; do not add runtime-only fields for editor state. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover reorder workflow, keyboard fallback, removal recovery/confirmation, Visual group labels, and Advanced cleanup. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Update only if pure helpers or normalized ordering behavior changes. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document editor mode ownership and metric-management behavior. |
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Mark U6/U7/U8/U9 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
function reorderStatsKpiItems(
  items: StatsKpiItem[],
  fromIndex: number,
  toIndex: number
): StatsKpiItem[] {
  const normalized = normalizeStatsKpiItems(items);
  if (fromIndex === toIndex || !normalized[fromIndex] || !normalized[toIndex]) return normalized;
  const next = [...normalized];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return normalized;
  next.splice(toIndex, 0, moved);
  return next;
}

function removeMetricWithUndo(index: number) {
  const removed = current.items[index];
  patchItems(current.items.filter((_, itemIndex) => itemIndex !== index));
  showInlineUndo(() => restoreMetric(index, removed));
}
```

Data flow:

- Reorder and removal update `items` only through the canonical item normalizer.
- Drag/drop, if implemented, is editor-only state and does not persist pointer
  metadata in widget JSON.
- Visual IA groups text/value controls, metric card surfaces, and layout controls
  into separate sections so field ownership is explicit.
- Advanced keeps raw payload/normalization diagnostics and only the technical
  controls allowed by the final TASK-256-01 policy.

Error handling:

- Reorder operations outside item bounds are no-ops.
- The widget must keep at least one metric.
- Undo/confirmation must not resurrect stale unrelated fields or overwrite
  concurrent editor changes.
- Keyboard Move up/Move down buttons remain available and tested even when
  pointer drag/drop exists.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: no persisted editor-only state is added. Any new
  helper fields must be schema-bound in the owner module.
- Anti-abuse: drag/drop and undo state must stay local to admin UI memory and
  must not serialize raw HTML, scripts, class names, or browser-stored secrets.
- Secret handling: no secrets or privileged settings in editor state,
  diagnostics, Playwright evidence, or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx` if pure helper
  exports or normalized ordering behavior changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with U6/U7/U8/U9 evidence or
  deferral notes.
- `_docs/_TASKS/TASK-287-05_Stats_KPI_Metric_Management_and_Editor_IA_Polish.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Metric reordering is efficient for up to 12 metrics and retains keyboard
  fallback controls.
- Removal is recoverable or confirmed, and the one-metric minimum is preserved.
- Visual editor groups text, surface, icon, and layout controls by real product
  ownership.
- Advanced no longer duplicates Visual controls beyond the policy approved by
  TASK-256-01.
