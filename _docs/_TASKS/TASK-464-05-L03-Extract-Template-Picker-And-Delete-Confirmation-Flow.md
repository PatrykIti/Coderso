# TASK-464-05-L03: Extract Template Picker And Delete Confirmation Flow
# FileName: TASK-464-05-L03-Extract-Template-Picker-And-Delete-Confirmation-Flow.md

**Parent Subtask:** TASK-464-05
**Priority:** High
**Category:** Pages / Admin UI / Templates
**Estimated Effort:** Medium
**Dependencies:** TASK-464-05-L02
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Extract Page template picker/application flow and delete confirmation flow from
`PageEditor.tsx`. Template application must continue to instantiate fresh
section/block ids through the existing template schema helper.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [x] Move template option loading/rendering UI behind typed props.
- [x] Keep `instantiatePageTemplateSections` as the only id-regeneration path.
- [x] Move delete confirmation state/rendering behind typed props.
- [x] Preserve confirmation copy and button labels.
- [x] Add tests for template apply and delete confirmation.

---

## Implementation Pseudocode

```tsx
export function applyTemplateToDocument(
  document: PageDocumentV2,
  templateDocument: PageDocumentV2
): PageDocumentV2 {
  const freshSections = instantiatePageTemplateSections(templateDocument);
  return appendTemplateSections(document, freshSections);
}

export function DeleteSelectionDialog(props: DeleteSelectionDialogProps) {
  return <ConfirmDialog title={props.title} confirmLabel={props.confirmLabel} onConfirm={props.onConfirm} />;
}
```

Expected data flow:

- Host template library remains injected through `PageEditorHost`.
- Template summaries render as text.
- Template application preserves the current append-only behavior unless
  TASK-464-01 parity evidence proves an existing targeted template path.
- Delete confirmation calls parent action only after explicit confirm.

Error handling:

- Template load failure leaves document unchanged and shows existing bounded
  error copy.
- No template target is accepted in this leaf; target-aware insertion must be a
  separate behavior task if parity evidence does not already exist.

Regression-test shape:

- Template option appears in command palette.
- Applying template regenerates ids.
- Delete block/section confirmation copy and callbacks remain unchanged.

---

## Security Contract

- Template names/descriptions render as text only.
- Template documents normalize/instantiate before insertion.
- Template insertion is append-only for the current contract; do not introduce
  target-aware insertion while extracting.
- Delete confirmation must not log raw document content.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-template-picker.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
