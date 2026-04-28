# TASK-056-01: Form Field Logic Contract and Normalization
# FileName: TASK-056-01_Form_Field_Logic_Contract_and_Normalization.md

**Priority:** High  
**Category:** Backend Contract  
**Estimated Effort:** Medium  
**Dependencies:** TASK-056  
**Status:** Done (2026-02-21)

---

## Goal
Dodac jednoznaczny kontrakt logiki pola (`field.settings.logic`) z walidacja i normalizacja po stronie backend.

## Files
- `core/services/forms/fieldSettings.ts` (new)
- `core/services/forms/validation.ts`
- `tests/unit/forms/validation.test.ts`
- `tests/unit/forms/fieldSettings.test.ts` (new)

## Contract
```ts
type FormFieldLogicOperator =
  | "always"
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "exists"
  | "not_exists";

type FormFieldLogic = {
  operator: FormFieldLogicOperator;
  field?: string;
  value?: string;
};
```

## Pseudocode
```ts
normalizeFormFieldLogic(input) {
  if (!input) return undefined;
  validate operator;
  if (operator === "always") return { operator };
  require field for non-always;
  require value for equals/not_equals/contains/not_contains;
  return trimmed rule;
}
```

## Acceptance Criteria
1. Niepoprawny payload logiki zwraca `form_field_invalid`.
2. Poprawny payload jest normalizowany i zapisywany deterministycznie.
3. Jest funkcja evaluatora logiki do uzycia przez runtime/admin preview.

## Completion Notes (2026-02-21)
- Dodano `core/services/forms/fieldSettings.ts` z normalizacja i ewaluacja logiki pola.
- `core/services/forms/validation.ts` zapisuje `settings.logic` i stosuje logike przy walidacji submit.
- Dodano testy: `tests/unit/forms/fieldSettings.test.ts`, rozszerzono `tests/unit/forms/validation.test.ts`.
