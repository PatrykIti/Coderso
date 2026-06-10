# TASK-447-01-L01: Quote Inline Edit Toolbar Labeling And Dedicated Controls
# FileName: TASK-447-01-L01-Quote-Inline-Edit-Toolbar-Labeling-And-Dedicated-Controls.md

**Parent Subtask:** TASK-447-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-447-01
**Status:** ⏳ To Do

---

## Overview

Adopt the shared inline-edit and dedicated control paths for Quote/Cite and
normalize the toolbar label so it stays human and stable across states.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
const toolbarLabel = resolveBlockToolbarLabel(block, { fallback: "Quote" });
renderInlineEditableQuote(block.props);
renderTypographyControls(getBlockControlsForType("quote"));
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

- Quote and cite edits share one owner path across canvas and inspector.
- Toolbar labels prefer stable type names over inconsistent content-derived
  labels.
- Shared style controls adopt the dedicated widgets.

Error handling:

- Empty optional cite remains allowed.
- Unknown typography/style values fall back safely.

Regression-test shape:

- Vitest UI coverage for inline edits, toolbar labels, and runtime output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Quote fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Quote runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
