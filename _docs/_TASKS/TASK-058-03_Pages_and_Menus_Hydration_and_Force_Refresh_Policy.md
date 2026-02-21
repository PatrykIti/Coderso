# TASK-058-03: Pages and Menus Hydration and Force Refresh Policy
# FileName: TASK-058-03_Pages_and_Menus_Hydration_and_Force_Refresh_Policy.md

**Priority:** High  
**Category:** Admin UX/Data Flow  
**Estimated Effort:** Large  
**Dependencies:** TASK-058-02  
**Status:** To Do

---

## Overview
Usunac petle i nadmiarowe odswiezania w `Pages` i `Menus` przez uporzadkowanie sekwencji: initial hydrate -> stale-while-revalidate -> explicit refresh.

## Legacy Patch Handling
1. Zweryfikowac obecny patch `core/admin/utils/cacheRefresh.ts` i usage w ekranach.
2. Dla kazdego patcha punktowego:
   - potwierdzic efekt na request count,
   - usunac side-effects (np. dublowane refresh),
   - zachowac tylko elementy zgodne z finalna polityka.
3. Na koniec subtasku:
   - brak martwego kodu/duplikatow,
   - jeden spojny mechanizm background vs foreground refresh.

## Scope
1. `PageListPage`:
   - mount nie wymusza `force: true` gdy cache istnieje,
   - background refresh tylko raz na wejscie lub po invalidacji.
2. `MenuEditorPage`:
   - usunac dublowane ladowanie aktywnego menu,
   - rozdzielic odpowiedzialnosc: lista menu vs detal menu,
   - refresh przy cacheBus event tylko gdy event dotyczy aktywnego klucza.
3. Dodac jawna polityke `force`:
   - `force: true` tylko dla explicit user action (`Refresh`, `Save`, `Publish`, `Delete`) albo event invalidation.
4. Standaryzacja helpera background loading (`resolveCacheRefreshBackground`).

## Sub-Tasks
1. Ujednolicic mount hydration policy dla `PageListPage` i `MenuEditorPage`.
2. Ograniczyc `force: true` do jawnych akcji user/event invalidation.
3. Usunac dublowane ladowanie active menu detail.
4. Dodac testy regresyjne dla lifecycle refresh.

## Files to Create / Change
- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/utils/cacheRefresh.ts`
- `tests/unit/ui/page-list-cache-behavior.test.tsx` (new)
- `tests/unit/ui/menu-editor-refresh-policy.test.tsx` (new)

## Pseudocode
```ts
onMount():
  if (hasLocalCache) render(cache)
  refresh({ force: !hasLocalCache, background: hasLocalCache })

onCacheEvent(event):
  if (event.key matches currentScreenKeys):
    refresh({ force: true, background: true })

onUserRefreshClick():
  refresh({ force: true, background: false })
```

## Acceptance Criteria
1. Wejscie na `Pages` i `Menus` nie generuje petli fetch.
2. Ekran z cache renderuje sie od razu, a refresh jest cichy w tle.
3. Przyciski refresh/save nadal gwarantuja aktualne dane.

## Testing Requirements
- Unit: policy `force/background` dla `pages` i `menus`.
- Integration: repeated navigation `pages <-> menus` nie przekracza ustalonego budzetu requestow.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md` (Pages/Menus lifecycle)
