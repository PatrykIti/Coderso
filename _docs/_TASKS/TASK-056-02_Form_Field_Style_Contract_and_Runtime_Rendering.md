# TASK-056-02: Form Field Style Contract and Runtime Rendering
# FileName: TASK-056-02_Form_Field_Style_Contract_and_Runtime_Rendering.md

**Priority:** High  
**Category:** Runtime/UI Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-056-01  
**Status:** Done (2026-02-21)

---

## Goal
Dodac podstawowy, czytelny kontrakt stylu pola (`field.settings.style`) i zastosowac go w runtime formularza.

## Files
- `core/services/forms/fieldSettings.ts`
- `core/services/forms/validation.ts`
- `core/widgets/core/formEmbed.tsx`
- `tests/unit/widgets/formEmbed.test.tsx`

## Contract
```ts
type FormFieldStyle = {
  width?: "full" | "half";
  labelPosition?: "above" | "inline" | "hidden";
};
```

## Pseudocode
```ts
resolveFieldWidthClass(style.width):
  half -> "md:col-span-1"
  full -> "md:col-span-2"

renderLabel(position):
  hidden -> null
  inline -> label obok kontrolki
  above -> label nad kontrolka
```

## Acceptance Criteria
1. Runtime render respektuje `width` i `labelPosition`.
2. Brak stylu => bezpieczne defaulty (`full`, `above`).
3. Testy runtime potwierdzaja klasy/markup dla stylu.

## Completion Notes (2026-02-21)
- Runtime `form-embed` mapuje `settings.style.width` do kolumn i `settings.style.labelPosition` do ukladu etykiety.
- Dodano atrybuty runtime dla logiki i required metadata na kontrolkach formularza.
- Rozszerzono testy renderingu: `tests/unit/widgets/formEmbed.test.tsx`.
