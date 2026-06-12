/**
 * Section multi-column composition contract (owner finding #5, round 3).
 *
 * A section whose composition column count is >= 2 supports REAL independent
 * per-column block stacks: a block may carry a `style.column` assignment
 * (1..4, see `PAGE_SECTION_BLOCK_COLUMN_CLAMP`) that pins it into one column
 * wrapper, while unassigned blocks keep the legacy auto-flow placement
 * (`column = index % N`, the exact geometry the auto-flow grid paints).
 *
 * Ownership: this module is the single source for the assignment read/clamp
 * and the per-column distribution math. The shared renderer
 * (`pageRendererV2.tsx`), the path/move helpers (`pageBlockPaths.ts`), and the
 * Page Editor canvas affordances must all derive column membership from here
 * so editor gestures always agree with the painted grid.
 *
 * Legacy guarantee: when NO root block of a section carries an assignment the
 * renderer keeps today's auto-flow markup byte-identical, so every document
 * authored before this contract renders exactly as before.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import { PAGE_SECTION_BLOCK_COLUMN_CLAMP, type PageBlockV2 } from "./pageDocumentV2";

export type PageSectionColumnedBlock = {
  block: PageBlockV2;
  /** Index of the block within the rendered root list (stable path index). */
  index: number;
};

/**
 * Stored section-column assignment of a block: integer clamped into the
 * schema bounds, or `null` for the legacy auto-flow placement. Defensive
 * against unnormalized values (resolved editor models merge overrides).
 */
export const getPageBlockSectionColumn = (block: PageBlockV2): number | null => {
  const value = block.style?.column;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(
    PAGE_SECTION_BLOCK_COLUMN_CLAMP.max,
    Math.max(PAGE_SECTION_BLOCK_COLUMN_CLAMP.min, Math.trunc(value))
  );
};

/** Whether any root block opts the section into per-column composition. */
export const pageSectionBlocksHaveColumnAssignments = (blocks: readonly PageBlockV2[]): boolean =>
  blocks.some((block) => getPageBlockSectionColumn(block) !== null);

/**
 * Effective 1-based column of the block at `index` within `blocks` for a
 * section painting `columnCount` columns: the explicit assignment (clamped to
 * the painted count so out-of-range assignments stay visible in the last
 * column) or the legacy auto-flow cell (`index % N`).
 */
export const getPageSectionBlockEffectiveColumn = (
  blocks: readonly PageBlockV2[],
  index: number,
  columnCount: number
): number => {
  const safeCount = Math.max(1, Math.trunc(columnCount));
  const block = blocks[index];
  const assigned = block ? getPageBlockSectionColumn(block) : null;
  if (assigned !== null) return Math.min(assigned, safeCount);
  return (index % safeCount) + 1;
};

/**
 * Distributes the rendered root list into per-column stacks. Assigned blocks
 * go to their column; unassigned blocks keep their legacy auto-flow cell.
 * Within each column, blocks keep ascending list order, so a pure auto-flow
 * list distributes to the exact same visual positions the auto-flow grid
 * paints (row-major order preserved within each column).
 */
export const distributePageSectionBlocksToColumns = (
  blocks: readonly PageBlockV2[],
  columnCount: number
): PageSectionColumnedBlock[][] => {
  const safeCount = Math.max(1, Math.trunc(columnCount));
  const columns: PageSectionColumnedBlock[][] = Array.from({ length: safeCount }, () => []);
  blocks.forEach((block, index) => {
    const column = getPageSectionBlockEffectiveColumn(blocks, index, safeCount);
    columns[column - 1]!.push({ block, index });
  });
  return columns;
};

/**
 * Column-switch bridge (owner finding #5, round 3): when the author switches
 * a section from one effective column to N >= 2 columns, every UNASSIGNED
 * root block is pinned to `column` (column 1) in the same deliberate write so
 * existing content stays visually stacked together instead of scattering
 * through auto-flow. Blocks that already carry an assignment keep it, so
 * dropping to one column and back restores the prior composition.
 */
export const pinUnassignedPageSectionBlocksToColumn = (
  blocks: readonly PageBlockV2[],
  column: number
): PageBlockV2[] =>
  blocks.map((block) =>
    getPageBlockSectionColumn(block) === null
      ? { ...block, style: { ...(block.style ?? {}), column } }
      : block
  );

/**
 * Pins every UNASSIGNED root block to its current effective auto-flow column.
 * Required before any root-list index reorder while assignments are active:
 * unassigned siblings derive their column from their list index, so moving a
 * block without pinning would silently re-column every block behind it.
 */
export const pinPageSectionBlockColumns = (
  blocks: readonly PageBlockV2[],
  columnCount: number
): PageBlockV2[] => {
  const safeCount = Math.max(1, Math.trunc(columnCount));
  return blocks.map((block, index) =>
    getPageBlockSectionColumn(block) !== null
      ? block
      : { ...block, style: { ...(block.style ?? {}), column: (index % safeCount) + 1 } }
  );
};
