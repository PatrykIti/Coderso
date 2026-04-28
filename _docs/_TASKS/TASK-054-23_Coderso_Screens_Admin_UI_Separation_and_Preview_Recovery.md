# TASK-054-23: Coderso Screens Admin UI Separation and Preview Recovery
# FileName: TASK-054-23_Coderso_Screens_Admin_UI_Separation_and_Preview_Recovery.md

**Priority:** High  
**Category:** Admin/UI + Widgets + CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-22, TASK-054-14, TASK-054-16, TASK-058  
**Status:** Done (2026-03-18)

---

## Overview

Dowozenie `TASK-054-22` potwierdzilo, ze technicznie mozemy budowac `Coderso/Screens`
na reuse page/widget buildera, ale produktowo ten kontrakt jest zly dla admin UI.

Aktualne problemy:
- klikniecie `Preview` w builderze nie daje wiarygodnego rezultatu albo konczy sie pustym stanem,
- builder pokazuje caly frontendowy katalog widgetow, mimo ze `Screens` nie sa surface public-page,
- widgety potrzebne tylko do ekranow admin UI nie powinny byc widoczne w `Coderso/Widgets`,
- workflow listy rekordow i edytora nie odroznia ekranu `collection-only` od ekranu `dashboard/read-only` i `editor`, przez co copy typu `No field bindings yet` / `Preview unavailable` brzmi jak blad produktu.

Celem follow-upu jest odciecie `Screens` od public page/widget surface i zamkniecie
dedykowanego kontraktu dla admin data screens: osobna pula screen widgets, jasny model
trybow ekranu, diagnostyczny preview, oraz routing/copy zgodne z tym, co user faktycznie zbudowal.

## Goals

1. `Coderso/Screens` uzywa dedykowanego screen-widget surface zamiast pelnej biblioteki frontend widgets.
2. Screen-only widgets sa ukryte w `Coderso/Widgets`, a public widgets nie zanieczyszczaja buildera ekranow.
3. `Preview` w builderze nigdy nie konczy sie niemym blankiem; pokazuje albo realny widok, albo precyzyjna diagnoze brakow.
4. Lista rekordow i wejscie w rekord komunikują, czy ekran jest `collection-only`, `dashboard`, czy `editor`.
5. Flow wejscia w rekord nie prowadzi usera do niezrozumialego ekranu bez widgetow/bindingow.

## Scope

1. Odswiezenie kontraktu `custom screen` o jawny model capabilities/mode.
2. Dodanie metadata surface scoping dla widget registry i admin widget library.
3. Zdefiniowanie pierwszego dedykowanego packa screen widgets dla admin UI.
4. Hardening preview w builderze i record workflow.
5. Testy, docs, changelog i task board sync.

## Non-Goals

1. Redesign calego `Coderso/Widgets` poza surface scoping potrzebnym dla `Screens`.
2. Zastapienie klasycznego `Entries` dla wszystkich content types niezaleznie od mode ekranu.
3. Zmiana public runtime pages/widget renderer poza minimalnym wsparciem registry metadata.
4. Dostarczanie kompletnego low-code app buildera; ten follow-up domyka tylko admin data screens contract.

## Architecture

`TASK-054-22` mial jawny non-goal: reuse istniejacych widgetow zamiast tworzenia nowych tylko dla
`Screens`. Obecny feedback produktowy uniewaznia to zalozenie.

Nowy target:
- page/public widgets pozostaja zoptymalizowane pod runtime/public rendering,
- screen widgets sa zoptymalizowane pod admin record workflows,
- tylko jawnie dopuszczone prymitywy moga byc wspoldzielone miedzy surface'ami,
- route/action UX zalezy od capability modelu ekranu, a nie od samego istnienia `contentTypeId`.

## Implementation Order

1. Kontrakt i mode model (`TASK-054-23-01`).
2. Surface scoping i dedykowany screen widget pack (`TASK-054-23-02`).
3. Preview diagnostics i builder empty states (`TASK-054-23-03`).
4. Record workflow gating i copy refresh (`TASK-054-23-04`).
5. QA, docs, changelog, kanban closure (`TASK-054-23-05`).

## Sub-Tasks

1. `TASK-054-23-01_Screen_Contract_Mode_Model_and_Gating.md`
2. `TASK-054-23-02_Dedicated_Screen_Widget_Pack_and_Surface_Scoping.md`
3. `TASK-054-23-03_Screen_Preview_and_Builder_Diagnostics.md`
4. `TASK-054-23-04_Record_Workflow_Gating_and_Copy_Clarification.md`
5. `TASK-054-23-05_QA_Docs_Changelog_and_Closure.md`

## Files to Create / Change

- `core/services/customScreens/*`
- `core/server/routes/customScreenRoutes.ts`
- `core/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/core/*`
- `core/admin/ui/widgets/*`
- `core/admin/ui/custom-screens/*`
- `tests/integration/routes/customScreensRoutes.test.ts`
- `tests/unit/widgets/registry.test.ts`
- `tests/vitest/customScreens/*`
- `tests/vitest/ui/custom-screen-*.test.tsx`
- `tests/vitest/ui/widget-library.test.tsx`

## Pseudocode

```ts
const capabilities = resolveCustomScreenCapabilities(screen);

if (capabilities.mode === "collection-only") {
  return openClassicEntryEditor();
}

if (capabilities.mode === "dashboard") {
  return openReadOnlyScreenView();
}

return openBoundScreenEditor();
```

## Acceptance Criteria

1. Builder `Coderso/Screens` nie pokazuje calej frontendowej listy widgetow.
2. `Coderso/Widgets` nie pokazuje screen-only widgets.
3. Preview buildera pokazuje realny ekran albo diagnostyczny komunikat z jasnym CTA, nigdy pusty blank bez wyjasnienia.
4. Entry list/editor jasno komunikuje, czy dany screen jest tylko skrotem do kolekcji, dashboardem, czy edytowalnym ekranem rekordu.
5. Klikniecie rekordu bez screen editor capability nie prowadzi do mylacego `Preview unavailable`.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/customScreensRoutes.test.ts`
- `vitest run tests/vitest/admin/custom-screen-schemas.test.ts`
- `vitest run tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/bindingResolver.test.ts`
- `vitest run tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/widget-library.test.tsx`
- `vitest run tests/unit/widgets/registry.test.ts`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/_CHANGELOG/*.md`

## Completion Notes (2026-03-18)

- Added dedicated `custom-screen-builder` widget surface with a minimal screen widget pack.
- Hid screen-only widgets from `Coderso/Widgets` and page/template widget flows.
- Added derived `collection-only | dashboard | editor` capabilities to custom screen records.
- Updated builder preview and record workflow copy/routing to avoid blank or confusing states.
