# TASK-418-05-L02: Container Blocks Inserter And Layers Editing
# FileName: TASK-418-05-L02-Container-Blocks-Inserter-And-Layers-Editing.md

**Parent Subtask:** TASK-418-05
**Priority:** High
**Category:** Admin UI / Pages / Nesting
**Estimated Effort:** Large
**Dependencies:** TASK-418-05-L01, TASK-418-02-L02, TASK-418-02-L03
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Expose bounded layout-block authoring in the admin editor without making every
block infinitely nestable. Command palette, slot insertion zones, layers,
selection, move, duplicate, and delete must understand section-scoped block
paths and named slots.

This leaf introduces an explicit staging capability:

- `pageBlockCapabilities[type].editorInsertable` controls whether the admin Page
  editor may show a block type in the command palette.
- `pageBlockCapabilities[type].insertable` remains the runtime-ready/product
  support signal consumed by assistant/template/runtime parity work.
- `container`, `columns`, and `group` become `editorInsertable: true` in this
  leaf so editors can build draft nested structures.
- Those layout blocks remain `insertable: false`, `assistantEmittable: false`,
  and `runtimeRenderer: "placeholder"` until TASK-418-05-L03 implements
  recursive runtime rendering and responsive cascade. They must keep a pending
  runtime reason while staged this way.
- Assistant active-surface `selectedBlockPath` remains deferred to
  TASK-418-06-L02. L02 may use paths internally in the editor, but the assistant
  browser context still publishes the existing selected block id only.

Do not expose data-bound/public-write-sensitive blocks through
`editorInsertable` in this leaf. `collection`, `form`, and `embed` remain gated
until their runtime/security contracts land.

## Block Path Contract

Add a Bun-free helper module owned by the Pages domain, for example
`core/services/pages/pageBlockPaths.ts`. The admin UI must import helpers from
that owner instead of reimplementing recursive path operations locally.

Canonical block path shape:

```ts
export type PageBlockPathSegment = {
  slotKey?: PageBlockSlotKey;
  index: number;
};

export type PageBlockPath = readonly [PageBlockPathSegment, ...PageBlockPathSegment[]];

export type PageBlockSelection = {
  sectionId: string;
  path: PageBlockPath;
};
```

Path examples:

- top-level first block in `sections[].blocks[]`: `[{ index: 0 }]`
- first child in a columns second slot:
  `[{ index: 1 }, { slotKey: "column:2", index: 0 }]`
- second child inside a nested group children slot:
  `[{ index: 1 }, { slotKey: "column:2", index: 0 }, { slotKey: "children", index: 1 }]`

The helper module must also expose a stable serializer for DOM attributes and
assistant follow-up compatibility, such as `serializePageBlockPath(path)`. The
serializer is an editor identifier only; server-side assistant path
revalidation remains TASK-418-06-L02.

Required helper behavior:

- `getPageBlockAtPath(section, path)` returns the exact block or `null`.
- `updatePageBlockAtPath(section, path, updater)` clones only the affected
  section/block/slot path and leaves sibling references stable where practical.
- `getPageBlockListAtPath(section, listPath)` returns root `section.blocks` or
  an owner slot list.
- `insertPageBlockAtTarget(section, target, block)` inserts into root or a named
  slot, refuses unsupported slots, depth overflow, and slot child-count overflow.
- `movePageBlockToTarget(section, sourcePath, target)` supports same-list
  reorder and cross-slot moves, but refuses moving a block into itself or any
  descendant path.
- `duplicatePageBlockAtPath(section, path)` recursively regenerates ids for the
  duplicated block and every nested descendant.
- The same recursive id-regeneration helper must be used by whole-section
  duplication, because section copies include nested slot descendants and the
  Page document owner rejects duplicate block ids anywhere in the tree.
- `deletePageBlockAtPath(section, path)` removes the selected block and returns
  a selection fallback: next sibling, previous sibling, parent owner, or section.

The helper should return unchanged input plus a machine-readable status for
invalid operations instead of throwing for ordinary UI constraints. The
`pageDocumentV2` normalizer remains the final write validator.

## Slot Target Rules

Insertion targets are section-scoped:

- No selection: create a new `content` section with the chosen block.
- Section selection: append to the section root block list.
- Selected atomic block: insert after the selected block in its sibling list.
- Selected layout block: default the toolbar/palette Add action to the first
  allowed slot that is not full and does not exceed max depth; layers must also
  expose explicit slot rows so users can choose a specific slot.
- Selected slot row: insert at the end of that slot.

