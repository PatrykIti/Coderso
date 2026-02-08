# TASK-050-12-05: CTA Banner Widget
# FileName: TASK-050-12-05_CTA_Banner_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-12-04  
**Status:** To Do

---

## Overview

Implement CTA Banner widget for conversion breakpoints between sections.
Target output: compact CTA strip with strong headline, short copy, and button(s).

---

## Scope

- Widget ID: `cta-banner`
- Variants:
  - `centered`
  - `split`
  - `with-badge`
- Model:
  - content: `badge`, `title`, `description`
  - actions: `primaryCta`, `secondaryCta`
  - style: `background`, `text`, `button`, `border`, `radius`, `padding`
- Wizard:
  - choose variant
  - fill headline + primary CTA
- Visual:
  - full content + action styling
- Advanced:
  - technical spacing/border tokens

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/ctaBanner.tsx` | new widget model + schema + defaults + render | deterministic CTA layout |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | new editors | Visual sections |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register widget definition | core catalog |
| `tests/unit/widgets/ctaBanner.test.tsx` | new tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | markers |
| `tests/unit/ui/widget-template-editor.test.tsx` | add editor integration | visual sections |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/ctaBanner.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-cta-banner-widget.md`
