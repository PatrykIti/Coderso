# TASK-464-03-L03: Extract Inline Edit And Canvas Runtime Binding Wiring
# FileName: TASK-464-03-L03-Extract-Inline-Edit-And-Canvas-Runtime-Binding-Wiring.md

**Parent Subtask:** TASK-464-03
**Priority:** High
**Category:** Pages / Admin UI / Canvas Security
**Estimated Effort:** Medium
**Dependencies:** TASK-464-03-L02
**Status:** ⏳ To Do

---

## Overview

Extract the canvas inline-edit wrapper wiring and canvas-only runtime binding
data plumbing into the Page authoring canvas module. Preserve existing inline
edit behavior and current collection/form/embed preview fail-closed states.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Move inline text renderer adapter into the canvas module.
- [ ] Keep sanitizer ownership in `pageInlineEditContract` until TASK-464-06
      centralizes shared helpers.
- [ ] Pass `canvasDataByBlockId` through typed props.
- [ ] Add tests for inline edit markers and unsafe text behavior.

---

## Implementation Pseudocode

```tsx
export function createPageCanvasInlineTextRenderer(input: InlineRendererInput) {
  return function renderInlineText({ block, propPath, text }: PageInlineTextInput) {
    return (
      <InlineEditableCanvasText
        block={block}
        propPath={propPath}
        text={text}
        selected={block.id === input.selectedBlockId}
        editing={input.isEditing(block.id, propPath)}
        onStartEdit={input.actions.startInlineEdit}
        onCommit={input.actions.commitInlineEdit}
      />
    );
  };
}
```

Expected data flow:

- Shared renderer asks the canvas adapter to render editable text.
- Commit still routes to the existing inline-edit contract before mutation.
- Preview binding data stays canvas-only and is never persisted.

Error handling:

- Invalid inline target resolves to no-op.
- Preview binding load failures render existing fail-closed preview state.

Regression-test shape:

- Inline text selection/edit markers.
- Commit sanitizes unsafe text before persistence.
- Canvas preview binding data is not included in save payloads.

---

## Security Contract

- Inline edit commits must sanitize text before document mutation.
- Preview binding data must not be persisted or leaked to host cache.
- No raw HTML rendering in inline canvas wrappers.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
