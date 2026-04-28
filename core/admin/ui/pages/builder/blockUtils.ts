import type {
  Block,
  LayoutValue,
  WidgetDefinition,
  WidgetEditorState,
  WidgetVisibility,
} from "./types";
import { containerTokens, spacingTokens } from "./types";
import { getRegisteredWidget } from "@/ui/widgets/registry";
import {
  buildRepeatableSlotId,
  getNextRepeatableSlotInstanceId,
  getRepeatableSlotIds,
  getWidgetSlotKind,
  parseRepeatableSlotId,
} from "../../../../widgets/slots";

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

const isContainerToken = (value: unknown): value is (typeof containerTokens)[number] =>
  typeof value === "string" && containerTokens.includes(value as (typeof containerTokens)[number]);

const isSpacingToken = (value: unknown): value is (typeof spacingTokens)[number] =>
  typeof value === "string" && spacingTokens.includes(value as (typeof spacingTokens)[number]);

const resolveDefinition = (input: WidgetDefinition | string) =>
  typeof input === "string" ? getRegisteredWidget(input) : input;

export type BlockPathSegment = { index: number; slotId?: string };
export type BlockPath = BlockPathSegment[];
type BlockWithoutEditor = Omit<Block, "editor"> & {
  children?: BlockWithoutEditor[];
  slots?: Record<string, BlockWithoutEditor[]>;
};

type BlockLocation = {
  block: Block;
  path: BlockPath;
  parentListPath: BlockPath;
  index: number;
};

const normalizeSlotId = (slotId?: string | null) => {
  const normalized = slotId?.trim();
  return normalized && normalized.length > 0 ? normalized : "default";
};

const getSlotMap = (block: Block): Record<string, Block[]> => {
  if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
    const result: Record<string, Block[]> = {};
    for (const [key, value] of Object.entries(block.slots)) {
      const id = key.trim();
      if (!id) continue;
      result[id] = Array.isArray(value) ? (value as Block[]) : [];
    }
    return result;
  }
  if (Array.isArray(block.children)) {
    return { default: block.children };
  }
  return {};
};

const getSlotBlocks = (block: Block, slotId?: string | null) => {
  const slots = getSlotMap(block);
  const key = normalizeSlotId(slotId);
  return slots[key] ?? [];
};

const setSlotBlocks = (block: Block, slotId: string, nextBlocks: Block[]) => {
  const slots = { ...getSlotMap(block), [slotId]: nextBlocks };
  return {
    ...block,
    slots,
    children: undefined,
  };
};

const findBlockLocation = (
  blocks: Block[],
  id: string,
  listPath: BlockPath = []
): BlockLocation | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const currentPath = [...listPath, { index }];
    if (block.id === id) {
      return { block, path: currentPath, parentListPath: listPath, index };
    }
    const slots = getSlotMap(block);
    for (const [slotId, slotBlocks] of Object.entries(slots)) {
      if (slotBlocks.length === 0) continue;
      const found = findBlockLocation(slotBlocks, id, [
        ...listPath,
        { index, slotId },
      ]);
      if (found) return found;
    }
  }
  return null;
};

const cloneBlockTree = (block: Block): Block => {
  const editorState = block.editor ?? { mode: "visual", wizardCompleted: true };
  const children = Array.isArray(block.children) ? block.children : [];
  const slots = block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)
    ? Object.fromEntries(
        Object.entries(block.slots).map(([key, value]) => [
          key,
          Array.isArray(value) ? (value as Block[]).map(cloneBlockTree) : [],
        ])
      )
    : undefined;
  return {
    ...block,
    id: crypto.randomUUID(),
    editor: { ...editorState, mode: "visual" },
    ...(children.length ? { children: children.map(cloneBlockTree) } : {}),
    ...(slots ? { slots } : {}),
  };
};

