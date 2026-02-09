# TASK-050-15-06: Spacer Widget
# FileName: TASK-050-15-06_Spacer_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-050-15-01  
**Status:** Done (2026-02-09)

---

## Overview

Implement a lightweight `spacer` widget for responsive spacing control
without adding dummy content blocks.

Main value:
- explicit vertical rhythm controls
- cleaner templates and predictable spacing behavior

---

## Scope

- Widget ID: `spacer`
- Category: `layout`
- Variants:
  - `fixed`
  - `responsive`
- Model:
  - `height.desktop|tablet|mobile` (token or px)
  - `showGuideInEditor` toggle
- Slots:
  - none

---

## Pseudo-Implementation

```ts
// core/widgets/core/spacer.tsx
type SpacerData = {
  height: { desktop: string; tablet: string; mobile: string };
  showGuideInEditor: boolean;
};
```

```tsx
// renderer concept
<div
  aria-hidden="true"
  data-spacer="true"
  data-spacer-desktop={data.height.desktop}
  data-spacer-tablet={data.height.tablet}
  data-spacer-mobile={data.height.mobile}
  style={{ height: resolveHeight(previewDevice, data.height) }}
/>
```

```tsx
// visual editor concept
<TokenOrNumberInput label="Desktop height" value={...} />
<TokenOrNumberInput label="Tablet height" value={...} />
<TokenOrNumberInput label="Mobile height" value={...} />
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/spacer.tsx` | new widget schema/defaults/renderer | no slots |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | new wizard/visual/advanced editors | responsive height controls |
| `core/widgets/core/index.ts` | register widget | layout category |
| `core/admin/ui/widgets/editors/index.ts` | export editors | wiring |
| `core/admin/ui/widgets/registry.ts` | register editor bundle | template editor integration |
| `core/widgets/runtime.tsx` | add noop editor runtime mapping | parity |
| `tests/unit/widgets/spacer.test.tsx` | new tests | schema/defaults/renderer/editors |
| `tests/unit/widgets/renderer.test.tsx` | add spacer marker assertions | deterministic output |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Visual sections assertion | UI coverage |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/spacer.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/SPACER.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-spacer-widget.md`
