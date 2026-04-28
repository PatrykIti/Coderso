# TASK-009-02: Widget Schema Validation & Defaults
# FileName: TASK-009-02_Widget_Schema_Validation.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01  
**Status:** Done (2026-01-30)  

---

## Overview

Walidacja danych widgetu (bloków) na podstawie JSON schema oraz merge defaults.
Wykluczamy `editor` z danych publikowanych (patrz `pageService.toPublishedData`).

---

## Validation Rules

- `type` musi istnieć w registry.
- `variant` musi należeć do `definition.variants`.
- `data` -> merge defaults, potem walidacja.
- Odmowa zapisu jeśli schema nie przechodzi.

---

## Implementation Details

Użyj AJV jak w `core/services/content/validation.ts`.
Utwórz osobny validator w `core/widgets/validator.ts`.

API:
```ts
export function normalizeWidgetBlock(block: WidgetBlock) {
  const def = getWidget(block.type);
  if (!def) throw new Error("widget_unknown_type");
  if (!def.variants.includes(block.variant)) throw new Error("widget_invalid_variant");

  const merged = { ...def.defaults, ...block.data };
  validateSchema(def.schema, merged);
  return { ...block, data: merged };
}
```

---

## Files / Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/validator.ts` | new | AJV validate + normalize |
| `tests/unit/widgets/validator.test.ts` | new | invalid schema + defaults |

---

## Testing Requirements

- invalid schema throws error
- valid data merged with defaults
- invalid variant rejected

---

## Docs

- `_docs/WIDGETS.md` (section: validation & defaults)

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
