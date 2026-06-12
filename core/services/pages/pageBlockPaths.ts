import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  createPageBlockV2,
  createPageDocumentId,
  getPageBlockActiveSlotKeys,
  pageBlockCapabilities,
  type PageBlockSlotKey,
  type PageBlockV2,
  type PageSectionV2,
} from "./pageDocumentV2";
import {
  getPageBlockSectionColumn,
  getPageSectionBlockEffectiveColumn,
  pageSectionBlocksHaveColumnAssignments,
  pinPageSectionBlockColumns,
} from "./pageSectionColumns";
import {
  getPageSectionCompositionColumns,
  getPageSectionEffectiveColumns,
} from "./pageSectionTemplates";

export type PageBlockPathSegment = {
  slotKey?: PageBlockSlotKey;
  index: number;
};

export type PageBlockPath = readonly [PageBlockPathSegment, ...PageBlockPathSegment[]];

export type PageBlockSelection = {
  sectionId: string;
  path: PageBlockPath;
};

export type PageBlockListPath = {
  ownerPath?: PageBlockPath;
  slotKey?: PageBlockSlotKey;
};

export type PageBlockInsertTarget = {
  listPath: PageBlockListPath;
  index?: number;
};

export type PageBlockPathMutationStatus =
  | "ok"
  | "invalid-path"
  | "unsupported-slot"
  | "max-depth-exceeded"
  | "max-children-exceeded"
  | "self-descendant";

export type PageBlockPathMutationResult = {
  status: PageBlockPathMutationStatus;
  section: PageSectionV2;
  path?: PageBlockPath;
  fallbackPath?: PageBlockPath | null;
};

type BlockListResult =
  | { status: "ok"; blocks: readonly PageBlockV2[] }
  | { status: Exclude<PageBlockPathMutationStatus, "ok"> };

type BlockListMutationResult =
  | { status: "ok"; section: PageSectionV2 }
  | { status: Exclude<PageBlockPathMutationStatus, "ok"> };

const isValidIndex = (index: number) => Number.isInteger(index) && index >= 0;

const clampIndex = (index: number | undefined, length: number) => {
  if (index === undefined || !Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, Math.trunc(index)));
};

const clonePathSegment = (segment: PageBlockPathSegment): PageBlockPathSegment =>
  segment.slotKey ? { slotKey: segment.slotKey, index: segment.index } : { index: segment.index };

const toPageBlockPath = (segments: readonly PageBlockPathSegment[]): PageBlockPath | null =>
  segments.length > 0
    ? (segments.map(clonePathSegment) as [PageBlockPathSegment, ...PageBlockPathSegment[]])
    : null;

const rootListPath: PageBlockListPath = {};

const isSlotAllowed = (block: PageBlockV2, slotKey: PageBlockSlotKey) =>
  pageBlockCapabilities[block.type].slots.includes(slotKey);

export const getPageBlockTreeHeight = (block: PageBlockV2): number => {
  const childHeights = Object.values(block.slots ?? {})
    .flatMap((children) => children ?? [])
    .map(getPageBlockTreeHeight);
  return childHeights.length > 0 ? 1 + Math.max(...childHeights) : 1;
};

const wouldExceedDepth = (targetPathDepth: number, block: PageBlockV2) =>
  targetPathDepth + getPageBlockTreeHeight(block) - 1 > PAGE_BLOCK_MAX_TREE_DEPTH;

const pathSegmentsEqual = (left: PageBlockPathSegment, right: PageBlockPathSegment) =>
  left.index === right.index && left.slotKey === right.slotKey;

const pathPrefixMatches = (
  path: readonly PageBlockPathSegment[],
  prefix: readonly PageBlockPathSegment[],
  length: number
) => {
  for (let index = 0; index < length; index += 1) {
    const left = path[index];
    const right = prefix[index];
    if (!left || !right || !pathSegmentsEqual(left, right)) return false;
  }
  return true;
};

const pathListSegmentMatches = (
  path: readonly PageBlockPathSegment[],
  deletedPath: readonly PageBlockPathSegment[],
  depth: number
) => {
  const pathSegment = path[depth];
  const deletedSegment = deletedPath[depth];
  if (!pathSegment || !deletedSegment) return false;
  if (pathSegment.slotKey !== deletedSegment.slotKey) return false;
  return depth === 0 || pathPrefixMatches(path, deletedPath, depth);
};

