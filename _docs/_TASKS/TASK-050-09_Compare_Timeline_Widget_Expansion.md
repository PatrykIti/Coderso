# TASK-050-09: Compare Timeline Widget Expansion
# FileName: TASK-050-09_Compare_Timeline_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** In Progress (2026-02-07)

---

## Overview

Expand the Compare Timeline widget to fully match v1 documentation and align
its editor quality with Hero, Navigation, Footer, and Timeline.

Compare Timeline is a **non-slot** widget focused on dual-track process
comparison, marker mapping, and highlight segments.

Execution is split into two detailed subtasks:

- `TASK-050-09-01` Compare Timeline Widget Bugfixes and UX Hardening (**Done, 2026-02-07**)
- `TASK-050-09-02` Compare Timeline Widget Visual Rebuild and Advanced Cleanup (**To Do**)

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/COMPARE_TIMELINE.md`:

- Axis: `steps[]` with `label` + optional `description`
- Tracks: `label`, `markers`, optional `segments[{ from, to, label }]`
- Highlight: color + label style options
- Guides: `enabled`, `style`
- Layout: track spacing + label position

Notes:
- Keep additive schema changes for compatibility.
- Normalize legacy payloads at runtime/editor boundaries.

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Track labels (A/B)
2) Axis step count (`3-6`)
3) Marker selection for track A
4) Marker selection for track B
5) Highlight segments on/off + target emphasis

Wizard should create safe defaults with deterministic marker/segment rules.

### Visual
- Variant cards (`dual-track` / `dual-track-highlight`)
- Quick marker and segment editing with immediate preview parity
- Section-based IA in final stage (09-02)

### Advanced
- 09-01: full controls available while model stabilizes
- 09-02: technical-only controls (no duplicate content/style from Visual)

---

## Rendering Requirements

Update `CompareTimelineBlock` to:
- render both variants deterministically,
- render highlight segments with normalized ranges,
- respect spacing + label positioning and guide styles.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/compareTimeline.tsx` | expand model + schema + defaults | per docs |
| `core/widgets/core/compareTimeline.tsx` | add marker/segment normalization | deterministic safety |
| `core/widgets/core/compareTimeline.tsx` | update runtime rendering | variants + layout |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | expand wizard flow | complete quick setup |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | rebuild visual + advanced scope | split across 09-01/09-02 |
| `tests/unit/widgets/compareTimeline.test.tsx` | extend tests | schema/defaults/render variants |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | highlight + layout |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | cover variant ownership in Visual | for 09-02 |
| `tests/unit/ui/widget-template-editor.test.tsx` | compare timeline editor integration | visual sections |

---

## Sub-Tasks

- **TASK-050-09-01:** Compare Timeline Widget Bugfixes and UX Hardening  
  Scope: model parity, normalization hardening, renderer correctness, baseline
  editor coverage.
- **TASK-050-09-02:** Compare Timeline Widget Visual Rebuild and Advanced Cleanup  
  Scope: section-based Visual IA, variant ownership in Visual, and technical-only
  Advanced scope.

---

## Testing Requirements

- Unit: schema validates markers, segments, and layout options.
- Unit: renderer handles highlight segments correctly.
- UI: wizard/visual/advanced field coverage.

---

## Documentation Updates Required

- `_docs/_WIDGETS/COMPARE_TIMELINE.md` (final fields + examples)
- `_docs/WIDGETS.md` (if generic summary changes)
