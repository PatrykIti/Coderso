# TASK-464-02-L02: Extract Selection Device And Toolbar State Helpers
# FileName: TASK-464-02-L02-Extract-Selection-Device-And-Toolbar-State-Helpers.md

**Parent Subtask:** TASK-464-02
**Priority:** High
**Category:** Pages / Admin UI / State
**Estimated Effort:** Medium
**Dependencies:** TASK-464-02-L01
**Status:** ⏳ To Do

---

## Overview

Extract pure helpers for Page Editor selection, active device readouts, selected
block derivation, active toolbar panel defaults, collapsed state, drag offset,
and toolbar canvas clearance calculations.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Extract `PageEditorSelectionState` and selection derivation helpers.
- [ ] Extract selected section/block label and metadata derivation.
- [ ] Extract toolbar panel defaulting for regular hosts and appearance-panel
      hosts.
- [ ] Extract pure clearance/offset helpers where possible.
- [ ] Add pure tests.

---

## Implementation Pseudocode

```ts
export function resolvePageEditorSelection(
  document: PageDocumentV2,
  selection: PageEditorSelectionState
): ResolvedPageEditorSelection {
  const section = document.sections.find((item) => item.id === selection.selectedSectionId) ?? null;
  const block = section && selection.selectedBlockPath
    ? getPageBlockAtPath(section, selection.selectedBlockPath)
    : null;
  return { section, block, selectedBlockId: block?.id ?? null };
}

export function getInitialToolbarPanel(hasHostAppearance: boolean): ToolbarPanel {
  return hasHostAppearance ? "host-appearance" : "content";
}
```

Expected data flow:

- React state stays in `PageEditor`.
- Pure helpers become reusable by canvas, toolbar, and layers modules.

Error handling:

- Stale block paths resolve to null rather than throwing.
- Missing selected section resolves to null and leaves parent shell responsible
  for reselection.

Regression-test shape:

- Selection derivation for section, block, stale block path, empty document, and
  nested block path.
- Toolbar default tests for page/template/menu hosts.

---

## Security Contract

- Pure helpers must not import UI, clients, server, DB, runtime, storage, or
  provider code.
- Helpers must not serialize author data into logs.

---

## Testing Requirements

- New Vitest suite for extracted state helpers.
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-464*.md`
