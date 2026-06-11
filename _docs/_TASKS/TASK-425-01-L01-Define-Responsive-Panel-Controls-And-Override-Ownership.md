# TASK-425-01-L01: Define Responsive Panel Controls And Override Ownership
# FileName: TASK-425-01-L01-Define-Responsive-Panel-Controls-And-Override-Ownership.md

**Parent Subtask:** TASK-425-01
**Priority:** High
**Category:** Admin UI / Pages / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-425-01
**Status:** ⏳ To Do

---

## Overview

Define the metadata, labels, and ownership model for Responsive-panel controls
such as hide-on-screen, vertical-layout toggles, explicit reset actions, and
device readouts.

This leaf (with TASK-425-02-L01 as the implementing leaf) is the explicit owner
of the Responsive panel's control content: hide-on-screen toggles, the
vertical-layout toggle, the per-field override list, reset actions, and device
readouts. TASK-421 provides only the shared widget primitives
(TASK-421-02-L01/L02) and the Responsive panel category shell with its
breakpoint-state readout (TASK-421-03-L01); no TASK-421 leaf defines or
implements Responsive-panel controls.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// Real integration points (verified at HEAD):
// - registry accessor: getPageEditorControlsForTarget
//   (core/services/pages/pageEditorControlRegistry.ts:508)
// - editor control renderers: RegistryControlField / SectionRegistryControlField
//   (core/admin/ui/pages/PageEditor.tsx ~2379-2614)
// - existing override containers: PageBlockResponsiveOverrideV2 /
//   PageSectionResponsiveOverrideV2 (core/services/pages/pageDocumentV2.ts:172-193)
export const pageResponsivePanelControls = defineResponsivePanelControls([
  // defineResponsivePanelControls: new helper, to be created in
  // core/services/pages/pageEditorControlRegistry.ts.
  toggle("visible.desktop"), // base visibility.visible (existing schema field)
  toggle("visible.tablet"), // writes responsive.tablet.visibility.visible (existing override path)
  toggle("visible.mobile"), // writes responsive.mobile.visibility.visible (existing override path)
  toggle("layout.stackVertical"), // NEW schema field — see the 4-layer plan below
  action("resetOverride"), // clears the per-field override for the active breakpoint
]);
```

Vertical-layout toggle — 4-layer plan (mandatory before the toggle ships):

`stackVertical` does not exist in the schema today; `PageSectionLayoutV2` is
only `columns/align/justify/maxWidth` (`pageDocumentV2.ts:115-120`). It is
declared here as a new schema field and must land through all four layers,
otherwise the toggle is a visual no-op mock control:

1. Schema + normalizer: add optional `stackVertical` to `PageSectionLayoutV2`
   and accept it through the existing layout normalizers and the
   `responsive[bp].layout` override container in
   `core/services/pages/pageDocumentV2.ts`.
2. Renderer: `core/services/pages/pageRendererV2.tsx` consumes the field and
   produces a visible vertical stacking difference on canvas and published
   front (a visible layout change, not a class-string-only change).
3. Runtime delivery: coordinate with TASK-423 so the responsive CSS emission
   contract covers the new layout delta in published `@media` output.
4. Widget: the Responsive panel toggle (TASK-425-02-L01) renders it via the
   shared TASK-421 toggle primitive.

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageDocumentV2.ts`
- `core/services/pages/pageRendererV2.tsx` (renderer consumption of the new
  `stackVertical` field — layer 2 of the plan above)

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Hide-on-screen uses the existing responsive visibility override path:
  `responsive[bp].visibility.visible` is already schema-owned for sections
  (`PageSectionResponsiveOverrideV2`, `pageDocumentV2.ts:188-193`) and blocks
  (`PageBlockResponsiveOverrideV2`, `pageDocumentV2.ts:172-176`); the desktop
  toggle maps to the base `visibility.visible`. No new schema fields for hide.
- The vertical-layout toggle writes the new `layout.stackVertical` field via
  the existing `responsive[bp].layout` override container, per the 4-layer
  plan above. No `stackOnMobile` field exists or is introduced.
- Labels distinguish Base, Override, and Inherited states explicitly.
- Device widths come from one shared constant source.

Error handling:

- Unsupported targets render no control rather than a fake toggle.
- Reset actions only appear when an override actually exists.

Regression-test shape:

- Vitest covers state projection, visibility of resets, and label/readout logic.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** panel metadata may only address schema-owned override
  fields; `stackVertical` becomes schema-owned through layer 1 of the 4-layer
  plan before any widget may write it.

---

## Testing Requirements

- Relevant Vitest coverage for responsive control metadata/state.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