export const serializePageBlockPath = (path: PageBlockPath) =>
  path.map((segment) => `${segment.slotKey ?? "root"}:${segment.index}`).join("/");

export const isSamePageBlockPath = (
  left: PageBlockPath | null | undefined,
  right: PageBlockPath | null | undefined
) =>
  Boolean(left) &&
  Boolean(right) &&
  left!.length === right!.length &&
  left!.every((segment, index) => pathSegmentsEqual(segment, right![index]!));

export const isPageBlockPathDescendant = (path: PageBlockPath, ancestor: PageBlockPath) =>
  path.length > ancestor.length && pathPrefixMatches(path, ancestor, ancestor.length);

export const getPageBlockEditorSlotKeys = (block: PageBlockV2): readonly PageBlockSlotKey[] => {
  return getPageBlockActiveSlotKeys(block);
};

export const getPageBlockAtPath = (
  section: PageSectionV2,
  path: PageBlockPath
): PageBlockV2 | null => {
  let list: readonly PageBlockV2[] = section.blocks;

  for (let depth = 0; depth < path.length; depth += 1) {
    const segment = path[depth]!;
    if (depth === 0 && segment.slotKey) return null;
    if (!isValidIndex(segment.index)) return null;
    const block = list[segment.index];
    if (!block) return null;
    if (depth === path.length - 1) return block;

    const nextSegment = path[depth + 1]!;
    if (!nextSegment.slotKey || !isSlotAllowed(block, nextSegment.slotKey)) return null;
    list = block.slots?.[nextSegment.slotKey] ?? [];
  }

  return null;
};

export const getPageBlockListAtPath = (
  section: PageSectionV2,
  listPath: PageBlockListPath
): BlockListResult => {
  if (!listPath.ownerPath && !listPath.slotKey) {
    return { status: "ok", blocks: section.blocks };
  }

  if (!listPath.ownerPath || !listPath.slotKey) {
    return { status: "invalid-path" };
  }

  const owner = getPageBlockAtPath(section, listPath.ownerPath);
  if (!owner) return { status: "invalid-path" };
  if (!isSlotAllowed(owner, listPath.slotKey)) return { status: "unsupported-slot" };
  return { status: "ok", blocks: owner.slots?.[listPath.slotKey] ?? [] };
};

const updateBlockInList = (
  blocks: readonly PageBlockV2[],
  path: PageBlockPath,
  depth: number,
  updater: (block: PageBlockV2) => PageBlockV2
): { status: PageBlockPathMutationStatus; blocks: PageBlockV2[] } => {
  const segment = path[depth];
  if (!segment || !isValidIndex(segment.index) || segment.index >= blocks.length) {
    return { status: "invalid-path", blocks: [...blocks] };
  }

  const block = blocks[segment.index]!;
  if (depth === path.length - 1) {
    const nextBlocks = [...blocks];
    nextBlocks[segment.index] = updater(block);
    return { status: "ok", blocks: nextBlocks };
  }

  const nextSegment = path[depth + 1];
  if (!nextSegment?.slotKey || !isSlotAllowed(block, nextSegment.slotKey)) {
    return { status: "invalid-path", blocks: [...blocks] };
  }

  const childList = block.slots?.[nextSegment.slotKey];
  if (!childList) return { status: "invalid-path", blocks: [...blocks] };

  const childResult = updateBlockInList(childList, path, depth + 1, updater);
  if (childResult.status !== "ok") {
    return { status: childResult.status, blocks: [...blocks] };
  }

  const nextBlocks = [...blocks];
  nextBlocks[segment.index] = {
    ...block,
    slots: {
      ...(block.slots ?? {}),
      [nextSegment.slotKey]: childResult.blocks,
    },
  };
  return { status: "ok", blocks: nextBlocks };
};

export const updatePageBlockAtPath = (
  section: PageSectionV2,
  path: PageBlockPath,
  updater: (block: PageBlockV2) => PageBlockV2
): PageBlockPathMutationResult => {
  const result = updateBlockInList(section.blocks, path, 0, updater);
  if (result.status !== "ok") return { status: result.status, section };
  return { status: "ok", section: { ...section, blocks: result.blocks }, path };
};

