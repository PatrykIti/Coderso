# TASK-009-01: Widget Registry
# FileName: TASK-009-01_Widget_Registry.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002  
**Status:** Done (2026-01-30)  

---

## Overview

Zbuduj centralny registry widgetów (core + pluginy). Registry odpowiada za:
- rejestrację definicji widgetu,
- walidację kontraktu (type, variants, schema, defaults, editor, render),
- dostęp do listy widgetów (UI + renderer),
- unikanie duplikatów.

---

## Widget Contract (v1)

```ts
export type WidgetEditorProps<T> = {
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
};

export type WidgetDefinition<T = Record<string, unknown>> = {
  type: string;                 // kebab-case
  title: string;                // display name
  description?: string;
  category: "layout" | "content" | "forms" | "navigation" | "media";
  variants: string[];           // non-empty
  schema: Record<string, unknown>; // JSON schema draft-07
  defaults: T;                  // safe defaults
  editor: {
    wizard: React.ComponentType<WidgetEditorProps<T>>;
    visual: React.ComponentType<WidgetEditorProps<T>>;
    advanced: React.ComponentType<WidgetEditorProps<T>>;
  };
  render: React.ComponentType<{ data: T; variant: string }>;
};
```

**Naming rules:**
- Core widgets: `hero`, `timeline`, `compare-timeline`, `newsletter`, `contact`, `navigation`, `footer`
- Plugin widgets: `<pluginName>.<type>` (np. `seo-boost.hero`)

---

## Implementation Details

### Registry API (core/widgets/registry.ts)

- `registerWidget(def)` — rejestruje widget
- `getWidget(type)` — zwraca definicję lub `null`
- `listWidgets()` — lista wszystkich
- `clearWidgets()` — tylko dla testów

Walidacja:
- `type` kebab-case (core) lub `<plugin>.<widget>`.
- `variants` niepuste.
- `schema` musi być obiektem.
- `defaults` musi być obiektem.

Przykład:
```ts
const registry = new Map<string, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition) {
  if (registry.has(def.type)) throw new Error("widget_already_registered");
  registry.set(def.type, def);
}
```

---

## Files / Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/registry.ts` | new | registry + validation |
| `tests/unit/widgets/registry.test.ts` | new | duplicate + list |

---

## Testing Requirements

- `registerWidget` rejects duplicates
- `listWidgets` returns core widgets when registered
- invalid `type` or empty `variants` throws error

---

## Docs

- Update `_docs/WIDGETS.md` (contract + registry API)

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
