# TASK-440-01-L01: Image Media Picker And Dedicated Controls
# FileName: TASK-440-01-L01-Image-Media-Picker-And-Dedicated-Controls.md

**Parent Subtask:** TASK-440-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-440-01
**Status:** ⏳ To Do

---

## Overview

Replace raw URL entry with the shared media-picker path for Image and adopt the
shared dedicated layout/style controls without regressing current runtime
rendering.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
renderMediaPickerControl("image");
renderBlockControls(getBlockControlsForType("image"));
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

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
