# TASK-050-05: Hero Widget Expansion + Slots
# FileName: TASK-050-05_Hero_Widget_Expansion_and_Slots.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** ✅ Done (2026-02-04)

---

## Overview

Expand the Hero widget to match the documented v1 specification, and add a
`content` slot for nested widgets (e.g. badge, mini-form, extra CTA row).

---

## Slot Design (Hero)

- Slot ID: `content`
- Label: `Hero Content`
- Placement: **inside hero**, under CTA area.
- `maxItems`: optional (e.g. 3)
- `allowedTypes`: optional (e.g. forms + content widgets only)

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/HERO.md`:

- Content: `headline`, `subhead`, `body`
- CTA: `primaryCta`, `secondaryCta`
- Media: `type`, `src`, `alt`, `ratio`, `overlay`
- Layout: `align`, `maxWidth`, `contentWidth`
- Spacing: `paddingTop`, `paddingBottom`
- Background: `color`, `gradient`, `image`
- Responsive: `hideMediaOnMobile`

Notes:
- Reconcile widget-level `layout` fields with block-level `layout` to avoid collisions.
- Update JSON schema + defaults to fully support the documented fields.

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Goal (lead / sales / info) → adjusts default copy
2) Layout (centered / split / media-left)
3) Media (none / image / video)
4) CTA (single / dual)

### Visual
- Visual variant cards
- Only render fields relevant to the selected variant

### Advanced
- Full control for layout + spacing + background + responsive
- Validation for CTA hrefs (basic) and media URLs

---

## Rendering Requirements

Update `HeroBlock` to:
- Render media by variant
- Apply layout styles
- Render `slots.content` inside hero body, below CTAs

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/hero.tsx` | expand `HeroData`, schema, defaults | align with docs |
| `core/widgets/core/hero.tsx` | add `slots` definition | `content` slot |
| `core/widgets/core/hero.tsx` | render `slots.content` | placement below CTAs |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | expand wizard flow | per docs |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | expand visual + advanced | per docs |
| `tests/unit/widgets/hero.test.tsx` | cover new defaults/schema | add slot case |
| `tests/unit/widgets/renderer.test.tsx` | verify slot content renders | hero child block |

---

## Testing Requirements

- Unit: schema validates all documented fields.
- Unit: hero renderer places slot content correctly.
- UI: wizard/visual/advanced field coverage (snapshot or render tests).

---

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md` (final field list + slot usage)
- `_docs/WIDGETS.md` (slot support overview)
- `_docs/PAGE_MODEL.md` (slot example snippet)

---

## Follow-up Sub-Tasks (Post-Done)

- `TASK-050-05-01_Hero_Widget_Bugfixes_and_UX_Hardening.md`
  - Stabilize Wizard media flow and clarify slot/CTA UX copy.
- `TASK-050-05-02_Hero_Widget_Visual_Rebuild_and_Advanced_Cleanup.md`
  - Rebuild Hero Visual IA, add working presets modal, and clean Advanced mode scope.
