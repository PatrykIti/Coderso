# TASK-450-01-L01: Group Direction Wrap Gap And Dedicated Controls
# FileName: TASK-450-01-L01-Group-Direction-Wrap-Gap-And-Dedicated-Controls.md

**Parent Subtask:** TASK-450-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-450-01
**Status:** ⏳ To Do

---

## Overview

Adopt the shared dedicated controls for Group direction, wrap, and gap while
preserving the current working nested-runtime behavior.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
renderBlockControls(getBlockControlsForType("group"));
expect(renderPublishedGroup(block)).toContain('data-page-block="group"');
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

- Group direction/wrap/gap migrate to segmented, toggle, and slider widgets.
- Nested runtime/persistence remain unchanged.

Error handling:

- Unknown Group values fall back safely.
- Control migration must not disturb nested child rendering.

Regression-test shape:

- UI coverage for dedicated controls and runtime coverage for Group rendering.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Group fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Group runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
