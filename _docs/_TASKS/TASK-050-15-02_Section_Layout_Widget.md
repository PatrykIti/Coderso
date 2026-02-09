# TASK-050-15-02: Section Layout Widget
# FileName: TASK-050-15-02_Section_Layout_Widget.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-15-01  
**Status:** To Do

---

## Overview

Implement a `section` layout widget used as a semantic/styling wrapper for
page bands, with repeatable internal regions.

Main value:
- local background and spacing at section scope
- semantic landmark controls (`section` / `region`)
- repeatable region slots for elastic structures

---

## Scope

- Widget ID: `section`
- Category: `layout`
- Variants:
  - `default`
  - `contained`
  - `bleed`
- Model:
  - `heading`: optional `label`, `title`
  - `semantics`: `element` (`section` | `div`), `anchorId`, `ariaLabel`
  - `regions[]`: repeatable slot instances (`id`, `label`)
  - `style`: background color/gradient/media, border, radius, overlay
- Slots:
  - repeatable region slots derived from `regions[]`

---

## Pseudo-Implementation

```ts
// core/widgets/core/section.tsx
export type SectionData = {
  heading: { label: string; title: string };
  semantics: { element: "section" | "div"; anchorId: string; ariaLabel: string };
  regions: Array<{ id: string; label: string }>;
  style: {
    backgroundColor: string;
    gradientFrom: string;
    gradientTo: string;
    borderColor: string;
    borderWidth: number;
    radius: string;
  };
};
```

```tsx
// renderer concept
const Element = data.semantics.element;
return (
  <Element id={data.semantics.anchorId || undefined} aria-label={data.semantics.ariaLabel || undefined}>
    {regions.map((region) => (
      <div key={region.id} data-section-region={region.id}>
        {renderSlot(region.id)}
      </div>
    ))}
  </Element>
);
```

```tsx
// visual editor concept
<RegionsManager
  regions={value.regions}
  onAdd={addRegion}
  onRemove={removeRegion}
  onReorder={reorderRegions}
/>
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/section.tsx` | new widget schema/defaults/renderer | repeatable region slots |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | new wizard/visual/advanced editors | region manager in Visual |
| `core/widgets/core/index.ts` | register widget | include editor typing |
| `core/admin/ui/widgets/editors/index.ts` | export editors | wiring |
| `core/admin/ui/widgets/registry.ts` | register editor bundle | template editor integration |
| `core/widgets/runtime.tsx` | add noop editor runtime mapping | parity with other widgets |
| `tests/unit/widgets/section.test.tsx` | new tests | schema/defaults/render/editors |
| `tests/unit/widgets/renderer.test.tsx` | add section marker assertions | runtime deterministic markers |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Visual sections assertion | editor rendering |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/section.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/SECTION.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-section-layout-widget.md`
