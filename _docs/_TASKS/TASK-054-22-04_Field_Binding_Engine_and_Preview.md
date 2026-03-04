# TASK-054-22-04: Field Binding Engine and Preview
# FileName: TASK-054-22-04_Field_Binding_Engine_and_Preview.md

**Priority:** High  
**Category:** Admin/UI + Services  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-22-01, TASK-054-22-03  
**Status:** To Do

---

## Overview
Dodac engine mapowania widget props -> custom fields oraz podglad danych w editorze.

## Scope
1. Definicja bindingów (widgetId + propPath -> fieldKey).
2. Resolver danych do preview i do zapisu.
3. UI do wybierania pola dla konkretnego widgeta.

## Files to Create / Change
- `core/services/customScreens/bindingResolver.ts` (new)
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx` (new)
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx` (new)

## Pseudocode
```ts
const resolved = resolveBindings(bindings, entry.data);
return applyBindingsToBlocks(blocks, resolved);
```

## Acceptance Criteria
1. Bindingi sa deterministyczne i stabilne po zapisie/odczycie.
2. Preview pokazuje dane z entry bez manualnych edycji widget props.
3. Brak konfliktow dla pol o tej samej nazwie w roznych widgetach.

## Testing Requirements
- Unit: resolver bindingow + edge cases.
- Integration UI: mapowanie pola i podglad.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
