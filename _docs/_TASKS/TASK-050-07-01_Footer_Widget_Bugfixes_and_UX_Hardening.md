# TASK-050-07-01: Footer Widget Bugfixes and UX Hardening
# FileName: TASK-050-07-01_Footer_Widget_Bugfixes_and_UX_Hardening.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-07, TASK-050-04  
**Status:** Done (2026-02-07)

---

## Overview

Hardening step for Footer widget before full Visual rebuild.  
Goal: remove high-friction editing issues, deliver slot MVP promised in
`TASK-050-07`, and stabilize runtime behavior for current variants.

This task is about correctness and editor usability. Full IA redesign is done
in `TASK-050-07-02`.

---

## Problems To Fix

1. Footer slot design is documented but not implemented in widget definition
   and renderer (`column-1`, `column-2`, `column-3`, `bottom`).
2. Wizard covers only column titles, so basic footer setup still requires
   Advanced mode for normal editing.
3. Visual and Advanced flows are inconsistent:
   - Visual has only copyright input,
   - Advanced uses comma text parsing and destroys link href intent.
4. Variant and column shape can drift (`columns-3` with 2 columns, `minimal`
   with many columns) without deterministic normalization.
5. Renderer keys use `href` directly for links/social, which can be unstable
   during editing and with duplicate placeholders.
6. Footer has no dedicated widget unit tests for schema/defaults/renderer slot
   placement, increasing regression risk.

---

## Product Decisions (for this task)

1. **Keep model backward compatible**:
   - additive changes only,
   - normalize old payloads at runtime/editor boundary.
2. **Implement slot MVP now**:
   - `column-1`, `column-2`, `column-3`, `bottom`,
   - render slots in deterministic placement by active variant.
3. **Wizard stays minimal but complete**:
   - variant,
   - column titles with first link label/href quick path,
   - legal basics and social basics.
4. **Advanced must be non-destructive**:
   - no lossy comma parsing,
   - structured list fields for link label + href.

---

## Scope

### A) Slot MVP and runtime placement
- Add slot definitions in Footer widget metadata.
- Render each slot in expected region:
  - `column-1..3` inside grid columns,
  - `bottom` in lower legal strip.

### B) Editor hardening (Wizard/Visual/Advanced)
- Wizard: provide practical first-pass editing without jumping across tabs.
- Visual: remove misleading/duplicate controls and align wording with runtime.
- Advanced: replace lossy link editing with explicit structured fields.

### C) Schema/default normalization and renderer stability
- Normalize column count based on active variant.
- Keep legal/social optional but safe by default.
- Use stable keys for links/social during temporary draft states.

### D) Baseline test coverage
- Add Footer-specific widget tests.
- Add renderer slot placement coverage.
- Add basic UI/editor coverage for critical fields.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/footer.tsx` | add `slots` definition (`column-1`,`column-2`,`column-3`,`bottom`) | documented slot contract |
| `core/widgets/core/footer.tsx` | render slot regions in FooterBlock | per variant and strip placement |
| `core/widgets/core/footer.tsx` | normalize columns by variant + stabilize keys | avoid drift and render churn |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | harden Wizard quick path | titles + first link + legal/social basics |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | replace destructive Advanced link input model | label/href structured editing |
| `tests/unit/widgets/footer.test.tsx` | create tests for schema/defaults/variant normalization | legacy compatibility included |
| `tests/unit/widgets/renderer.test.tsx` | add Footer slot rendering assertions | column + bottom slot |
| `tests/unit/ui/widget-template-editor.test.tsx` | add Footer editor integration assertions | key fields present in builder |

---

## Acceptance Criteria

1. Footer widget supports documented slots and renders them in correct regions.
2. Wizard enables complete first-pass Footer setup without raw text hacks.
3. Advanced no longer uses lossy comma parsing for links.
4. Variant/column behavior is deterministic and backward compatible.
5. Footer has dedicated tests for schema/defaults/slot rendering.

---

## Testing Requirements

- Unit: Footer schema/default compatibility tests (old + normalized payloads).
- Unit: Footer renderer slot placement tests.
- Unit/UI: Footer editor field presence and basic behavior.
- Run relevant suites:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/footer.test.tsx`
  - `bun test tests/unit/widgets/renderer.test.tsx`
  - `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move `TASK-050-07-01` from **In Progress** to **Done**,
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/FOOTER.md`:
  - slot contract and placement,
  - wizard/visual/advanced scope after hardening.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` for Footer slot behavior and editor scope notes.
- Update `_docs/PAGE_MODEL.md` only if footer payload shape changes.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-footer-widget-bugfixes-and-ux-hardening.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Full section-based Visual IA rebuild.
- Advanced mode final technical-only split.
- Footer presets system and cross-widget preset engine.
