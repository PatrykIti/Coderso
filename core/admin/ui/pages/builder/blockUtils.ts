import type {
  Block,
  LayoutValue,
  WidgetDefinition,
  WidgetEditorState,
  WidgetVisibility,
} from "./types";
import { containerTokens, spacingTokens } from "./types";
import { getRegisteredWidget } from "@/ui/widgets/registry";

const defaultLayout: LayoutValue = {
  container: "default",
  padding: { top: "xl", bottom: "xl" },
  margin: { top: "none", bottom: "none" },
  background: { color: "transparent", image: null },
};

const defaultVisibility: WidgetVisibility = {
  devices: ["desktop", "tablet", "mobile"],
  enabled: true,
};
const defaultEditor: WidgetEditorState = {
  mode: "wizard",
  wizardCompleted: false,
};

const resolveDefinition = (input: WidgetDefinition | string) =>
  typeof input === "string" ? getRegisteredWidget(input) : input;

export type BlockPath = number[];
type BlockWithoutEditor = Omit<Block, "editor"> & { children?: BlockWithoutEditor[] };

type BlockLocation = {
  block: Block;
  path: BlockPath;
  parentListPath: BlockPath;
  index: number;
};

const getChildren = (block: Block) =>
  Array.isArray(block.children) ? block.children : [];

const findBlockLocation = (
  blocks: Block[],
  id: string,
  path: BlockPath = []
): BlockLocation | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const currentPath = [...path, index];
    if (block.id === id) {
      return { block, path: currentPath, parentListPath: path, index };
    }
    const children = getChildren(block);
    if (children.length === 0) continue;
    const found = findBlockLocation(children, id, currentPath);
    if (found) return found;
  }
  return null;
};

const cloneBlockTree = (block: Block): Block => {
  const editorState = block.editor ?? { mode: "visual", wizardCompleted: true };
  const children = getChildren(block);
  return {
    ...block,
    id: crypto.randomUUID(),
    editor: { ...editorState, mode: "visual" },
    ...(children.length ? { children: children.map(cloneBlockTree) } : {}),
  };
};

export function createBlock(definition: WidgetDefinition | string): Block {
  const resolved = resolveDefinition(definition);
  const type = typeof definition === "string" ? definition : definition.type;
  return {
    id: crypto.randomUUID(),
    type,
    variant: resolved?.variants[0]?.id,
    data: resolved?.defaults ?? {},
    layout: { ...defaultLayout },
    visibility: { ...defaultVisibility },
    editor: { ...defaultEditor },
    ...(resolved?.canHaveChildren ? { children: [] } : {}),
  };
}

export function reorderBlocks<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || toIndex < 0) return items;
  if (fromIndex >= items.length || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export function updateBlockListAtPath(
  blocks: Block[],
  path: BlockPath,
  updater: (items: Block[]) => Block[]
) {
  if (path.length === 0) return updater(blocks);
  const [index, ...rest] = path;
  const target = blocks[index];
  if (!target) return blocks;
  const children = getChildren(target);
  const nextChildren = updateBlockListAtPath(children, rest, updater);
  if (nextChildren === children) return blocks;
  const next = [...blocks];
  next[index] = {
    ...target,
    children: nextChildren,
  };
  return next;
}

export function findBlockById(blocks: Block[], id?: string | null) {
  if (!id) return null;
  const location = findBlockLocation(blocks, id);
  return location?.block ?? null;
}

export function updateBlockById(
  blocks: Block[],
  id: string,
  updater: (block: Block) => Block
) {
  const location = findBlockLocation(blocks, id);
  if (!location) return blocks;
  return updateBlockListAtPath(blocks, location.parentListPath, (items) => {
    const next = [...items];
    next[location.index] = updater(items[location.index]);
    return next;
  });
}

export function deleteBlockById(blocks: Block[], id: string) {
  const location = findBlockLocation(blocks, id);
  if (!location) return { blocks, deleted: false };
  const next = updateBlockListAtPath(blocks, location.parentListPath, (items) => {
    const updated = [...items];
    updated.splice(location.index, 1);
    return updated;
  });
  return { blocks: next, deleted: true };
}

export function insertBlockAfterId(blocks: Block[], afterId: string | null, next: Block) {
  if (!afterId) return [...blocks, next];
  const location = findBlockLocation(blocks, afterId);
  if (!location) return [...blocks, next];
  return updateBlockListAtPath(blocks, location.parentListPath, (items) => {
    const updated = [...items];
    updated.splice(location.index + 1, 0, next);
    return updated;
  });
}

export function appendChildBlock(blocks: Block[], parentId: string, child: Block) {
  const location = findBlockLocation(blocks, parentId);
  if (!location) return blocks;
  return updateBlockListAtPath(blocks, location.path, (items) => [...items, child]);
}

export function duplicateBlock(blocks: Block[], id: string) {
  const location = findBlockLocation(blocks, id);
  if (!location) return blocks;
  const clone = cloneBlockTree(location.block);
  return updateBlockListAtPath(blocks, location.parentListPath, (items) => {
    const updated = [...items];
    updated.splice(location.index + 1, 0, clone);
    return updated;
  });
}

export function reorderBlocksAtPath(
  blocks: Block[],
  path: BlockPath,
  fromIndex: number,
  toIndex: number
) {
  return updateBlockListAtPath(blocks, path, (items) =>
    reorderBlocks(items, fromIndex, toIndex)
  );
}

export function flattenBlocks(blocks: Block[]) {
  const result: Block[] = [];
  const walk = (items: Block[]) => {
    for (const block of items) {
      result.push(block);
      const children = getChildren(block);
      if (children.length) walk(children);
    }
  };
  walk(blocks);
  return result;
}

export function getFirstBlockId(blocks: Block[]) {
  return flattenBlocks(blocks)[0]?.id ?? null;
}

export function stripEditor(blocks: Block[]): BlockWithoutEditor[] {
  return blocks.map(({ editor: _editor, children, ...rest }) => ({
    ...rest,
    ...(children ? { children: stripEditor(children) } : {}),
  }));
}

export function applyWizardSelection(block: Block, variant?: string): Block {
  return {
    ...block,
    variant: variant ?? block.variant,
    editor: { mode: "visual", wizardCompleted: true },
  };
}

export function sanitizeLayout(layout?: LayoutValue | null): LayoutValue {
  const resolved = {
    ...defaultLayout,
    ...layout,
    padding: { ...defaultLayout.padding, ...(layout?.padding ?? {}) },
    margin: { ...defaultLayout.margin, ...(layout?.margin ?? {}) },
    background: { ...defaultLayout.background, ...(layout?.background ?? {}) },
  };
  return {
    ...resolved,
    container: containerTokens.includes(resolved.container)
      ? resolved.container
      : "default",
    padding: {
      top: spacingTokens.includes(resolved.padding.top)
        ? resolved.padding.top
        : "md",
      bottom: spacingTokens.includes(resolved.padding.bottom)
        ? resolved.padding.bottom
        : "md",
    },
    margin: {
      top: spacingTokens.includes(resolved.margin.top) ? resolved.margin.top : "none",
      bottom: spacingTokens.includes(resolved.margin.bottom)
        ? resolved.margin.bottom
        : "none",
    },
  };
}

export function shouldWarnOnNavigate(hasChanges: boolean) {
  return hasChanges;
}
