# Widgets Composite Strategy

> Historical compatibility record for the retired non-dashboard registry and
> catalog. It does not authorize new widget types, presets, module-pack work, or
> Wizard/Visual/Advanced editors. Active domain editors own sections/blocks;
> configurable product widgets belong only to Admin Dashboard and follow
> `_docs/DASHBOARD_WIDGETS_SPEC.md`.

The remainder records the former composite-first delivery contract for retained
runtime/read compatibility.

## Goal

Reduce cognitive load for non-technical users while preserving full flexibility for advanced builders.

Delivery layers:
1. `Kits` (full starter flows),
2. `Composite widgets` (business-ready sections),
3. `Atomic widgets` (fine-grained building blocks in advanced flows).

## Widget Metadata Contract

Each widget definition exposes metadata used by registry/catalog/UI filters:

```ts
type WidgetComplexity = "composite" | "atomic";
type WidgetAudience = "beginner" | "intermediate" | "advanced";

type WidgetDefinition = {
  type: string;
  title: string;
  complexity?: WidgetComplexity;
  audience?: WidgetAudience;
  module?: string;
  presets?: Array<{ id: string; label: string; description?: string }>;
  requires?: string[];
  // ...existing widget contract
};
```

Registry behavior:
- validates metadata shape when explicitly provided,
- applies deterministic fallback for missing metadata:
  - `complexity`: `layout -> atomic`, others -> `composite`,
  - `audience`: `atomic -> advanced`, `composite -> beginner`,
  - `module`: fallback to widget `category`.

## Admin UX Contract

Widget library exposes:
- tab `Recommended` (optional composite-only helper),
- tab `All widgets` (composite + atomic),
- `Advanced mode` toggle,
- filters: `Module` and `Complexity`.

Default intent:
- beginner users can switch to `Recommended`,
- atomic widgets remain available but are not the primary onboarding path.

## Catalog/API Contract

`GET /admin/api/widgets` catalog includes metadata fields:
- `complexity`,
- `audience`,
- `module`,
- `presets[]`,
- `requires[]`.

This keeps filtering/personalization logic fully data-driven.
