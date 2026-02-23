# TASK-063-07-03: Details Preferences Persistence
# FileName: TASK-063-07-03_Details_Preferences_Persistence.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-07-02  
**Status:** To Do

---

## Overview
Zapamietywac preferencje panelu Details per user (aktywny tab, opcjonalnie collapse state).

---

## Scope
1. Dodac `usePostEditorPreferences`.
2. Czytanie/zapis przez user settings client.
3. Domyslne wartosci i bezpieczny fallback.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/hooks/usePostEditorPreferences.ts`
- `core/admin/services/userSettingsClient.ts`
- `core/admin/ui/posts/editor/inspector/PostDetailsSidebar.tsx`
- `tests/unit/posts/post-editor-preferences.test.ts`

---

## Pseudocode
```ts
prefs = loadUserSetting(KEY)
setPref(partial) => optimistic update + async persist
fallback to defaults on error
```

---

## Acceptance Criteria
1. Po powrocie do edytora aktywny tab jest zapamietany.
2. Brak blokujacego loada przy niedostepnym settings API.

---

## Testing Requirements
- Unit: preferences hook fallback + persistence.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (settings key contract)