const updatePageBlockListAtPath = (
  section: PageSectionV2,
  listPath: PageBlockListPath,
  updater: (blocks: readonly PageBlockV2[]) => PageBlockV2[]
): BlockListMutationResult => {
  if (!listPath.ownerPath && !listPath.slotKey) {
    return { status: "ok", section: { ...section, blocks: updater(section.blocks) } };
  }

  if (!listPath.ownerPath || !listPath.slotKey) {
    return { status: "invalid-path" };
  }

  const owner = getPageBlockAtPath(section, listPath.ownerPath);
  if (!owner) return { status: "invalid-path" };
  if (!isSlotAllowed(owner, listPath.slotKey)) return { status: "unsupported-slot" };

  const updatedOwner = {
    ...owner,
    slots: {
      ...(owner.slots ?? {}),
      [listPath.slotKey]: updater(owner.slots?.[listPath.slotKey] ?? []),
    },
  };
  const result = updatePageBlockAtPath(section, listPath.ownerPath, () => updatedOwner);
  return result.status === "ok"
    ? { status: "ok", section: result.section }
    : { status: result.status };
};

const buildPathFromTarget = (target: PageBlockInsertTarget, index: number) => {
  const segments = target.listPath.ownerPath
    ? [...target.listPath.ownerPath, { slotKey: target.listPath.slotKey, index }]
    : [{ index }];
  return toPageBlockPath(segments);
};

const getTargetPathDepth = (target: PageBlockInsertTarget) =>
  target.listPath.ownerPath ? target.listPath.ownerPath.length + 1 : 1;

export const getPageBlockInsertTargetStatus = (
  section: PageSectionV2,
  target: PageBlockInsertTarget,
  block: PageBlockV2
): PageBlockPathMutationStatus => {
  const listResult = getPageBlockListAtPath(section, target.listPath);
  if (listResult.status !== "ok") return listResult.status;
  if (wouldExceedDepth(getTargetPathDepth(target), block)) return "max-depth-exceeded";
  if (target.listPath.slotKey && listResult.blocks.length >= PAGE_BLOCK_MAX_CHILDREN_PER_SLOT) {
    return "max-children-exceeded";
  }
  return "ok";
};

export const insertPageBlockAtTarget = (
  section: PageSectionV2,
  target: PageBlockInsertTarget,
  block: PageBlockV2
): PageBlockPathMutationResult => {
  const targetStatus = getPageBlockInsertTargetStatus(section, target, block);
  if (targetStatus !== "ok") return { status: targetStatus, section };
  const listResult = getPageBlockListAtPath(section, target.listPath);
  if (listResult.status !== "ok") return { status: listResult.status, section };
  const index = clampIndex(target.index, listResult.blocks.length);
  const mutation = updatePageBlockListAtPath(section, target.listPath, (blocks) => {
    const nextBlocks = [...blocks];
    nextBlocks.splice(index, 0, block);
    return nextBlocks;
  });
  if (mutation.status !== "ok") return { status: mutation.status, section };
  return {
    status: "ok",
    section: mutation.section,
    path: buildPathFromTarget(target, index) ?? undefined,
  };
};

const getParentListPath = (path: PageBlockPath) => {
  const index = path[path.length - 1]!.index;
  if (path.length === 1) return { listPath: rootListPath, index };
  const ownerPath = toPageBlockPath(path.slice(0, -1));
  const slotKey = path[path.length - 1]!.slotKey;
  return ownerPath && slotKey
    ? { listPath: { ownerPath, slotKey }, index }
    : { listPath: null, index };
};

export const getPageBlockSiblingMoveTarget = (
  path: PageBlockPath,
  offset: number
): PageBlockInsertTarget | null => {
  const parent = getParentListPath(path);
  if (!parent.listPath || !Number.isInteger(offset) || offset === 0) return null;
  return { listPath: parent.listPath, index: parent.index + offset };
};

/**
 * How the siblings of the block at `path` are laid out by the shared renderer
 * (owner finding #6). Pass a breakpoint-resolved section so responsive
 * `stackVertical`/`layout.columns`/`count` overrides are already merged.
 *
 * - `grid`: section root list painted as a CSS auto-flow grid with 2+ columns
 *   and NO column assignments (column = index % columns) — left/right SET a
 *   column assignment (owner finding #5 round 3), up/down move ±columns.
 * - `section-column`: section root list with per-column composition active
 *   (2+ composition columns and at least one assigned root block) — each
 *   column is an independent stack; left/right re-assign the block into the
 *   adjacent column, up/down reorder within the block's column stack.
 * - `row`: children of a row-direction group — horizontal flex, left/right ±1,
 *   no vertical axis inside the single row.
 * - `columns-slot`: direct child of a columns block with 2+ active slots —
 *   the slot list itself stacks vertically (up/down ±1) while left/right
 *   moves the block into the adjacent column slot.
 * - `stack`: every other container (single-column section, single-slot
 *   columns block, column group, container) — vertical only.
 */
