# TASK-054-23-03: Screen Preview and Builder Diagnostics
# FileName: TASK-054-23-03_Screen_Preview_and_Builder_Diagnostics.md

**Priority:** High  
**Category:** Admin/UI + Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-23-01, TASK-054-23-02  
**Status:** To Do

---

## Overview

Obecne `Preview` dla `Coderso/Screens` jest zbyt binarne: albo cos sie narysuje, albo user
widzi pusty/nieczytelny stan. Potrzebny jest diagnostyczny preview contract dla buildera.

## Scope

1. Rozdzielic stany:
   - brak content type,
   - brak screen blocks,
   - screen widgets bez wymaganych bindingow,
   - widgets niewspierane w preview,
   - gotowy preview.
2. Dodac deterministic preview fixture data z content type defaults/sample values.
3. Wyswietlac inline diagnostics zamiast niemego blank canvas.
4. Pokazywac CTA do `Bindings` albo `Add screen widgets`, zalezne od przyczyny.
5. Zachowac preview jako admin-only local render, bez wymuszania runtime/public preview token flow.

## Sub-Tasks

1. Zdefiniowac diagnostyczny preview result contract.
2. Dodac sample/default preview data generation dla content type fields.
3. Zmapowac builder empty/error states na konkretne CTA.
4. Dopisac testy preview states i binding diagnostics.

## Architecture

Preview powinien zwracac stan opisowy, nie tylko gotowe bloki:

```ts
type ScreenPreviewResult = {
  status: "ready" | "missing-content-type" | "empty" | "missing-bindings" | "unsupported";
  blocks: Block[];
  diagnostics: Array<{ code: string; message: string; widgetId?: string }>;
};
```

## Files to Create / Change

- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/services/customScreens/bindingResolver.ts`
- `core/services/customScreens/*` (preview diagnostics helper if needed)
- `tests/vitest/customScreens/bindingResolver.test.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`

## Acceptance Criteria

1. Klikniecie `Preview` nigdy nie daje pustego widoku bez wytlumaczenia przyczyny.
2. Gdy ekran nie ma blokow, UI komunikuje to jako intencjonalny empty state.
3. Gdy widget potrzebuje bindingu albo ma unsupported path, user dostaje precyzyjna diagnoze i CTA.
4. Preview korzysta z sample/default data content type i daje powtarzalny rezultat.

## Testing Requirements

- Vitest dla diagnostics helpera
- Vitest UI dla builder preview states: no content type, no blocks, missing bindings, ready

## Documentation Updates Required

- `_docs/CMS_API.md` (tylko jesli kontrakt preview payload/helper jest opisany)
- `_docs/ARCHITECTURE.md`
