# TASK-056-03: Form Editor Logic/Style UI
# FileName: TASK-056-03_Form_Editor_Logic_Style_UI.md

**Priority:** High  
**Category:** Admin UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-056-01, TASK-056-02  
**Status:** Done (2026-02-21)

---

## Goal
Zastapic placeholdery `Logic` i `Style` realnymi kontrolkami dla kazdego pola.

## Files
- `core/admin/ui/forms/FieldSettingsPanel.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/ui/forms/FormCanvas.tsx`
- `tests/integration/ui/forms.test.tsx`

## Pseudocode
```tsx
<LogicTab>
  operator select
  dependent field select
  value input (dla operatorow porownawczych)
</LogicTab>

<StyleTab>
  width select
  label position select
</StyleTab>
```

## Acceptance Criteria
1. Pola `Logic/Style` sa edytowalne dla kazdego typu pola.
2. Zmiany sa od razu widoczne na canvas (co najmniej style).
3. Po `Save form` i reload ustawienia pozostaja.

## Completion Notes (2026-02-21)
- `FieldSettingsPanel` zawiera kompletne kontrolek dla `Logic` i `Style`.
- `FormBuilderPage` przekazuje liste pol do konfiguracji zaleznosci logicznych.
- `FormCanvas` wspiera podglad stylu pola (`width`, `labelPosition`).
