# TASK-050-15-04: Stack Layout Widget
# FileName: TASK-050-15-04_Stack_Layout_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-15-01, TASK-050-15-02  
**Status:** Done (2026-02-09)

---

## Overview

Implement a `stack` layout widget for flow composition (vertical/horizontal)
with responsive gap and alignment controls.

Main value:
- predictable spacing between heterogeneous widgets
- simple composition primitive for long pages

---

## Scope

- Widget ID: `stack`
- Category: `layout`
- Variants:
  - `vertical`
  - `horizontal`
  - `responsive`
- Model:
  - `direction.desktop|tablet|mobile`
  - `gap.desktop|tablet|mobile`
  - `align`, `justify`
  - `wrap` toggle
- Slots:
  - single `content` slot with unlimited child widgets

---

## Pseudo-Implementation

```ts
// core/widgets/core/stack.tsx
type StackData = {
  direction: { desktop: "row" | "column"; tablet: "row" | "column"; mobile: "row" | "column" };
  gap: { desktop: string; tablet: string; mobile: string };
  align: "start" | "center" | "end" | "stretch";
  justify: "start" | "center" | "end" | "between";
  wrap: boolean;
};
```

```tsx
// renderer concept
<div
  data-stack-direction-desktop={data.direction.desktop}
  data-stack-direction-tablet={data.direction.tablet}
  data-stack-direction-mobile={data.direction.mobile}
>
  {renderSlot("content")}
</div>
```

```tsx
// visual editor concept
<SegmentedControl label="Direction" values={...} />
<TokenSelect label="Gap (Desktop)" value={...} />
<Toggle label="Wrap items" checked={...} />
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/stack.tsx` | new widget schema/defaults/renderer | responsive flow container |
| `core/admin/ui/widgets/editors/StackEditors.tsx` | new wizard/visual/advanced editors | direction/gap/alignment controls |
| `core/widgets/core/index.ts` | register widget | layout category |
| `core/admin/ui/widgets/editors/index.ts` | export editors | wiring |
| `core/admin/ui/widgets/registry.ts` | register editor bundle | template editor integration |
| `core/widgets/runtime.tsx` | add noop editor runtime mapping | parity |
| `tests/unit/widgets/stack.test.tsx` | new tests | schema/defaults/renderer/editors |
| `tests/unit/widgets/renderer.test.tsx` | add stack marker assertions | deterministic output |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Visual sections assertion | UI coverage |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/stack.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-stack-layout-widget.md`
