# TASK-054-23-02: Dedicated Screen Widget Pack and Surface Scoping
# FileName: TASK-054-23-02_Dedicated_Screen_Widget_Pack_and_Surface_Scoping.md

**Priority:** High  
**Category:** Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-23-01, TASK-054-14, TASK-054-16  
**Status:** To Do

---

## Overview

Najwiekszy produktowy problem `Coderso/Screens` jest taki, ze builder bierze cala
rejestracje frontend widgets przez `listRegisteredWidgets()`. To miesza dwa rozne surface'y:
- public/page composition,
- admin data screen composition.

Ten task ma wprowadzic jawny widget surface contract i pierwszy dedykowany pack widgets
dla ekranow admin UI.

## Scope

1. Rozszerzyc widget registry metadata o surface visibility.
2. Dodac registry selectors:
   - `listRegisteredPageWidgets()`
   - `listRegisteredScreenWidgets()`
   - `listRegisteredWidgetLibraryItems()`
3. Odczac `CustomScreenEditorPage` od pelnego katalogu frontend widgets.
4. Ukryc `screen-only` widgets w `Coderso/Widgets`.
5. Dostarczyc minimalny v1 screen widget pack.

## Sub-Tasks

1. Dodac `surface` metadata do widget registry i selector helpers.
2. Wyciac public widgets z `CustomScreenEditorPage`.
3. Ukryc `screen-only` widgets w `WidgetLibraryPage`.
4. Dostarczyc pierwszy zestaw dedykowanych screen widgets wraz z editorami i renderers.
5. Domknac testy registry scoping i UI library/builder flows.

## Proposed v1 Screen Widget Pack

1. `screen-record-header`
2. `screen-field-group`
3. `screen-field-value`
4. `screen-status-badge`
5. `screen-meta-panel`
6. `screen-two-column`
7. `screen-tabs`
8. `screen-related-table`

Uwaga:
- shared layout primitives moga pozostac wspolne tylko wtedy, gdy dostana jawny surface `both`,
- page widgets typu `hero`, `cta-banner`, `newsletter`, `product-gallery`, `content-list` nie powinny byc domyslnie dostepne w `Screens`.

## Architecture

Rekomendowany metadata contract:

```ts
type WidgetSurface =
  | "page-builder"
  | "widget-library"
  | "custom-screen-builder";

type WidgetDefinition = {
  // existing fields
  surfaces?: WidgetSurface[];
};
```

Domyslna polityka:
- legacy public widgets dostaja `["page-builder", "widget-library"]`,
- screen-only widgets dostaja `["custom-screen-builder"]`,
- tylko jawnie zatwierdzone prymitywy layoutowe moga miec wszystkie trzy surface'y.

## Files to Create / Change

- `core/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/core/index.ts`
- `core/widgets/core/*` (new screen widgets)
- `core/admin/ui/widgets/registry.ts`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `tests/unit/widgets/registry.test.ts`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/custom-screens-page.test.tsx`

## Pseudocode

```ts
const screenWidgets = listWidgets().filter((widget) =>
  widget.surfaces.includes("custom-screen-builder")
);

const widgetLibraryItems = listWidgets().filter((widget) =>
  widget.surfaces.includes("widget-library")
);
```

## Acceptance Criteria

1. `CustomScreenEditorPage` pokazuje tylko screen widgets i jawnie dopuszczone shared primitives.
2. `Coderso/Widgets` nie pokazuje `screen-only` widgets.
3. Rejestr widgetow ma jeden centralny contract surface visibility.
4. Minimalny v1 screen pack pozwala zbudowac sensowny admin record screen bez page/public widgets.

## Testing Requirements

- Unit: registry validation + surface filtering selectors
- Vitest UI: widget library hides screen-only widgets
- Vitest UI: custom screens builder hides public-only widgets
- Widget renderer/editor smoke tests dla nowego screen packa

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/CODERSO_MODULES.md`
