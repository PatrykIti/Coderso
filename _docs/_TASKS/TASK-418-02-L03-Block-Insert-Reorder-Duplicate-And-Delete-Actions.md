# TASK-418-02-L03: Block Insert Reorder Duplicate And Delete Actions
# FileName: TASK-418-02-L03-Block-Insert-Reorder-Duplicate-And-Delete-Actions.md

**Parent Subtask:** TASK-418-02
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-418-02-L02
**Status:** ⏳ To Do

---

## Overview

Make block actions first-class editor operations: insert into the intended
section or container slot, reorder, duplicate, and delete selected blocks. The
current add-block flow loses the chosen type when no section is selected and
does not support block-level actions.

---

## Implementation Pseudocode

```ts
function insertBlockAtTarget(document, selection, blockType, position) {
  const block = createPageBlockV2(blockType);
  if (selection.kind === "block") {
    return insertSiblingBlock(document, selection.sectionId, selection.blockPath, block, position);
  }
  if (selection.kind === "section") {
    return appendBlockToSection(document, selection.sectionId, block);
  }
  const section = createStarterSection("content");
  return appendSectionWithBlock(document, section, block);
}

function duplicateSelectedBlock(document, selection) {
  const block = getSelectedBlock(document, selection);
  return block ? insertSiblingBlock(document, selection.sectionId, selection.blockPath, cloneBlock(block), "after") : document;
}

function deleteSelectedBlock(document, selection) {
  return removeBlockAtPath(document, selection.sectionId, selection.blockPath);
}
```

Expected data flow:

- Command palette insertions use the active selection as insertion context.
- Empty-section CTA inserts into that section.
- Action buttons update selection to the inserted/nearest surviving block.

Error handling:

- Disable block actions when no block target is valid.
- Prevent deleting the last meaningful target from leaving stale selection.
- For future nested blocks, prevent moving a parent into its own descendant.

Regression-test shape:

- Adding a button with no selection creates a section containing a button.
- Adding a block with a selected section appends to that section.
- Duplicate/delete/reorder affect only the selected block.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages writes only.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages write permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** inserted/duplicated blocks must be created via Pages v2
  defaults and normalized before save.
- **Anti-abuse controls:** no public write endpoint; no secret-bearing payloads
  in browser storage.

---

## Testing Requirements

- Vitest UI tests for add block without selected section.
- Vitest UI tests for selected block duplicate/delete/reorder.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if action UX
  intentionally diverges from reference.
