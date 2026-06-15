# TASK-464-05-L01: Extract Layers Tree And Row Actions
# FileName: TASK-464-05-L01-Extract-Layers-Tree-And-Row-Actions.md

**Parent Subtask:** TASK-464-05
**Priority:** High
**Category:** Pages / Admin UI / Layers
**Estimated Effort:** Medium
**Dependencies:** TASK-464-03-L03
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Extract the layers overlay, section rows, nested block rows, slot labels, row
actions, and select/add/move/add-beside callbacks into a dedicated module.

Hard constraint: no UX/UI changes. Preserve row labels, indentation, button
order, empty labels, data attributes, and behavior.

---

## Sub-Tasks

- [x] Move `LayerBlockRows` and related layer helpers.
- [x] Create typed `PageEditorLayers` props/actions.
- [x] Keep nested path creation and slot labels identical.
- [x] Add layers parity tests.

---

## Implementation Pseudocode

```tsx
export function PageEditorLayers({ document, selection, actions }: PageEditorLayersProps) {
  return (
    <LayersOverlay>
      {document.sections.map((section, sectionIndex) => (
        <LayerSectionRow
          section={section}
          selected={section.id === selection.selectedSectionId}
          onSelect={() => actions.selectSection(section.id)}
        />
      ))}
    </LayersOverlay>
  );
}
```

Expected data flow:

- Layers module reads document and selection.
- It emits typed path/target callbacks to parent.

Error handling:

- Stale or invalid paths fail closed through parent actions.

Regression-test shape:

- Section selection, nested block selection, add-to-slot, move target, and
  add-beside markers remain stable.

---

## Security Contract

- Row labels render as text only.
- Layer actions must not mutate raw document objects directly.
- Module remains browser-safe and client-free.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-464*.md`
