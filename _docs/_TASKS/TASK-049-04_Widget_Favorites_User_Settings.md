# TASK-049-04: Widget Favorites (User Settings)
# FileName: TASK-049-04_Widget_Favorites_User_Settings.md

**Priority:** Medium  
**Category:** Admin/UI + Settings  
**Estimated Effort:** Small  
**Dependencies:** TASK-049-03, TASK-007-01  
**Status:** To Do

---

## Overview

Persist widget favorites per user using `user_settings`.

Key: `widgets.favorites` → array of widget IDs (core types + template IDs).

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/settings/userSettingsService.ts` | allow key | add validation for `widgets.favorites` |
| `core/admin/services/userSettingsClient.ts` | types | include new key |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | load + save favorites | toggle with optimistic update |

---

## Validation Rules

- Value must be an array of strings.
- Max length: 50.

---

## Testing Requirements

- `tests/unit/settings/userSettingsService.test.ts`
  - accepts `widgets.favorites` array
  - rejects non-array or oversized values

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widgets-favorites.md`
