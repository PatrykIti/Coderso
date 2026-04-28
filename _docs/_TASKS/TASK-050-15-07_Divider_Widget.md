# TASK-050-15-07: Divider Widget
# FileName: TASK-050-15-07_Divider_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-050-15-01  
**Status:** Done (2026-02-09)

---

## Overview

Implement a `divider` widget for visual separation between sections/blocks
with optional label.

Main value:
- explicit visual structure
- reusable separator without custom HTML

---

## Scope

- Widget ID: `divider`
- Category: `layout`
- Variants:
  - `line`
  - `dashed`
  - `label-center`
- Model:
  - `label` (optional)
  - `thickness`
  - `color`
  - `width` (`full` | `container` | custom)
  - `marginTop`, `marginBottom`
- Slots:
  - none

---

## Pseudo-Implementation

```ts
// core/widgets/core/divider.tsx
type DividerData = {
  label: string;
  thickness: number;
  color: string;
  width: "full" | "container" | "custom";
  customWidth: string;
  marginTop: string;
  marginBottom: string;
};
```

```tsx
// renderer concept
<div data-divider-variant={variant} style={{ marginTop, marginBottom }}>
  {variant === "label-center" ? <DividerWithLabel label={data.label} /> : <DividerLine />}
</div>
```

```tsx
// visual editor concept
<ColorInput label="Line color" value={...} />
<NumberInput label="Thickness" value={...} min={1} max={8} />
<TextInput label="Label" value={...} />
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/divider.tsx` | new widget schema/defaults/renderer | line and label variants |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | new wizard/visual/advanced editors | style and spacing controls |
| `core/widgets/core/index.ts` | register widget | layout category |
| `core/admin/ui/widgets/editors/index.ts` | export editors | wiring |
| `core/admin/ui/widgets/registry.ts` | register editor bundle | template editor integration |
| `core/widgets/runtime.tsx` | add noop editor runtime mapping | parity |
| `tests/unit/widgets/divider.test.tsx` | new tests | schema/defaults/renderer/editors |
| `tests/unit/widgets/renderer.test.tsx` | add divider marker assertions | deterministic output |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Visual sections assertion | UI coverage |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/divider.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/DIVIDER.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-divider-widget.md`
