# TASK-050-13-03: Stats KPI Widget
# FileName: TASK-050-13-03_Stats_KPI_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-13-02  
**Status:** Done (2026-02-08)

---

## Overview

Implement Stats KPI widget for metrics and trust numbers.

---

## Scope

- Widget ID: `stats-kpi`
- Variants: `cards`, `inline`, `split-highlight`
- Model:
  - header: `title`, `description`
  - items[]: `value`, `label`, `description`, `icon`
  - style: `alignment`, `spacing`, `valueColor`, `labelColor`, `divider`
- Wizard: set metric count + values
- Visual: metric cards and typography styling
- Advanced: technical spacing/alignment tokens

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/statsKpi.tsx` | new model/schema/defaults/render | deterministic metrics layout |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | new editors | Visual sections |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register definition | catalog |
| `tests/unit/widgets/statsKpi.test.tsx` | new tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | markers |
| `tests/unit/ui/widget-template-editor.test.tsx` | add editor integration | visual sections |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/statsKpi.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-stats-kpi-widget.md`
