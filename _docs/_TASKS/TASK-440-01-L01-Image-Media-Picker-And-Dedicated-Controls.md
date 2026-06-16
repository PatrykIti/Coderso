# TASK-440-01-L01: Image Media Picker And Dedicated Controls
# FileName: TASK-440-01-L01-Image-Media-Picker-And-Dedicated-Controls.md

**Parent Subtask:** TASK-440-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-440-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Verify that Image source entry resolves through the shared media-picker path
and that the image panels render the shared TASK-421 widgets, without
regressing current runtime rendering. Ownership boundary: TASK-421-02-L02
implements the media-picker primitive, TASK-421-02-L01/L02 the dedicated
segmented/toggle/slider/swatch widgets, and TASK-421-03-L02 the image block
panel adoption — this leaf only verifies/wires the Image target after those
land and owns image-specific residual gaps.

---

## Sub-Tasks

- [x] Verify the scoped owner-file behavior described below and land any
      image-specific residue.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Registry already declares image.src as `input: "media"`
// (core/services/pages/pageEditorControlRegistry.ts:674-683); no registry change is
// expected unless verification surfaces image-specific media-type metadata.
const imageControls = getPageEditorControlsForTarget({ kind: "block", type: "image" });
// (real accessor at core/services/pages/pageEditorControlRegistry.ts:870-890)

// Verify that the PageEditor registry control switch resolves `input: "media"`
// through the shared TASK-421 picker and that image source selection resolves
// into the saved `src` value.
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx` (verification surface for the shared
  picker/widget adoption)
- `core/services/pages/pageEditorControlRegistry.ts` (only if image-specific
  media metadata is needed)

The leaf's own data flow keeps alt/caption/fit semantics and published runtime
rendering unchanged, so `core/services/pages/pageRendererV2.tsx` and
`core/services/pages/pageDocumentV2.ts` are not owner files here — they are
covered read-only by the regression assertions.

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Image source selection resolves through the shared media picker.
- Existing alt/caption/fit semantics remain unchanged.
- Published runtime keeps rendering a real image block.

Error handling:

- Unsupported media types remain rejected.
- Missing assets degrade to the current safe placeholder/empty behavior.

Regression-test shape:

- Vitest UI coverage for media picking and runtime coverage for rendered Image
  output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Image fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Image runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
