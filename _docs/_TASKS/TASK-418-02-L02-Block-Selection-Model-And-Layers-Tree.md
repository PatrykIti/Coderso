# TASK-418-02-L02: Block Selection Model And Layers Tree
# FileName: TASK-418-02-L02-Block-Selection-Model-And-Layers-Tree.md

**Parent Subtask:** TASK-418-02
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-02-L01
**Status:** ⏳ To Do

---

## Overview

Introduce a real selection model for sections and blocks. Clicking a block on
the canvas must select that block, the floating toolbar must describe the
selected target, layers must show section and block nodes, and assistant active
surface context must include the selected block path when relevant.

---

## Implementation Pseudocode

```ts
type BlockPathSegment = { kind: "blocks"; index: number } | { kind: "slot"; key: string; index: number };
type BlockPath = BlockPathSegment[];

type PageEditorSelection =
  | { kind: "none" }
  | { kind: "section"; sectionId: string }
  | { kind: "block"; sectionId: string; blockPath: BlockPath; blockId: string };

function selectSection(sectionId: string): PageEditorSelection {
  return { kind: "section", sectionId };
}

function selectBlock(sectionId: string, blockPath: BlockPath, blockId: string): PageEditorSelection {
  return { kind: "block", sectionId, blockPath, blockId };
}

function summarizeActiveSurface(document, selection) {
  return {
    selectedSectionId: selection.kind === "none" ? null : selection.sectionId,
    selectedBlockId: selection.kind === "block" ? selection.blockId : null,
    selectedBlockPath: selection.kind === "block" ? selection.blockPath : null,
    sections: summarizeSectionTree(document.sections)
  };
}
```

Expected data flow:

- Canvas clicks dispatch section/block selection without losing dirty state.
- Layers use the same tree selectors as canvas.
- Floating toolbar reads a normalized selected target descriptor.
- Assistant context receives selected block id/path and child/slot summaries.

Error handling:

- If selected target disappears after delete/reorder, fall back to nearest
  surviving section or no selection.
- Invalid block paths must not throw during render; show no selected block.

Regression-test shape:

- Clicking a block selects only that block.
- Toolbar label switches from section to block.
- Layers selects and scrolls to the same target.
- Assistant context includes selected block id/path.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session for subsequent saves.
- **RBAC:** existing Pages permissions at route layer.
- **CSRF:** existing admin write CSRF behavior for saves.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** selection paths are UI state only; persisted documents still
  normalize through the Pages owner.
- **Anti-abuse controls:** assistant context must not include secrets or
  unbounded raw block payloads.

---

## Testing Requirements

- Vitest UI tests for section/block selection and layers selection.
- Vitest assistant surface context test for selected block id/path.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if `blockPath` becomes documented assistant/admin
  metadata.
- `_docs/ASSISTANT_SITE_BUILDER.md` if active surface docs mention Pages.
