# TASK-009-04: Core Widget – Timeline
# FileName: TASK-009-04_Core_Widget_Timeline.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01, TASK-009-02  
**Status:** To Do  

---

## Overview

Implement core widget **Timeline** zgodnie z `_docs/_WIDGETS/TIMELINE.md`.
Timeline bez dat, tylko etapy/proces.

---

## Required Variants
- `horizontal`
- `vertical`

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/core/timeline.tsx` | new | schema + defaults + render + registerWidget |
| `core/ui/widgets/editors/TimelineEditor.tsx` | new | wizard/visual/advanced |
| `tests/unit/widgets/timeline.test.tsx` | new | render defaults |

---

## Renderer Notes

- Render list of steps (label + optional description).
- Variant controls layout direction.
- Use tokens for spacing and lines.

---

## Editor Notes

- Wizard: minimal liczba kroków (>= 3).
- Visual: wybór układu + podgląd.
- Advanced: spacing, alignment, line style.

---

## Testing Requirements

- render with default steps
- validator rejects empty steps

---

## Docs

- Update `_docs/_WIDGETS/TIMELINE.md` if schema changes

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
