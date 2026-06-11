# TASK-421-03: Section And Block Panel Preset Coverage
# FileName: TASK-421-03-Section-And-Block-Panel-Preset-Coverage.md

**Parent Task:** TASK-421
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-421-02
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Ensure the floating inspector exposes the right small preset surface for Page v2
sections and atomic blocks. This is deliberately smaller than old widget editor
surfaces: common controls for layout, style, background, spacing, responsive,
visibility, and typography, plus limited type-specific content controls.

---

## Implementation Pseudocode

```ts
function resolveInspectorPanelModel(selection) {
  if (selection.kind === "section") {
    return buildSectionPanelPresetModel(selection.sectionType);
  }
  return buildBlockPanelPresetModel(selection.blockType);
}

function buildSectionPanelPresetModel(type) {
  return {
    layout: ["variant", "columns", "align", "justify", "maxWidth"],
    style: ["accent", "radius", "shadow", "cardSurface"],
    spacing: ["paddingY", "paddingX", "gap"],
    background: ["backgroundType", "background", "backgroundImage"],
    responsive: ["breakpointState"], // category shell + readout only; control content owned by TASK-425
    visibility: ["visible", "authOnly", "dateRange", "anchor"]
  };
}
```

Expected data flow:

- Preserve existing Page v2 document paths.
- Group related controls in the same category order as the reference.
- Do not reintroduce large widget-specific panels.
- The Responsive category ships only as a panel shell with the breakpoint-state
  readout. Its control content (hide-on-screen toggles, vertical-layout toggle,
  per-field override list, reset actions, device readouts) is owned by TASK-425
  (TASK-425-01-L01 contract, TASK-425-02-L01 implementation); this subtask must
  not add Responsive-panel controls.

Regression-test shape:

- DOM tests cover representative section and block selections per category.
- Save payload tests prove grouped controls update the same data paths.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** Page v2 schemas remain source of truth.
- **Anti-abuse controls:** no unsafe arbitrary CSS/script controls.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- None beyond the parent family docs; TASK-421-05 owns board/changelog sync.

---

## Completion Notes

Completed 2026-06-11: RegistryControlField/SectionRegistryControlField route every control through the adapter into the primitives; color/media no longer fall through to text; supplemental background-image field uses the media path; section variant control is segmented; Visibility gains the date-range toggle; Responsive panel stays shell-only per TASK-425 ownership.