export type PageBlockContainerLayout =
  | { kind: "grid"; columns: number }
  | { kind: "section-column"; columns: number; column: number }
  | { kind: "row" }
  | { kind: "columns-slot"; slotKeys: readonly PageBlockSlotKey[]; slotIndex: number }
  | { kind: "stack" };

export const getPageBlockContainerLayout = (
  section: PageSectionV2,
  path: PageBlockPath
): PageBlockContainerLayout => {
  if (path.length === 1) {
    // Composition columns ignore stackVertical (the column wrappers stack
    // when the grid collapses), so assignment-aware moves stay available and
    // consistent with the painted wrapper DOM at every breakpoint.
    const compositionColumns = getPageSectionCompositionColumns(section);
    if (compositionColumns >= 2 && pageSectionBlocksHaveColumnAssignments(section.blocks)) {
      return {
        kind: "section-column",
        columns: compositionColumns,
        column: getPageSectionBlockEffectiveColumn(
          section.blocks,
          path[0]!.index,
          compositionColumns
        ),
      };
    }
    const columns = getPageSectionEffectiveColumns(section);
    return columns >= 2 ? { kind: "grid", columns } : { kind: "stack" };
  }
  const parentPath = toPageBlockPath(path.slice(0, -1));
  const parent = parentPath ? getPageBlockAtPath(section, parentPath) : null;
  if (!parent) return { kind: "stack" };
  if (parent.type === "group" && parent.props.direction === "row") return { kind: "row" };
  if (parent.type === "columns") {
    const slotKeys = getPageBlockActiveSlotKeys(parent);
    const slotIndex = slotKeys.indexOf(path[path.length - 1]!.slotKey as PageBlockSlotKey);
    if (slotKeys.length >= 2 && slotIndex >= 0) {
      return { kind: "columns-slot", slotKeys, slotIndex };
    }
  }
  return { kind: "stack" };
};

/**
 * Insert target for moving a columns-slot child into the adjacent column slot
 * (owner finding #6: left/right inside a columns block move across slots, the
 * visually horizontal axis). Keeps the block's vertical position where
 * possible by clamping its index to the target slot length. Returns null at
 * the first/last column (strict no-op, mirroring sibling-move bounds).
 */
export const getPageBlockAdjacentColumnMoveTarget = (
  section: PageSectionV2,
  path: PageBlockPath,
  direction: -1 | 1
): PageBlockInsertTarget | null => {
  const layout = getPageBlockContainerLayout(section, path);
  if (layout.kind !== "columns-slot") return null;
  const targetSlotKey = layout.slotKeys[layout.slotIndex + direction];
  if (!targetSlotKey) return null;
  const ownerPath = toPageBlockPath(path.slice(0, -1));
  if (!ownerPath) return null;
  const listResult = getPageBlockListAtPath(section, { ownerPath, slotKey: targetSlotKey });
  if (listResult.status !== "ok") return null;
  return {
    listPath: { ownerPath, slotKey: targetSlotKey },
    index: Math.min(path[path.length - 1]!.index, listResult.blocks.length),
  };
};

/**
 * Owner finding #5 (round 3): Left/Right on a section-root block inside a
 * multi-column section SET the column assignment instead of swapping list
 * indices. The moved block keeps its list index (so every unassigned sibling
 * keeps its auto-flow cell) and only its `style.column` changes to the
 * adjacent column. Returns the updated section, or null at the first/last
 * column (strict no-op) and for non-root paths. The write always lands on the
 * BASE block style: column composition is structural and breakpoint-invariant
 * on the public front (`pageResponsiveCss` cannot express it per breakpoint).
 */
