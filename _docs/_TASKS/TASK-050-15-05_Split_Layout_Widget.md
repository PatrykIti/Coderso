# TASK-050-15-05: Split Layout Widget
# FileName: TASK-050-15-05_Split_Layout_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-15-01, TASK-050-15-03  
**Status:** To Do

---

## Overview

Implement a `split-layout` widget for two-pane structures (left/right)
with ratio controls and responsive collapse behavior.

Main value:
- generic replacement for ad hoc two-column custom widgets
- stable composition for hero-like and comparison-like layouts

---

## Scope

- Widget ID: `split-layout`
- Category: `layout`
- Variants:
  - `50-50`
  - `40-60`
  - `60-40`
- Model:
  - `ratio.desktop|tablet`
  - `collapseMobile` (`stack` | `keep`)
  - `reverseOnMobile` toggle
  - `gap` token
  - `verticalAlign` token
- Slots:
  - fixed `left` and `right`

---

## Pseudo-Implementation

```ts
// core/widgets/core/splitLayout.tsx
type SplitLayoutData = {
  ratio: { desktop: "50-50" | "40-60" | "60-40"; tablet: "50-50" | "40-60" | "60-40" };
  collapseMobile: "stack" | "keep";
  reverseOnMobile: boolean;
  gap: string;
  verticalAlign: "start" | "center" | "end" | "stretch";
};
```

```tsx
// renderer concept
<div
  data-split-ratio-desktop={data.ratio.desktop}
  data-split-collapse-mobile={data.collapseMobile}
  data-split-reverse-mobile={data.reverseOnMobile ? "true" : "false"}
>
  <div data-split-side="left">{renderSlot("left")}</div>
  <div data-split-side="right">{renderSlot("right")}</div>
</div>
```

```tsx
// visual editor concept
<SegmentedControl label="Desktop ratio" values={["50-50", "40-60", "60-40"]} />
<RadioGroup label="Mobile behavior" options={["stack", "keep"]} />
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/splitLayout.tsx` | new widget schema/defaults/renderer | fixed left/right slots |
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | new wizard/visual/advanced editors | ratio + collapse controls |
| `core/widgets/core/index.ts` | register widget | layout category |
| `core/admin/ui/widgets/editors/index.ts` | export editors | wiring |
| `core/admin/ui/widgets/registry.ts` | register editor bundle | template editor integration |
| `core/widgets/runtime.tsx` | add noop editor runtime mapping | parity |
| `tests/unit/widgets/splitLayout.test.tsx` | new tests | schema/defaults/renderer/editors |
| `tests/unit/widgets/renderer.test.tsx` | add split marker assertions | deterministic output |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Visual sections assertion | UI coverage |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/splitLayout.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-split-layout-widget.md`
