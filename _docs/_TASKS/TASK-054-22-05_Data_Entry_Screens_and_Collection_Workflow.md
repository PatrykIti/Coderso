# TASK-054-22-05: Data Entry Screens and Collection Workflow
# FileName: TASK-054-22-05_Data_Entry_Screens_and_Collection_Workflow.md

**Priority:** High  
**Category:** Admin/UI + CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-22-02, TASK-054-22-04  
**Status:** To Do

---

## Overview
Udostepnic dedykowane ekrany listy i edycji rekordow oparte o zdefiniowany custom screen.

## Scope
1. Lista rekordow powiazanych z custom screen (create/edit/delete).
2. Formularz edycji korzysta z bindingow do mapowania pol.
3. Zachowac mozliwosc wejscia do klasycznego Entries jako fallback.

## Files to Create / Change
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` (new)
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` (new)
- `core/admin/ui/entries/*` (reuse for data persistence)

## Pseudocode
```tsx
<CustomScreenEntryEditor>
  <BoundWidgetCanvas blocks={screen.blocks} data={entry.data} />
  <SaveBar onSave={saveEntry} />
</CustomScreenEntryEditor>
```

## Acceptance Criteria
1. Uzytkownik moze dodac/edytowac rekord przez dedykowany ekran.
2. Zmiany zapisują się jako standardowy entry w content type.
3. UI nie wymaga wejscia w klasyczne Entries.

## Testing Requirements
- Integration UI: create entry -> edit -> save flow.
- Unit: mapping zapis->entry schema.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