export const movePageSectionBlockToAdjacentColumn = (
  section: PageSectionV2,
  path: PageBlockPath,
  direction: -1 | 1
): PageSectionV2 | null => {
  if (path.length !== 1) return null;
  const columns = getPageSectionCompositionColumns(section);
  if (columns < 2) return null;
  const index = path[0]!.index;
  if (!section.blocks[index]) return null;
  const current = getPageSectionBlockEffectiveColumn(section.blocks, index, columns);
  const target = current + direction;
  if (target < 1 || target > columns) return null;
  const blocks = section.blocks.map((block, blockIndex) =>
    blockIndex === index ? { ...block, style: { ...(block.style ?? {}), column: target } } : block
  );
  return { ...section, blocks };
};

/**
 * Owner finding #5 (round 3): Up/Down while per-column composition is active
 * reorder the block WITHIN its effective column stack — swapping list
 * positions with the previous/next root block of the same effective column.
 * Because unassigned siblings derive their column from their list index, the
 * move first pins every unassigned root block to its current effective column
 * (one deliberate write) so nothing else changes columns when indices shift.
 * Returns null when composition is inactive or at the stack edges (strict
 * no-op, mirroring sibling-move bounds).
 */
export const movePageSectionBlockWithinColumn = (
  section: PageSectionV2,
  path: PageBlockPath,
  direction: -1 | 1
): { section: PageSectionV2; path: PageBlockPath } | null => {
  if (path.length !== 1) return null;
  const columns = getPageSectionCompositionColumns(section);
  if (columns < 2 || !pageSectionBlocksHaveColumnAssignments(section.blocks)) return null;
  const index = path[0]!.index;
  if (!section.blocks[index]) return null;
  const column = getPageSectionBlockEffectiveColumn(section.blocks, index, columns);
  const members = section.blocks
    .map((_, blockIndex) => blockIndex)
    .filter(
      (blockIndex) =>
        getPageSectionBlockEffectiveColumn(section.blocks, blockIndex, columns) === column
    );
  const position = members.indexOf(index);
  if (position < 0) return null;
  const neighbor = members[position + direction];
  if (neighbor === undefined) return null;

  const blocks = [...pinPageSectionBlockColumns(section.blocks, columns)];
  const [moved] = blocks.splice(index, 1);
  if (!moved) return null;
  // Inserting at the neighbor's pre-removal index works for both directions:
  // up (neighbor < index) lands directly before the neighbor; down
  // (neighbor > index, shifted to neighbor - 1 by the removal) lands directly
  // after it — a swap in column order either way.
  blocks.splice(neighbor, 0, moved);
  return {
    section: { ...section, blocks },
    path: [{ index: neighbor }] as PageBlockPath,
  };
};

/**
 * Availability probe for {@link insertPageBlockBeside} with a not-yet-created
 * atomic block (palette blocks always start with tree height 1). Lets the
 * editor disable the "Add block beside" affordance without mutating anything.
 */
export const getPageBlockBesideInsertStatus = (
  section: PageSectionV2,
  path: PageBlockPath
): PageBlockPathMutationStatus => {
  const selected = getPageBlockAtPath(section, path);
  if (!selected) return "invalid-path";
  const parent = getParentListPath(path);
  if (!parent.listPath) return "invalid-path";
  const parentOwnerPath = parent.listPath.ownerPath;
  const parentBlock = parentOwnerPath ? getPageBlockAtPath(section, parentOwnerPath) : null;
  if (parentBlock?.type === "group" && parentBlock.props.direction === "row") {
    const listResult = getPageBlockListAtPath(section, parent.listPath);
    if (listResult.status !== "ok") return listResult.status;
    return listResult.blocks.length >= PAGE_BLOCK_MAX_CHILDREN_PER_SLOT
      ? "max-children-exceeded"
      : "ok";
  }
  return path.length + getPageBlockTreeHeight(selected) > PAGE_BLOCK_MAX_TREE_DEPTH
    ? "max-depth-exceeded"
    : "ok";
};

/**
 * "Add block beside" contract (owner finding #7). If the selected block's
 * parent container is already a row-direction group, the new block is
 * appended right after it in the same slot. Otherwise the selected block is
 * wrapped — non-destructively, keeping its id/props/subtree — into a NEW
 * `group` block (`direction: "row"`, `wrap: false`, default gap) and the new
 * block becomes the second child. Returns the inserted block's path so the
 * caller can select it. Schema-compatible by construction: it only composes
 * the existing group contract.
 */
