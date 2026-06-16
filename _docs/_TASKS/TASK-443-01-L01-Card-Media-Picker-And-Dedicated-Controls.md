# TASK-443-01-L01: Card Media Picker And Dedicated Controls
# FileName: TASK-443-01-L01-Card-Media-Picker-And-Dedicated-Controls.md

**Parent Subtask:** TASK-443-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-443-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Replace raw URL entry with the shared media-picker path for Card image content
and adopt the shared dedicated layout/style controls without regressing current
runtime rendering.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Registry already declares card.image as `input: "media"`
// (core/services/pages/pageEditorControlRegistry.ts:429-433); the media-picker
// primitive is TASK-421-02-L02's. The real registry accessor is
// getPageEditorControlsForTarget (pageEditorControlRegistry.ts:508).
const cardControls = getPageEditorControlsForTarget({ kind: "block", type: "card" });
// Verify RegistryControlField (core/admin/ui/pages/PageEditor.tsx ~2524-2614)
// resolves the card image through the shared picker (today `input: "media"`
// falls through to the raw TextField) and renders the card layout/style
// controls through the shared TASK-421 widgets, including the Visible switch
// as a toggle.
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

- Card image selection resolves through the shared media picker.
- Existing title/body/link semantics remain unchanged.
- Published runtime keeps rendering a real card block.

Error handling:

- Unsupported media types remain rejected.
- Missing assets degrade to the current safe Card runtime behavior.

Regression-test shape:

- Vitest UI coverage for media picking and runtime coverage for Card rendering.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Card fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Card runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
