# TASK-050-08: Timeline Widget Expansion
# FileName: TASK-050-08_Timeline_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** In Progress (2026-02-07)

---

## Overview

Expand the Timeline widget to fully match the v1 documentation and align its
editing quality with Hero, Navigation, and Footer.

Timeline is a **non-slot** widget focused on process steps, orientation,
line/marker styling, and guide readability.

Execution is split into two detailed subtasks:

- `TASK-050-08-01` Timeline Widget Bugfixes and UX Hardening (**Done, 2026-02-07**)
- `TASK-050-08-02` Timeline Widget Visual Rebuild and Advanced Cleanup (**To Do**)

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/TIMELINE.md`:

- Steps: `id`, `title`, `description`, `icon`, `accent`
- Layout: `orientation`, `align`, `spacing`, `labelPosition`
- Guides: `enabled`, `style`
- Line/markers: `lineStyle`, `thickness`, `markerSize`
- Background: `color`

Notes:
- Keep additive schema changes for compatibility.
- Normalize legacy payloads at runtime/editor boundary.

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Count of steps (3–8)
2) Variant (milestones / cards / compact)
3) Orientation (horizontal / vertical)
4) Label position (top / bottom)
5) Guides on/off

Wizard should create placeholder steps with stable IDs.

### Visual
- Preview per variant
- Only show fields relevant to selected variant
- In final state, Timeline owns variant controls in Visual (no duplicate generic picker)

### Advanced
- 08-01: full controls available while model stabilizes
- 08-02: technical-only controls (no duplicate content/style from Visual)

---

## Rendering Requirements

Update `TimelineBlock` to:
- Render variants correctly (`milestones`/`cards`/`compact`)
- Respect orientation + label position
- Apply guides + line styles + marker sizing/thickness

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/timeline.tsx` | expand data model + schema + defaults | per docs |
| `core/widgets/core/timeline.tsx` | update runtime render variants | layout + guides + style |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | expand wizard flow | per docs |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | rebuild visual + advanced scope | split across 08-01/08-02 |
| `tests/unit/widgets/timeline.test.tsx` | extend tests | schema/defaults/render variants |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | orientation + labels |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | cover variant ownership in Visual | for 08-02 |
| `tests/unit/ui/widget-template-editor.test.tsx` | timeline editor integration | visual sections |

---

## Sub-Tasks

- **TASK-050-08-01:** Timeline Widget Bugfixes and UX Hardening  
  Scope: data model parity, renderer correctness, wizard hardening, baseline
  tests.
- **TASK-050-08-02:** Timeline Widget Visual Rebuild and Advanced Cleanup  
  Scope: section-based Visual IA, variant ownership in Visual, and technical-only
  Advanced scope.

---

## Testing Requirements

- Unit: schema validates step metadata + layout options.
- Unit: renderer supports orientation + label positions.
- UI: wizard/visual/advanced field coverage.

---

## Documentation Updates Required

- `_docs/_WIDGETS/TIMELINE.md` (final fields + examples)
- `_docs/WIDGETS.md` (if summary fields change)
