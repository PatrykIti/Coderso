import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  createPageDocumentId,
  getPageBlockActiveSlotKeys,
  pageBlockCapabilities,
  type PageBlockSlotKey,
  type PageBlockV2,
  type PageSectionV2,
} from "./pageDocumentV2";

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
  direction: -1 | 1
): PageBlockInsertTarget | null => {
  const parent = getParentListPath(path);
  if (!parent.listPath) return null;
  return { listPath: parent.listPath, index: parent.index + direction };
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
