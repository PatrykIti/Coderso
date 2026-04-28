# TASK-009-08: Core Widget – Navigation
# FileName: TASK-009-08_Core_Widget_Navigation.md

**Priority:** Medium  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01, TASK-009-02, TASK-006  
**Status:** Done (2026-01-30)  

---

## Overview

Implement core widget **Navigation** zgodnie z `_docs/_WIDGETS/NAVIGATION.md`.
Używa menu z `menuService`.

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/core/navigation.tsx` | new | schema + defaults + render + registerWidget |
| `core/ui/widgets/editors/NavigationEditor.tsx` | new | wizard/visual/advanced |
| `tests/unit/widgets/navigation.test.tsx` | new | render defaults |

---

## Renderer Notes

- Resolve menu by `menuId` or `location`.
- Support mobile variant (toggle).
- Use tokens for spacing + colors.

---

## Editor Notes

- Wizard: select menu + toggle mobile.
- Visual: preview variants (simple / full).
- Advanced: alignment, spacing.

---

## Testing Requirements

- render default menu
- validator rejects missing menuId if required

---

## Docs

- Update `_docs/_WIDGETS/NAVIGATION.md` if schema changes

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
