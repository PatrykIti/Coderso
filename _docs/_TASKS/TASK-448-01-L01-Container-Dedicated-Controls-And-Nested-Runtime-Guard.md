# TASK-448-01-L01: Container Dedicated Controls And Nested Runtime Guard
# FileName: TASK-448-01-L01-Container-Dedicated-Controls-And-Nested-Runtime-Guard.md

**Parent Subtask:** TASK-448-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-448-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Adopt the shared dedicated controls for Container while preserving the current
working nested-layout persistence and published runtime behavior.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Container has no per-type rows; it still resolves universal block controls
// through the real registry accessor.
const containerControls = getPageEditorControlsForTarget({
  kind: "block",
  type: "container",
}); // pageEditorControlRegistry.ts:870-890

// Runtime guard: published nested output flows through PageDocumentRender /
// renderPageBlockContent. Assert against renderer output, not fictional helpers.
expect(html).toContain('data-page-block="container"'); // toPageBlockRenderProps, pageRendererV2.tsx:529-539
expect(html).toContain('data-page-block-slot="children"'); // renderPageLayoutBlockContent, pageRendererV2.tsx:1256-1369
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageEditorControlUiModel.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Container controls migrate to the shared dedicated widgets.
- Nested child rendering and persistence remain unchanged.

Error handling:

- Unknown Container variants/flags fall back safely.
- Control migration must not disturb nested child slots.

Regression-test shape:

- UI coverage for dedicated controls and runtime coverage for nested rendering.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Container fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Nested layout/runtime coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
