# TASK-418-05-L02: Container Blocks Inserter And Layers Editing
# FileName: TASK-418-05-L02-Container-Blocks-Inserter-And-Layers-Editing.md

**Parent Subtask:** TASK-418-05
**Priority:** High
**Category:** Admin UI / Pages / Nesting
**Estimated Effort:** Large
**Dependencies:** TASK-418-05-L01, TASK-418-02-L02, TASK-418-02-L03
**Status:** ⏳ To Do

---

## Overview

Expose container/slot blocks in the editor without making every block infinitely
nestable. Command palette, inline insertion zones, layers, selection, drag/move,
duplicate, and delete must understand block paths and named slots.

---

## Implementation Pseudocode

```ts
function getInsertTargets(document, selection) {
  if (selection.kind === "block") {
    const block = getBlockAtPath(document, selection.blockPath);
    if (canAcceptChildren(block)) return getSlotInsertTargets(block);
    return getSiblingInsertTargets(selection.blockPath);
  }
  if (selection.kind === "section") return getSectionBlockInsertTarget(selection.sectionId);
  return getRootSectionInsertTargets(document);
}

function insertIntoSlot(document, sectionId, ownerPath, slotKey, blockType, index) {
  assertSlotAllowed(ownerPath, slotKey, blockType);
  return patchSlot(document, sectionId, ownerPath, slotKey, (blocks) =>
    insertAt(blocks, index, createPageBlockV2(blockType))
  );
}

function buildLayersTree(document) {
  return document.sections.map((section) => ({
    id: section.id,
    children: buildBlockTree(section.blocks)
  }));
}
```

Expected data flow:

- Palette filters block types by selected insertion target capabilities.
- Layers renders section -> block -> slot -> child block tree.
- Block path operations are shared by insert, move, duplicate, delete, select,
  and control patching.

Error handling:

- Prevent moving a node into itself or a descendant.
- Disable insertion when depth/slot limits are reached.
- If a slot owner is removed, selection moves to nearest ancestor.

Regression-test shape:

- Insert heading into a columns slot.
- Move a block between slots.
- Layers selects nested blocks by path.
- Invalid self-descendant move is rejected.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages writes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** UI path operations must respect domain slot capabilities and
  max depth before save.
- **Anti-abuse controls:** no cycles, no unbounded nesting, no public write
  endpoint.

---

## Testing Requirements

- Vitest UI tests for nested insertion and layers selection.
- Vitest pure tests for block path helpers.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
