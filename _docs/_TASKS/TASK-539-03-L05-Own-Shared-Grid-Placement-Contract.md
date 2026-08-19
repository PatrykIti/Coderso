# TASK-539-03-L05: Own Shared Grid Placement Contract

# FileName: TASK-539-03-L05-Own-Shared-Grid-Placement-Contract.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Pure Layout Contract
**Estimated Effort:** Small
**Dependencies:** TASK-539-01-L01, TASK-539-02-L01; lands first inside TASK-539-03
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Sole ownership

Create and solely own:

- `core/services/pages/pageBlockGridPlacement.ts`
- `tests/vitest/pages/page-block-grid-placement.test.ts`

Both paths are absent at the grounded baseline. No editor, renderer, responsive CSS,
model, sanitizer, route, or foreign test may be edited here. Later consumers import
this contract and must not duplicate its literal, enum, or classification.

## Implementation Pseudocode

```ts
export const PAGE_BLOCK_GRID_ITEM_ATTRIBUTE =
  "data-page-block-grid-item" as const;

export type PageBlockGridPlacementTarget =
  | "block-frame"
  | "section-template-wrapper"
  | "none";

export function resolvePageBlockGridPlacement(
  section: PageSectionV2,
  blockPath: PageBlockPath,
  options: { includeHiddenBlocks: boolean }
): PageBlockGridPlacementTarget {
  if (blockPath.length !== 1) return "none";

  const rootBlocks = options.includeHiddenBlocks
    ? section.blocks
    : section.blocks.filter((block) => block.visibility.visible);
  const perColumn =
    getPageSectionCompositionColumns(section) >= 2 &&
    rootBlocks.length > 0 &&
    pageSectionBlocksHaveColumnAssignments(rootBlocks);
  if (perColumn) return "none";

  const template = resolvePageSectionTemplate(section);
  if (template.template === "media-split" && template.variant !== "default") {
    return "none";
  }
  if (
    template.template === "timeline" ||
    template.template === "gallery" ||
    template.template === "faq" ||
    template.template === "testimonials"
  ) {
    return "section-template-wrapper";
  }
  return "block-frame";
}
```

Use only Bun-free Page helpers/types. `includeHiddenBlocks:false` must use exactly the
public renderer root policy (`block.visibility.visible`); `true` must use every
section root exactly as Admin does. Do not mutate or rewrite the input section while
forming that view. A nested slot child is always `none`, even when its ancestor is a
root grid item. Default media-split remains the ordinary `block-frame` path.

Consumer policy is fixed and must be stated in imports/call sites rather than
re-derived:

- PageEditor passes `{includeHiddenBlocks:true}`;
- the renderer passes the real `PageBlockRenderContext.includeHiddenBlocks`;
- public responsive CSS passes `{includeHiddenBlocks:false}`.

## Focused proof

The dedicated suite pins the exact attribute bytes and all three result values. Cover:

- ordinary root → `block-frame`;
- root timeline/gallery/FAQ/testimonials → `section-template-wrapper`;
- nested paths, actual per-column composition, and non-default media-split → `none`;
- default media-split → `block-frame`;
- a two-column section whose only assigned sibling is hidden resolves
  `block-frame` for `{includeHiddenBlocks:false}` but `none` for
  `{includeHiddenBlocks:true}`;
- a visible assigned sibling resolves `none` under both policies;
- no mutation of the section/path/options or their nested arrays/objects.

## Security and compatibility

No route, persistence, HTML, or author string is introduced. The exported attribute
is a fixed trusted literal; consumers put only normalized block IDs in its value.
Unknown layout states fail to the existing resolved-template behavior, never raw CSS.

## Validation and line receipt

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-block-grid-placement.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
wc -l core/services/pages/pageBlockGridPlacement.ts tests/vitest/pages/page-block-grid-placement.test.ts
git diff --check
```

Both receipts must be at most 1,000. Rerun the named file alone on failure.
