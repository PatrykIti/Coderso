import type { PostBlock } from "../../../../services/posts/editor/postBlockDocument";

export type PostInsertSource = "sidebar" | "slash" | "appender";

export type PostInsertTarget =
  | { mode: "after-selected" }
  | { mode: "after-block"; blockId: string | null }
  | { mode: "index"; index: number };

export type PostInsertOptions = {
  source?: PostInsertSource;
  target?: PostInsertTarget;
  focus?: boolean;
};

export type PostInsertMutation = {
  afterId?: string | null;
  atIndex?: number;
};

type ResolvePostInsertMutationInput = {
  blocks: PostBlock[];
  selectedBlockId: string | null;
  options?: PostInsertOptions;
};

const clampInsertIndex = (index: number, blockCount: number) =>
  Math.max(0, Math.min(blockCount, index));

const hasBlockId = (blocks: PostBlock[], id: string | null | undefined) =>
  typeof id === "string" && blocks.some((block) => block.id === id);

export const resolvePostInsertMutation = (
  input: ResolvePostInsertMutationInput
): PostInsertMutation => {
  const source = input.options?.source ?? "sidebar";
  const target = input.options?.target;
  const blockCount = input.blocks.length;

  if (target?.mode === "index") {
    return {
      atIndex: clampInsertIndex(target.index, blockCount),
    };
  }

  if (target?.mode === "after-block") {
    if (hasBlockId(input.blocks, target.blockId)) {
      return { afterId: target.blockId };
    }
    return { atIndex: blockCount };
  }

  if (source === "appender") {
    return { atIndex: blockCount };
  }

  if (hasBlockId(input.blocks, input.selectedBlockId)) {
    return { afterId: input.selectedBlockId };
  }

  return { atIndex: blockCount };
};

