# TASK-464-03-L02: Extract Block Frames Ghost Tiles And Slot Affordances
# FileName: TASK-464-03-L02-Extract-Block-Frames-Ghost-Tiles-And-Slot-Affordances.md

**Parent Subtask:** TASK-464-03
**Priority:** High
**Category:** Pages / Admin UI / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-464-03-L01
**Status:** ⏳ To Do

---

## Overview

Extract section block frames, hidden block ghost rendering, section/column/slot
ghost add tiles, add-beside handle, responsive/visibility markers, and block
selection chrome from `PageEditor.tsx`.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Move `CanvasGhostAddTile` and hidden block ghost.
- [ ] Move `renderBlockFrame` implementation into a canvas adapter.
- [ ] Move section column trailing and columns slot trailing affordances.
- [ ] Keep `PageSectionContent` as the shared renderer.
- [ ] Add parity tests for ghost and block markers.

---

## Implementation Pseudocode

```tsx
export function createPageCanvasBlockFrameRenderer(input: CanvasFrameRendererInput) {
  return function renderBlockFrame({ block, content, blockPath, renderProps }: PageBlockFrameInput) {
    const selected = isSamePageBlockPath(blockPath, input.selectedBlockPath);
    return (
      <div
        {...renderProps.dataAttributes}
        data-page-editor-block={block.type}
        data-page-editor-block-id={block.id}
        data-selected={selected ? "true" : undefined}
        onClick={(event) => input.actions.selectBlock(event, blockPath)}
      >
        {block.visibility.visible ? content : <HiddenBlockGhost block={block} />}
      </div>
    );
  };
}
```

Expected data flow:

- Parent canvas adapter supplies selection and action callbacks.
- Block content still comes from the shared Page renderer.

Error handling:

- Stale paths or too-deep slot targets fail closed through existing action
  guards.

Regression-test shape:

- Assert block id/path/depth/slot data attributes, selected marker, hidden
  ghost, ghost tile types, and add-beside handle.

---

## Security Contract

- Block frames render shared renderer content; no new HTML sink.
- Ghost labels are static text.
- Add callbacks must not accept raw unvalidated document patches.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-464*.md`
