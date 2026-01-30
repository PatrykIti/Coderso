# TASK-009-05: Core Widget – Compare Timeline
# FileName: TASK-009-05_Core_Widget_Compare_Timeline.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01, TASK-009-02  
**Status:** To Do  

---

## Overview

Implement core widget **Compare Timeline** zgodnie z `_docs/_WIDGETS/COMPARE_TIMELINE.md`.
Dwutorowa oś z porównaniem procesu „tradycyjnie vs u nas”.

---

## Required Variants
- `stacked`
- `split`

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/core/compareTimeline.tsx` | new | schema + defaults + render + registerWidget |
| `core/ui/widgets/editors/CompareTimelineEditor.tsx` | new | wizard/visual/advanced |
| `tests/unit/widgets/compareTimeline.test.tsx` | new | render defaults |

---

## Renderer Notes

- Render two tracks with aligned steps.
- Highlighted segments supported.
- Use tokens for line, spacing, labels.

---

## Editor Notes

- Wizard: configure track A + track B titles + steps.
- Visual: preview of both tracks.
- Advanced: spacing, highlight colors.

---

## Testing Requirements

- both tracks must have same step count (validator)
- render with defaults

---

## Docs

- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` if schema changes

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
