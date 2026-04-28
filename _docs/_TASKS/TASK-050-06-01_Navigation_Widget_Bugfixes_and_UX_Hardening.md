# TASK-050-06-01: Navigation Widget Bugfixes and UX Hardening
# FileName: TASK-050-06-01_Navigation_Widget_Bugfixes_and_UX_Hardening.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-06, TASK-050-04  
**Status:** Done (2026-02-07)

---

## Overview

Follow-up hardening task for Navigation widget before full Visual rebuild.
Goal: remove high-friction editing bugs, align Wizard/Visual behavior with the
documented contract, and stabilize renderer behavior for current variants.

This task focuses on stability and UX correctness. Full IA redesign is handled
in TASK-050-06-02.

---

## Problems To Fix

1. Wizard currently edits only basic label text for first items and does not
   expose full quick path for logo type/image and CTA toggle semantics.
2. Visual mode duplicates variant control behavior with generic panels and has
   weak separation between content editing and style editing.
3. `NavigationBlock` does not use behavior flags consistently (`sticky`,
   `transparent`, `collapseOnScroll`), so users do not see expected output.
4. Navigation items are keyed by `href`, which can produce unstable rendering
   when links repeat or are empty during editing.
5. The widget docs mention submenu support (`children`) but schema/editor path
   is currently inconsistent in practical editing flow.
6. Slot strategy from TASK-050-06 (right actions) is defined in docs but not
   implemented in current runtime/editor path.

---

## Product Decisions (for this task)

1. **Wizard stays minimal but complete**:
   - variant, logo source, first-level menu labels/links, optional CTA.
2. **Behavior flags are visible in output**:
   - sticky and transparent are reflected in runtime class/style mapping.
3. **Current data model is stabilized before rebuild**:
   - no breaking schema changes; additive-only normalization where needed.
4. **Right slot is enabled now**:
   - add `slots.right` and render it in the right action region.

---

## Scope

### A) Wizard UX correctness
- Add reliable logo type/source controls (text/image URL).
- Ensure menu items in Wizard edit both label and href for initial entries.
- Ensure CTA fields are shown only for CTA-capable variants.

### B) Visual mode consistency (light hardening)
- Remove obvious duplicate/misleading labels.
- Keep one coherent variant-selection source for Navigation in current flow.
- Improve helper copy to distinguish canvas vs runtime expectations.

### C) Runtime renderer parity
- Map `behavior.sticky` and `behavior.transparent` to actual nav rendering.
- Keep `collapseOnScroll` as stored behavior flag with safe fallback (no break).
- Stabilize item keys (avoid `href`-only key path).

### D) Right slot MVP
- Add `slots: [{ id: "right", ... }]` to widget definition.
- Render `slots.right` next to CTA area in `NavigationBlock`.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/navigation.tsx` | harden schema/defaults for current model | keep compatibility; prepare for rebuild |
| `core/widgets/core/navigation.tsx` | add `slots.right` definition | slot id `right`, label `Right Actions` |
| `core/widgets/core/navigation.tsx` | render `slots.right` region | right-aligned action row |
| `core/widgets/core/navigation.tsx` | apply behavior flags in runtime output | sticky/transparent visible in preview/runtime |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Wizard hardening | logo type/source + label/href + CTA conditional fields |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Visual copy/field cleanup | remove misleading duplicates |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | align variant UX for Navigation | avoid duplicate variant pickers |
| `tests/unit/widgets/navigation.test.tsx` | create tests | schema/defaults/slot + behavior rendering |
| `tests/unit/widgets/renderer.test.tsx` | extend with navigation slot case | slot content placement in runtime |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | add variant UX assertion | navigation-specific variant control parity |

---

## Acceptance Criteria

1. Wizard allows basic but complete Navigation setup (logo/menu/CTA) without
   jumping to Advanced.
2. Runtime output visibly reflects sticky/transparent behavior flags.
3. Right slot can host nested blocks and renders on nav right side.
4. No duplicate/misleading variant controls for Navigation in Visual flow.
5. Existing saved Navigation blocks remain valid and render correctly.

---

## Testing Requirements

- Unit: schema validation for current and normalized Navigation payloads.
- Unit: runtime render asserts for behavior flags and slot output.
- Unit/UI: Wizard and Visual field presence/conditional behavior.
- Run relevant suites:
  - `bun test tests/unit/widgets/navigation.test.tsx`
  - `bun test tests/unit/widgets/renderer.test.tsx`
  - `bun test tests/unit/pageBuilder/visualPanel.test.tsx`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move TASK-050-06-01 from **To Do** to **Done**
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/NAVIGATION.md`:
  - finalized hardening behavior
  - slot `right` usage
  - wizard field scope.

### Cross-doc consistency
- Update `_docs/WIDGETS.md` for slot behavior and mode responsibility notes.
- Update `_docs/PAGE_MODEL.md` only if Navigation block data shape changes.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-navigation-widget-bugfixes-and-ux-hardening.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Full section-based Visual IA redesign.
- Full Advanced scope cleanup and full style-control parity.
- Navigation preset system (if introduced, do in 050-06-02).
