# TASK-054-22: Coderso Custom Screens From Widgets
# FileName: TASK-054-22_Coderso_Custom_Screens_From_Widgets.md

**Priority:** High  
**Category:** Admin/UI + CMS/Content + Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-06, TASK-054-07, TASK-054-14, TASK-054-16, TASK-053  
**Status:** To Do

---

## Overview
Dodac nowy modul Coderso, ktory pozwala tworzyc dedykowane ekrany admin UI z widgetow i laczyc je z custom fields.
Cel: uzytkownik nie musi pracowac w Entries, tylko ma specjalny ekran danych np. "Katalog domow".

## Goals
1. Admin moze zbudowac ekran danych z widgetow (layout + sekcje + wizualizacje).
2. Widgety mozna powiazac z custom fields zdefiniowanymi w Content Type.
3. Ekran danych obsluguje tworzenie i edycje rekordow bez wejscia w Entries.
4. Calosc dziala w ramach aktualnego systemu uprawnien i theme tokens.

## Scope
1. Model danych "Custom Screen" (definicja ekranu, content type, layout blokow, bindings).
2. Admin UI builder: tworzenie ekranu z widgetow + mapowanie pol.
3. Engine do bindowania danych (widget props -> custom fields).
4. Dedykowany ekran listy/edycji rekordow powiazany z danym ekranem.
5. Routing i RBAC dla nowego modulu w Coderso.

## Non-Goals
1. Zastepowanie Page Buildera dla publicznych stron.
2. Zmiana runtime renderera publicznego.
3. Tworzenie nowych typow widgetow tylko dla tego modulu (uzywamy istniejacych).

## Sub-Tasks
1. `TASK-054-22-01_Screen_Definition_Contract_and_Schema.md`
2. `TASK-054-22-02_Admin_Routes_and_RBAC.md`
3. `TASK-054-22-03_Screen_Builder_UI_and_Widget_Composition.md`
4. `TASK-054-22-04_Field_Binding_Engine_and_Preview.md`
5. `TASK-054-22-05_Data_Entry_Screens_and_Collection_Workflow.md`
6. `TASK-054-22-06_QA_Docs_Changelog_and_Closure.md`

## Files to Create / Change
- `core/db/schema.ts` + migration artifacts
- `core/services/customScreens/*` (new)
- `core/server/routes/customScreenRoutes.ts` (new)
- `core/admin/ui/custom-screens/*` (new)
- `core/admin/ui/navigation/codersoModules.ts`
- `core/ui/pages/builder/*` (reuse for widget composition)
- `tests/unit/*` + `tests/integration/ui/*`

## Pseudocode
```ts
const screen = await getCustomScreen(screenId);
const entry = await getEntry({ contentTypeId: screen.contentTypeId, entryId });
const props = resolveScreenBindings(screen.bindings, entry.data);
return renderWidgetTree(screen.blocks, props);
```

## Acceptance Criteria
1. Admin tworzy ekran "Katalog domow" z widgetow i mapuje pola bez kodu.
2. Rekordy mozna edytowac w dedykowanym ekranie bez wejscia w Entries.
3. Widgety poprawnie odczytuja i zapisują dane z custom fields.
4. RBAC ogranicza dostep do ekranow i danych.

## Testing Requirements
- Unit: walidacja schemy, resolver bindings, mapowanie props -> fields.
- Integration UI: tworzenie ekranu, mapowanie pol, zapis rekordu.
- Regression: brak regresji w Entries i Page Builder.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_CHANGELOG/*.md` (po implementacji)
