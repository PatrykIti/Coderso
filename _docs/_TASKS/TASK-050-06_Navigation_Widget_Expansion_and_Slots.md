# TASK-050-06: Navigation Widget Expansion + Slots
# FileName: TASK-050-06_Navigation_Widget_Expansion_and_Slots.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** Done (2026-02-07)

---

## Overview

Expand the Navigation widget to match the documented v1 spec and add slots for
right-side actions (CTA/login/lang switcher). Support richer logo options,
menu items, and behaviors.

Execution is split into two detailed subtasks:

- `TASK-050-06-01` Navigation Widget Bugfixes and UX Hardening
- `TASK-050-06-02` Navigation Widget Visual Rebuild and Advanced Cleanup

---

## Slot Design (Navigation)

- Slot ID: `right`
- Label: `Right Actions`
- Placement: **right side of nav bar**
- Typical items: CTA, login button, language switcher
- Optional future slot: `left` (for custom logo block)

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/NAVIGATION.md`:

- Logo: `{ type: "text" | "image", value/src, alt }`
- Items: `{ label, href, children? }`
- CTA: `{ label, href }`
- Behavior: `sticky`, `transparent`, `collapseOnScroll`
- Layout: `alignment`, `spacing`

Notes:
- Ensure `items.children` is supported for dropdowns.
- Extend schema + defaults to include all options.

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Style (simple / with-cta / split)
2) Logo (text / image)
3) Menu items (min 2-3, quick add)
4) CTA (optional)

### Visual
- Variant cards (simple / with-cta / split)
- Quick CTA preview and placement options

### Advanced
- Behavior toggles (sticky, transparent, collapse on scroll)
- Alignment + spacing controls
- Optional submenu depth limit

---

## Rendering Requirements

Update `NavigationBlock` to:
- Render logo (text or image)
- Render items with optional dropdowns
- Render CTA if configured
- Render `slots.right` as right-aligned action row

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/navigation.tsx` | expand `NavigationData`, schema, defaults | per docs |
| `core/widgets/core/navigation.tsx` | add `slots` definition | `right` slot |
| `core/widgets/core/navigation.tsx` | render `slots.right` | right-aligned |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | expand wizard flow | logo/items/cta |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | expand visual + advanced | behaviors + layout |
| `tests/unit/widgets/navigation.test.tsx` | add/extend tests | schema + defaults |
| `tests/unit/widgets/renderer.test.tsx` | verify slot render | right slot content |

---

## Sub-Tasks

- **TASK-050-06-01:** Navigation Widget Bugfixes and UX Hardening  
  Scope: stabilization of Wizard/Visual behavior, renderer behavior parity,
  slot `right` MVP, and regression tests.
- **TASK-050-06-02:** Navigation Widget Visual Rebuild and Advanced Cleanup  
  Scope: section-based Visual IA, Advanced cleanup, final data-shape alignment,
  and full UX parity with Hero editing quality.

---

## Testing Requirements

- Unit: schema validation for nested menu items.
- Unit: renderer places slot content in right region.
- UI: wizard/visual/advanced fields present.

---

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md` (final data model + slot usage)
- `_docs/WIDGETS.md` (slot support overview)
- `_docs/PAGE_MODEL.md` (slot example snippet)