export const insertPageBlockBeside = (
  section: PageSectionV2,
  path: PageBlockPath,
  block: PageBlockV2
): PageBlockPathMutationResult => {
  const selected = getPageBlockAtPath(section, path);
  if (!selected) return { status: "invalid-path", section };

  const parent = getParentListPath(path);
  if (!parent.listPath) return { status: "invalid-path", section };
  const parentOwnerPath = parent.listPath.ownerPath;
  const parentBlock = parentOwnerPath ? getPageBlockAtPath(section, parentOwnerPath) : null;
  if (parentBlock?.type === "group" && parentBlock.props.direction === "row") {
    return insertPageBlockAtTarget(
      section,
      { listPath: parent.listPath, index: parent.index + 1 },
      block
    );
  }

  // Wrapping adds one tree level above the selected block, so the deepest
  // descendant of either child must still fit within the depth budget.
  const wrappedHeight = Math.max(getPageBlockTreeHeight(selected), getPageBlockTreeHeight(block));
  if (path.length + wrappedHeight > PAGE_BLOCK_MAX_TREE_DEPTH) {
    return { status: "max-depth-exceeded", section };
  }

  // Per-column composition (owner finding #5, round 3): a root block may be
  // pinned into a section column via `style.column`. The wrap group replaces
  // the block at the same root index, so it must CARRY the same assignment —
  // otherwise the new row would silently fall back to its auto-flow cell and
  // jump columns. "Beside" always means "in the same column".
  const sectionColumn = path.length === 1 ? getPageBlockSectionColumn(selected) : null;
  const group = createPageBlockV2("group", {
    props: { direction: "row", wrap: false, gap: 16 },
    ...(sectionColumn !== null ? { style: { column: sectionColumn } } : {}),
    slots: { children: [selected, block] },
  });
  const result = updatePageBlockAtPath(section, path, () => group);
  if (result.status !== "ok") return result;
  return {
    status: "ok",
    section: result.section,
    path: [...path, { slotKey: "children", index: 1 }] as PageBlockPath,
  };
};

const removePageBlockAtPath = (
  section: PageSectionV2,
  path: PageBlockPath
): PageBlockPathMutationResult & { block?: PageBlockV2 } => {
  const block = getPageBlockAtPath(section, path);
  if (!block) return { status: "invalid-path", section };
  const parent = getParentListPath(path);
  if (!parent.listPath) return { status: "invalid-path", section };
  const listResult = getPageBlockListAtPath(section, parent.listPath);
  if (listResult.status !== "ok") return { status: listResult.status, section };
  if (parent.index < 0 || parent.index >= listResult.blocks.length) {
    return { status: "invalid-path", section };
  }
  const mutation = updatePageBlockListAtPath(section, parent.listPath, (blocks) =>
    blocks.filter((_, index) => index !== parent.index)
  );
  if (mutation.status !== "ok") return { status: mutation.status, section };
  return { status: "ok", section: mutation.section, block };
};

export const adjustPageBlockPathAfterDelete = (
  path: PageBlockPath,
  deletedPath: PageBlockPath
): PageBlockPath | null => {
  const adjusted = path.map(clonePathSegment);
  const maxDepth = Math.min(path.length, deletedPath.length);

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!pathListSegmentMatches(path, deletedPath, depth)) return toPageBlockPath(adjusted);
    const pathSegment = adjusted[depth]!;
    const deletedSegment = deletedPath[depth]!;
    if (pathSegment.index > deletedSegment.index) {
      adjusted[depth] = { ...pathSegment, index: pathSegment.index - 1 };
      return toPageBlockPath(adjusted);
    }
    if (pathSegment.index < deletedSegment.index) return toPageBlockPath(adjusted);
    if (depth === deletedPath.length - 1) return null;
  }

  return toPageBlockPath(adjusted);
};

export const movePageBlockToTarget = (
  section: PageSectionV2,
  sourcePath: PageBlockPath,
  target: PageBlockInsertTarget
): PageBlockPathMutationResult => {
  const block = getPageBlockAtPath(section, sourcePath);
  if (!block) return { status: "invalid-path", section };
  const targetOwnerPath = target.listPath.ownerPath;
  if (
    targetOwnerPath &&
    (isSamePageBlockPath(sourcePath, targetOwnerPath) ||
      isPageBlockPathDescendant(targetOwnerPath, sourcePath))
  ) {
    return { status: "self-descendant", section };
  }

  const adjustedOwnerPath = targetOwnerPath
    ? adjustPageBlockPathAfterDelete(targetOwnerPath, sourcePath)
    : undefined;
  if (targetOwnerPath && !adjustedOwnerPath) return { status: "self-descendant", section };

  const adjustedTarget: PageBlockInsertTarget = {
    ...target,
    listPath: adjustedOwnerPath
      ? { ownerPath: adjustedOwnerPath, slotKey: target.listPath.slotKey }
      : target.listPath,
  };

  const removed = removePageBlockAtPath(section, sourcePath);
  if (removed.status !== "ok" || !removed.block) {
    return { status: removed.status, section };
  }
  return insertPageBlockAtTarget(removed.section, adjustedTarget, removed.block);
};

