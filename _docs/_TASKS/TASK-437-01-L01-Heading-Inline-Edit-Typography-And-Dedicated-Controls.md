# TASK-437-01-L01: Heading Inline Edit Typography And Dedicated Controls
# FileName: TASK-437-01-L01-Heading-Inline-Edit-Typography-And-Dedicated-Controls.md

**Parent Subtask:** TASK-437-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-437-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Adopt the inline-edit and typography flows for Heading and verify the heading
panels render the shared dedicated control widgets. Ownership boundary:
TASK-421 owns the widget primitives and block preset panels, TASK-422 owns the
inline-edit mechanism (including the `heading.text` target), and TASK-424 owns
typography — this leaf only wires and verifies Heading adoption and closes any
heading-specific residue after those land. Inline-edit entry/commit machinery
is owned by TASK-422 (the `inlineEditableTargets` map in
`core/services/pages/pageInlineEditContract.ts` — new module owned by
TASK-422-01-L01 — plus the shared canvas contenteditable flow); this leaf only
registers the heading targets in that map and verifies behavior.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Inline edit: the heading target ({ blockType: "heading", propPath: "text" })
// is an entry in the TASK-422-owned static inlineEditableTargets literal
// (core/services/pages/pageInlineEditContract.ts — new module owned by
// TASK-422-01-L01); the shared canvas contenteditable entry/commit flow is
// TASK-422-02-L01's. This leaf only verifies the heading entry resolves and
// commits — it implements no registration API of its own.
const headingTarget = resolveInlineEditTarget(headingBlock, "text"); // must be non-null

// Controls: the real registry accessor is getPageEditorControlsForTarget
// (core/services/pages/pageEditorControlRegistry.ts:508); heading rows live at
// pageEditorControlRegistry.ts:362-374 (text/level/align, align already
// `input: "segmented"`).
const headingControls = getPageEditorControlsForTarget({ kind: "block", type: "heading" });
// Verify RegistryControlField (core/admin/ui/pages/PageEditor.tsx ~2524-2614)
// renders them through the shared TASK-421 widgets and the TASK-424 typography
// descriptors once those families land.
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

- Heading text can be edited on canvas and in the inspector through one owner
  path.
- Typography values re-render canvas and runtime output consistently.
- Width/align/style controls use the shared dedicated widgets.

Error handling:

- Empty required Heading text falls back to the current valid value.
- Unknown heading levels or typography values fall back safely.

Regression-test shape:

- Vitest UI coverage for inline edit, typography changes, and runtime output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Heading fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Heading runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