`columns` slot rows must be derived from normalized `props.count`, so a
two-column block exposes `column:1` and `column:2` as active editor targets
while preserving dormant normalized `column:3` and `column:4` data if present.

Disable or hide Add/Move controls for a slot when:

- the target would exceed `PAGE_BLOCK_MAX_TREE_DEPTH`,
- the target slot already contains `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT` children,
- the owner type does not list that slot in `pageBlockCapabilities[type].slots`,
- moving the selected block would move it into itself or one of its descendants.

Same-list toolbar Up/Down reorders within the selected block's current root or
slot list. Cross-slot moves are explicit layer-slot actions in this leaf.

If a slot owner is removed, selection moves to the helper fallback: nearest
remaining sibling, parent slot owner, or the owning section.

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
    children: buildBlockTree(section.blocks, [{ index: 0 }])
  }));
}
```

Expected data flow:

- Palette filters block types by selected insertion target capabilities.
- Palette uses `editorInsertable`; assistant/runtime catalog parity continues to
  use `insertable` and `assistantEmittable`.
- Layers renders section -> block -> slot -> child block tree, including slot
  rows with Add and Move-here controls.
- Block path operations are shared by insert, move, duplicate, delete, select,
  and control patching.
- Canvas selection remains top-level until TASK-418-05-L03 recursive rendering,
  but the toolbar and layers must edit selected nested blocks by path.

Error handling:

- Prevent moving a node into itself or a descendant.
- Disable insertion when depth/slot limits are reached.
- If a slot owner is removed, selection moves to nearest ancestor.
- Recursively regenerate duplicate ids so the fresh write normalizer does not
  reject duplicated nested subtrees.

Regression-test shape:

- Insert heading into a columns slot.
- Move a block between slots.
- Layers selects nested blocks by path.
- Invalid self-descendant move is rejected.
- Duplicate a nested slot owner and verify every descendant id is regenerated.
- Duplicate a section containing nested slot descendants and verify every block
  id in the copied section is unique and does not collide with the source
  section.
- Delete a nested block and verify fallback selection.

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
- Vitest capability/control-registry tests for `editorInsertable` vs
  `insertable` gating.
- Focused Pages document tests if the capability contract changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
- `_docs/PAGE_MODEL.md`
- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/`

---

## Closeout Notes

- Added `pageBlockCapabilities[type].editorInsertable` as the admin-only
  inserter capability and exposed `container`, `columns`, and `group` in the
  Page editor while keeping them `insertable: false`,
  `assistantEmittable: false`, and `runtimeRenderer: "placeholder"` for L03.
- Added the Bun-free `pageBlockPaths` owner for section-scoped block paths,
  path serialization, nested get/update/insert/move/duplicate/delete helpers,
  slot target checks, max-depth/max-child gating, self-descendant rejection, and
  delete selection fallback.
- Reworked the Page editor selection model from flat block ids to block paths
  for toolbar edits, layers selection, explicit slot Add/Move-here actions,
  same-list movement, deletion, and duplication.
- Reused recursive duplicate-id regeneration for whole-section duplication so
  nested slot descendants do not collide with source blocks when copied.
- Kept canvas rendering top-level until L03 while rendering safe placeholders
  for staged layout blocks and editing nested slot children through Layers.
- Pre-implementation audit `019eaf55-2b52-7133-9b8a-3d99f5e40abd` found real
  task-contract drift around capability staging, path helper ownership,
  duplicate/delete semantics, slot targets, and L03/06-L02 boundaries. The
  contract was corrected; follow-up audit `019eaf5d-cb78-7cf1-817f-07cd8c1352ee`
  found the remaining whole-section duplicate-id gap; after correction, fresh
  audit `019eaf63-0302-7833-a76a-8b38fe23e14d` reported no material drift
  before source edits.
- Post-implementation drift audit `019eaf7c-8778-7c33-8eee-7718e109a960`
  reported no material L02 drift and one low, non-blocking UI edge: Layers
  Move-here enablement did not account for the selected subtree height before
  the domain helper rejected over-depth moves. `pageBlockPaths` now exposes the
  shared insert-target status helper, PageEditor uses it for slot Move-here
  disabled state, and a focused PageEditor regression covers the too-deep
  subtree case. Follow-up drift audit `019eaf86-7b73-7de3-a73f-96ccf9e226e5`
  found no remaining L02 findings.
- Validation passed:
  `bun run test:vitest -- tests/vitest/pages/page-block-paths.test.ts`
  (5 tests),
  `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-block-paths.test.ts`
  (29 tests),
  `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  (33 tests),
  `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-block-paths.test.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
  (71 tests),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.
