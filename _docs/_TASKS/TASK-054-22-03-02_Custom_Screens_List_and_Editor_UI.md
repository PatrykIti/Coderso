# TASK-054-22-03-02: Custom Screens List and Editor UI
# FileName: TASK-054-22-03-02_Custom_Screens_List_and_Editor_UI.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-22-03-01  
**Status:** Done (2026-03-05)

---

## Overview
Zbudowac list view i editor dla custom screens z builderem widgetow oraz panelem ustawien ekranu.

## Scope
1. Lista custom screens z akcjami (create/edit/delete) + status/typ.
2. Editor oparty o `ui/pages/builder/*` (widget canvas + library).
3. Panel ustawien ekranu (name, content type, status) + blok settings.
4. Mobile sheet dla library/details (parity z PageEditor).

## Files to Create / Change
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx` (new)
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` (new)
- `core/admin/ui/custom-screens/CustomScreenShell.tsx` (new)
- `tests/unit/ui/custom-screens-page.test.tsx` (new)
- `tests/integration/ui/custom-screens.test.tsx` (new)

## Pseudocode
```tsx
<CustomScreenShell>
  <LibraryPanel onAddWidget={addBlock} />
  <BlockList blocks={blocks} />
  <Tabs>
    <ScreenSettings />
    <BlockSettings />
  </Tabs>
</CustomScreenShell>
```

## Testing Requirements
- Unit UI: list + editor render states (create mode, loading state).
- Integration UI: create screen flow smoke (save button + widget library visible).

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`

## Completion Notes (2026-03-05)
- Implemented custom screens list and editor UI with widget library, canvas, and screen/block panels.
- Added unit + integration UI smoke coverage for the new module.
```
