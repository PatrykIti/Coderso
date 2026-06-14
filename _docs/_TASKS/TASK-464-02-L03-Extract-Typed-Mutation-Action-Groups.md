# TASK-464-02-L03: Extract Typed Mutation Action Groups
# FileName: TASK-464-02-L03-Extract-Typed-Mutation-Action-Groups.md

**Parent Subtask:** TASK-464-02
**Priority:** High
**Category:** Pages / Admin UI / Mutation Contracts
**Estimated Effort:** Medium
**Dependencies:** TASK-464-02-L02
**Status:** ⏳ To Do

---

## Overview

Define typed action groups that later extracted modules consume instead of
capturing large closures from `PageEditor.tsx`. This leaf prepares the canvas,
toolbar, layers, command palette, template picker, and host appearance panel
extractions.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Define `PageAuthoringCanvasActions`.
- [ ] Define `PageFloatingToolbarActions`.
- [ ] Define `PageLayersActions`.
- [ ] Define `PageCommandPaletteActions`.
- [ ] Define `PageTemplatePickerActions`.
- [ ] Wire existing callbacks through these groups without behavior changes.

---

## Implementation Pseudocode

```ts
export type PageAuthoringCanvasActions = {
  selectSection(sectionId: string | null): void;
  selectBlock(path: PageBlockPath): void;
  addBlock(target?: PageBlockInsertTarget, options?: { column?: number }): void;
  addBlockBeside(path: PageBlockPath): void;
  startInlineEdit(target: PageEditorInlineEditTarget): void;
  commitInlineEdit(commit: PageEditorInlineEditCommit): void;
};

export type PageFloatingToolbarActions = {
  duplicateSelection(): void;
  requestDeleteSelection(): void;
  moveSelection(direction: -1 | 1): void;
  openAddBeside(): void;
};
```

Expected data flow:

- `PageEditor` still owns document mutation.
- Extracted modules call typed actions only.
- No module writes raw document patches unless that is its explicit contract.

Error handling:

- Invalid action targets fail closed in the parent mutation helper.
- Existing toasts/errors remain unchanged.

Regression-test shape:

- Type-level coverage through usage.
- Existing UI tests prove action behavior did not change.

---

## Security Contract

- Action payloads must be typed and avoid `any`.
- Actions must not accept unknown arbitrary patch objects for persistence.
- Sanitizer-specific actions must be routed through TASK-464-06 helpers when
  they become available.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
