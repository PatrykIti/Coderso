import type { WidgetBlock } from "../../widgets/types";

export type AssistantPageWidgetDataPatchValue = string | number | boolean | null;

export type AssistantPageWidgetDataPatchInput = {
  blockId: string;
  expectedBlockType?: string | null;
  dataPath: string[];
  value: AssistantPageWidgetDataPatchValue;
};

export type AssistantPageWidgetDataPatchStatus =
  | "ok"
  | "missing_block"
  | "type_mismatch"
  | "missing_path";

export type AssistantPageWidgetDataPatchResult = {
  status: AssistantPageWidgetDataPatchStatus;
  blocks: WidgetBlock[];
  beforeValue: unknown;
  nextValue: unknown;
  block: WidgetBlock | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readExistingPathValue = (data: Record<string, unknown>, path: string[]) => {
  let cursor: unknown = data;
  for (const segment of path) {
    if (!isRecord(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return { found: false, value: undefined };
    }
    cursor = cursor[segment];
  }
  return { found: true, value: cursor };
};

const setExistingPathValue = (
  data: Record<string, unknown>,
  path: string[],
  value: AssistantPageWidgetDataPatchValue
): Record<string, unknown> | null => {
  if (path.length === 0) return null;
  const [head, ...tail] = path;
  if (!head || !Object.prototype.hasOwnProperty.call(data, head)) return null;
  if (tail.length === 0) {
    return {
      ...data,
      [head]: value,
    };
  }
  const next = data[head];
  if (!isRecord(next)) return null;
  const child: Record<string, unknown> | null = setExistingPathValue(next, tail, value);
  if (!child) return null;
  return {
    ...data,
    [head]: child,
  };
};

export const applyPageWidgetDataPatch = (
  blocks: WidgetBlock[],
  input: AssistantPageWidgetDataPatchInput
): AssistantPageWidgetDataPatchResult => {
  const index = blocks.findIndex((block) => block.id === input.blockId);
  if (index < 0) {
    return {
      status: "missing_block",
      blocks,
      beforeValue: undefined,
      nextValue: undefined,
      block: null,
    };
  }

  const block = blocks[index]!;
  if (input.expectedBlockType && block.type !== input.expectedBlockType) {
    return {
      status: "type_mismatch",
      blocks,
      beforeValue: undefined,
      nextValue: undefined,
      block,
    };
  }

  const data = isRecord(block.data) ? block.data : {};
  const current = readExistingPathValue(data, input.dataPath);
  if (!current.found) {
    return {
      status: "missing_path",
      blocks,
      beforeValue: undefined,
      nextValue: undefined,
      block,
    };
  }

  const nextData = setExistingPathValue(data, input.dataPath, input.value);
  if (!nextData) {
    return {
      status: "missing_path",
      blocks,
      beforeValue: current.value,
      nextValue: undefined,
      block,
    };
  }

  const nextBlock = {
    ...block,
    data: nextData,
  };
  const nextBlocks = [...blocks];
  nextBlocks[index] = nextBlock;

  return {
    status: "ok",
    blocks: nextBlocks,
    beforeValue: current.value,
    nextValue: input.value,
    block: nextBlock,
  };
};
