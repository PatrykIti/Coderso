# TASK-464-05-L03: Extract Template Picker And Delete Confirmation Flow
# FileName: TASK-464-05-L03-Extract-Template-Picker-And-Delete-Confirmation-Flow.md

**Parent Subtask:** TASK-464-05
**Priority:** High
**Category:** Pages / Admin UI / Templates
**Estimated Effort:** Medium
**Dependencies:** TASK-464-05-L02
**Status:** ⏳ To Do

---

## Overview

Extract Page template picker/application flow and delete confirmation flow from
`PageEditor.tsx`. Template application must continue to instantiate fresh
section/block ids through the existing template schema helper.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Move template option loading/rendering UI behind typed props.
- [ ] Keep `instantiatePageTemplateSections` as the only id-regeneration path.
- [ ] Move delete confirmation state/rendering behind typed props.
- [ ] Preserve confirmation copy and button labels.
- [ ] Add tests for template apply and delete confirmation.

---

## Implementation Pseudocode

```tsx
export function applyTemplateToDocument(
  document: PageDocumentV2,
  templateDocument: PageDocumentV2,
  target: PageTemplateInsertTarget
): PageDocumentV2 {
  const freshSections = instantiatePageTemplateSections(templateDocument);
  return insertTemplateSections(document, freshSections, target);
}

export function DeleteSelectionDialog(props: DeleteSelectionDialogProps) {
  return <ConfirmDialog title={props.title} confirmLabel={props.confirmLabel} onConfirm={props.onConfirm} />;
}
```

Expected data flow:

- Host template library remains injected through `PageEditorHost`.
- Template summaries render as text.
- Delete confirmation calls parent action only after explicit confirm.

Error handling:

- Template load failure leaves document unchanged and shows existing bounded
  error copy.
- Missing target appends according to current behavior.

Regression-test shape:

- Template option appears in command palette.
- Applying template regenerates ids.
- Delete block/section confirmation copy and callbacks remain unchanged.

---

## Security Contract

- Template names/descriptions render as text only.
- Template documents normalize/instantiate before insertion.
- Delete confirmation must not log raw document content.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