export const duplicatePageBlockTreeWithNewIds = (block: PageBlockV2): PageBlockV2 => {
  const duplicate: PageBlockV2 = {
    ...(JSON.parse(JSON.stringify(block)) as PageBlockV2),
    id: createPageDocumentId("blk"),
  };
  if (!duplicate.slots) return duplicate;
  duplicate.slots = Object.fromEntries(
    Object.entries(duplicate.slots).map(([slotKey, children]) => [
      slotKey,
      (children ?? []).map(duplicatePageBlockTreeWithNewIds),
    ])
  ) as PageBlockV2["slots"];
  return duplicate;
};

export const duplicatePageBlockAtPath = (
  section: PageSectionV2,
  path: PageBlockPath
): PageBlockPathMutationResult => {
  const block = getPageBlockAtPath(section, path);
  if (!block) return { status: "invalid-path", section };
  const parent = getParentListPath(path);
  if (!parent.listPath) return { status: "invalid-path", section };
  return insertPageBlockAtTarget(
    section,
    {
      listPath: parent.listPath,
      index: parent.index + 1,
    },
    duplicatePageBlockTreeWithNewIds(block)
  );
};

export const deletePageBlockAtPath = (
  section: PageSectionV2,
  path: PageBlockPath
): PageBlockPathMutationResult => {
  const parent = getParentListPath(path);
  if (!parent.listPath) return { status: "invalid-path", section };
  const listResult = getPageBlockListAtPath(section, parent.listPath);
  if (listResult.status !== "ok") return { status: listResult.status, section };
  if (parent.index < 0 || parent.index >= listResult.blocks.length) {
    return { status: "invalid-path", section };
  }

  const nextSiblingIndex =
    parent.index < listResult.blocks.length - 1
      ? parent.index
      : parent.index > 0
        ? parent.index - 1
        : null;
  const fallbackPath =
    nextSiblingIndex !== null
      ? buildPathFromTarget(
          { listPath: parent.listPath, index: nextSiblingIndex },
          nextSiblingIndex
        )
      : path.length > 1
        ? toPageBlockPath(path.slice(0, -1))
        : null;
  const removed = removePageBlockAtPath(section, path);
  if (removed.status !== "ok") return { status: removed.status, section };
  return { status: "ok", section: removed.section, fallbackPath };
};

export const getDefaultPageBlockInsertTarget = (
  section: PageSectionV2,
  selectedPath: PageBlockPath | null
): PageBlockInsertTarget => {
  if (!selectedPath) {
    return { listPath: rootListPath, index: section.blocks.length };
  }

  const selectedBlock = getPageBlockAtPath(section, selectedPath);
  if (!selectedBlock) {
    return { listPath: rootListPath, index: section.blocks.length };
  }

  const slotKey = getPageBlockEditorSlotKeys(selectedBlock).find((candidate) => {
    const listResult = getPageBlockListAtPath(section, {
      ownerPath: selectedPath,
      slotKey: candidate,
    });
    return (
      listResult.status === "ok" &&
      selectedPath.length + 1 <= PAGE_BLOCK_MAX_TREE_DEPTH &&
      listResult.blocks.length < PAGE_BLOCK_MAX_CHILDREN_PER_SLOT
    );
  });
  if (slotKey) {
    const listResult = getPageBlockListAtPath(section, { ownerPath: selectedPath, slotKey });
    return {
      listPath: { ownerPath: selectedPath, slotKey },
      index: listResult.status === "ok" ? listResult.blocks.length : 0,
    };
  }

  const parent = getParentListPath(selectedPath);
  return parent.listPath
    ? { listPath: parent.listPath, index: parent.index + 1 }
    : { listPath: rootListPath, index: section.blocks.length };
};