export function createBlock(definition: WidgetDefinition | string): Block {
  const resolved = resolveDefinition(definition);
  const type = typeof definition === "string" ? definition : definition.type;
  const slotDefinitions = resolved?.slots ?? [];
  const slotMap =
    slotDefinitions.length > 0
      ? (() => {
          const slots: Record<string, Block[]> = {};
          for (const slot of slotDefinitions) {
            if (getWidgetSlotKind(slot) === "fixed") {
              slots[slot.id] = [];
              continue;
            }
            const minimum = Number.isFinite(slot.minItems)
              ? Math.max(0, Math.floor(slot.minItems ?? 0))
              : 0;
            for (let index = 0; index < minimum; index += 1) {
              slots[buildRepeatableSlotId(slot.id, String(index + 1))] = [];
            }
          }
          return Object.keys(slots).length > 0 ? slots : undefined;
        })()
      : undefined;
  return {
    id: crypto.randomUUID(),
    type,
    variant: resolved?.variants[0]?.id,
    data: resolved?.defaults ?? {},
    layout: { ...defaultLayout },
    visibility: { ...defaultVisibility },
    editor: { ...defaultEditor },
    ...(slotMap ? { slots: slotMap } : {}),
    ...(!slotMap && resolved?.canHaveChildren ? { children: [] } : {}),
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
  const [segment, ...rest] = path;
  const target = blocks[segment.index];
  if (!target) return blocks;
  const slotId = normalizeSlotId(segment.slotId);
  const slotBlocks = getSlotBlocks(target, slotId);
  const nextSlotBlocks = updateBlockListAtPath(slotBlocks, rest, updater);
  if (nextSlotBlocks === slotBlocks) return blocks;
  const next = [...blocks];
  next[segment.index] = {
    ...setSlotBlocks(target, slotId, nextSlotBlocks),
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

export function appendSlotBlock(
  blocks: Block[],
  parentId: string,
  slotId: string | null,
  child: Block
) {
  const resolvedSlotId = normalizeSlotId(slotId);
  return updateBlockById(blocks, parentId, (block) => {
    const slotBlocks = getSlotBlocks(block, resolvedSlotId);
    return setSlotBlocks(block, resolvedSlotId, [...slotBlocks, child]);
  });
}

export function appendChildBlock(blocks: Block[], parentId: string, child: Block) {
  return appendSlotBlock(blocks, parentId, "default", child);
}

export function addRepeatableSlotInstance(
  blocks: Block[],
  parentId: string,
  definitionId: string
) {
  return updateBlockById(blocks, parentId, (block) => {
    const definition = getRegisteredWidget(block.type);
    const slot = definition?.slots?.find((item) => item.id === definitionId);
    if (!slot || getWidgetSlotKind(slot) !== "repeatable") return block;

    const slots = getSlotMap(block);
    const existing = getRepeatableSlotIds(slot, slots);
    if (
      Number.isFinite(slot.maxItems) &&
      existing.length >= Math.floor(slot.maxItems ?? 0)
    ) {
      return block;
    }

    const nextInstanceId = getNextRepeatableSlotInstanceId(definitionId, slots);
    const nextSlotId = buildRepeatableSlotId(definitionId, nextInstanceId);
    if (slots[nextSlotId]) return block;

    return {
      ...block,
      slots: { ...slots, [nextSlotId]: [] },
      children: undefined,
    };
  });
}

export function removeRepeatableSlotInstance(
  blocks: Block[],
  parentId: string,
  slotId: string
) {
  return updateBlockById(blocks, parentId, (block) => {
    const parsed = parseRepeatableSlotId(slotId);
    if (!parsed) return block;

    const definition = getRegisteredWidget(block.type);
    const slot = definition?.slots?.find((item) => item.id === parsed.definitionId);
    if (!slot || getWidgetSlotKind(slot) !== "repeatable") return block;

    const slots = getSlotMap(block);
    if (!(slotId in slots)) return block;

    const existing = getRepeatableSlotIds(slot, slots);
    const minimum = Number.isFinite(slot.minItems)
      ? Math.max(0, Math.floor(slot.minItems ?? 0))
      : 0;
    if (existing.length <= minimum) return block;

    const nextSlots = { ...slots };
    delete nextSlots[slotId];
    return {
      ...block,
      slots: nextSlots,
      children: undefined,
    };
  });
}

const blockContainsId = (block: Block, id: string): boolean => {
  if (block.id === id) return true;
  const slots = getSlotMap(block);
  for (const slotBlocks of Object.values(slots)) {
    for (const child of slotBlocks) {
      if (blockContainsId(child, id)) return true;
    }
  }
  return false;
};

export function moveBlockIntoSlot(
  blocks: Block[],
  blockId: string,
  parentId: string,
  slotId: string | null
) {
  if (blockId === parentId) return blocks;
  const target = findBlockById(blocks, parentId);
  const moving = findBlockById(blocks, blockId);
  if (!target || !moving) return blocks;
  if (blockContainsId(moving, parentId)) return blocks;

  const removal = deleteBlockById(blocks, blockId);
  if (!removal.deleted) return blocks;
  return appendSlotBlock(removal.blocks, parentId, slotId, moving);
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
      const slots = getSlotMap(block);
      for (const slotBlocks of Object.values(slots)) {
        if (slotBlocks.length) walk(slotBlocks);
      }
    }
  };
  walk(blocks);
  return result;
}

export function getFirstBlockId(blocks: Block[]) {
  return flattenBlocks(blocks)[0]?.id ?? null;
}

export function stripEditor(blocks: Block[]): BlockWithoutEditor[] {
  return blocks.map(({ editor: _editor, children, slots, ...rest }) => {
    const nextSlots =
      slots && typeof slots === "object" && !Array.isArray(slots)
        ? Object.fromEntries(
            Object.entries(slots).map(([key, value]) => [
              key,
              Array.isArray(value) ? stripEditor(value as Block[]) : [],
            ])
          )
        : undefined;
    const nextChildren = Array.isArray(children) ? stripEditor(children) : undefined;
    return {
      ...rest,
      ...(nextChildren ? { children: nextChildren } : {}),
      ...(nextSlots ? { slots: nextSlots } : {}),
    };
  });
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
    container: isContainerToken(resolved.container) ? resolved.container : "default",
    padding: {
      top: isSpacingToken(resolved.padding.top) ? resolved.padding.top : "md",
      bottom: isSpacingToken(resolved.padding.bottom) ? resolved.padding.bottom : "md",
    },
    margin: {
      top: isSpacingToken(resolved.margin.top) ? resolved.margin.top : "none",
      bottom: isSpacingToken(resolved.margin.bottom) ? resolved.margin.bottom : "none",
    },
  };
}

export function shouldWarnOnNavigate(hasChanges: boolean) {
  return hasChanges;
}
