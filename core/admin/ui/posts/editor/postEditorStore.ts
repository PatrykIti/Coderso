import {
  createEmptyWritingCanvasContent,
  type PostBlock,
  type PostBlockDocument,
  type PostBlockType,
} from "../../../../services/posts/editor/postBlockDocument";
import {
  createEmptyPostBlockDocument,
  normalizePostBlockDocument,
} from "../../../../services/posts/editor/postBlockNormalizer";
import { transformPostBlock } from "./blocks/blockTransforms";

const HISTORY_LIMIT = 100;

export type PostEditorHistory = {
  past: PostBlockDocument[];
  future: PostBlockDocument[];
};

export type PostEditorState = {
  document: PostBlockDocument;
  selectedBlockId: string | null;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  history: PostEditorHistory;
};

type UpdateBlockMutation = {
  id: string;
  mutate: (block: PostBlock) => PostBlock;
};

type InsertBlockMutation = {
  block: PostBlock;
  afterId?: string | null;
  atIndex?: number;
};

type MoveBlockMutation = {
  id: string;
  direction: "up" | "down";
};

type MoveBlockToIndexMutation = {
  id: string;
  targetIndex: number;
};

type TransformBlockMutation = {
  id: string;
  targetType: PostBlockType;
};

export type PostEditorAction =
  | {
      type: "hydrate";
      document: PostBlockDocument;
      selectedBlockId?: string | null;
    }
  | { type: "set_saving"; saving: boolean }
  | { type: "mark_saved"; at: string }
  | { type: "select_block"; id: string | null }
  | { type: "update_meta"; patch: Partial<PostBlockDocument["meta"]> }
  | { type: "update_block"; mutation: UpdateBlockMutation }
  | { type: "insert_block"; mutation: InsertBlockMutation }
  | { type: "delete_block"; id: string }
  | { type: "move_block"; mutation: MoveBlockMutation }
  | { type: "move_block_to_index"; mutation: MoveBlockToIndexMutation }
  | { type: "transform_block"; mutation: TransformBlockMutation }
  | { type: "ensure_toc_block"; afterBlockId?: string | null }
  | { type: "undo" }
  | { type: "redo" };

const cloneDocument = (document: PostBlockDocument): PostBlockDocument => {
  if (typeof structuredClone === "function") {
    return structuredClone(document);
  }
  return JSON.parse(JSON.stringify(document)) as PostBlockDocument;
};

const firstBlockId = (document: PostBlockDocument) => document.blocks[0]?.id ?? null;

const getNextBlockNumericId = (document: PostBlockDocument) => {
  let max = 0;
  for (const block of document.blocks) {
    const match = /^block-(\d+)$/.exec(block.id);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max + 1;
};

export const createPostBlock = (type: PostBlockType, id?: string): PostBlock => {
  const base: PostBlock = {
    id: id ?? "block-1",
    type,
    attrs: {},
    content: null,
  };

  switch (type) {
    case "paragraph":
      return { ...base, content: "" };
    case "writing-canvas":
      return { ...base, content: createEmptyWritingCanvasContent() };
    case "toc":
      return {
        ...base,
        attrs: {
          title: "Table of contents",
          minLevel: 1,
          maxLevel: 3,
          ordered: false,
          hideIfEmpty: true,
        },
        content: null,
      };
    case "heading":
      return { ...base, attrs: { level: 2 }, content: "" };
    case "list":
      return { ...base, attrs: { ordered: false }, content: [""] };
    case "quote":
      return { ...base, content: "" };
    case "code":
      return { ...base, content: "" };
    case "image":
      return { ...base, attrs: { mediaId: null, alt: "" }, content: null };
    case "video":
      return {
        ...base,
        attrs: { mediaId: null, url: "", caption: "", controls: true, autoplay: false },
        content: null,
      };
    case "gallery":
      return {
        ...base,
        attrs: { mediaIds: [], columns: 3, captions: true },
        content: null,
      };
    case "audio":
      return {
        ...base,
        attrs: { mediaId: null, url: "", caption: "", controls: true },
        content: null,
      };
    case "file":
      return {
        ...base,
        attrs: { mediaId: null, label: "Download file", showSize: true, newTab: false },
        content: null,
      };
    case "separator":
      return { ...base, content: null };
    case "callout":
      return { ...base, attrs: { tone: "info" }, content: "" };
    case "button":
      return {
        ...base,
        attrs: { label: "Button", url: "", variant: "primary" },
        content: null,
      };
    case "embed":
      return {
        ...base,
        attrs: { provider: "custom", url: "" },
        content: null,
      };
    default:
      return base;
  }
};

const withHistory = (state: PostEditorState, nextDocument: PostBlockDocument): PostEditorState => {
  const currentSerialized = JSON.stringify(state.document);
  const nextSerialized = JSON.stringify(nextDocument);
  if (currentSerialized === nextSerialized) return state;

  const nextPast = [...state.history.past, cloneDocument(state.document)];
  const trimmedPast =
    nextPast.length > HISTORY_LIMIT
      ? nextPast.slice(nextPast.length - HISTORY_LIMIT)
      : nextPast;

  return {
    ...state,
    document: nextDocument,
    dirty: true,
    history: {
      past: trimmedPast,
      future: [],
    },
  };
};

const ensureSelectedBlock = (
  selectedBlockId: string | null,
  document: PostBlockDocument
) => {
  if (!selectedBlockId) return firstBlockId(document);
  return document.blocks.some((block) => block.id === selectedBlockId)
    ? selectedBlockId
    : firstBlockId(document);
};

const mutateDocumentMeta = (
  state: PostEditorState,
  patch: Partial<PostBlockDocument["meta"]>
) => {
  const nextDocument = cloneDocument(state.document);
  nextDocument.meta = {
    ...nextDocument.meta,
    ...patch,
  };
  return withHistory(state, normalizePostBlockDocument(nextDocument));
};

const mutateUpdateBlock = (state: PostEditorState, mutation: UpdateBlockMutation) => {
  const nextDocument = cloneDocument(state.document);
  const index = nextDocument.blocks.findIndex((block) => block.id === mutation.id);
  if (index === -1) return state;
  nextDocument.blocks[index] = mutation.mutate(nextDocument.blocks[index] as PostBlock);
  return withHistory(state, normalizePostBlockDocument(nextDocument));
};

const mutateInsertBlock = (state: PostEditorState, mutation: InsertBlockMutation) => {
  const nextDocument = cloneDocument(state.document);
  const generatedId = `block-${getNextBlockNumericId(nextDocument)}`;
  const requestedId = mutation.block.id?.trim();
  const hasIdConflict =
    !!requestedId && nextDocument.blocks.some((block) => block.id === requestedId);
  const blockId = requestedId && !hasIdConflict ? requestedId : generatedId;
  const normalizedBlock = normalizePostBlockDocument({
    version: 1,
    blocks: [{ ...mutation.block, id: blockId }],
  }).blocks[0] as PostBlock;

  let insertIndex = nextDocument.blocks.length;
  if (Number.isInteger(mutation.atIndex)) {
    insertIndex = Math.max(
      0,
      Math.min(nextDocument.blocks.length, Number(mutation.atIndex))
    );
    nextDocument.blocks.splice(insertIndex, 0, normalizedBlock);
  } else if (!mutation.afterId) {
    nextDocument.blocks.push(normalizedBlock);
    insertIndex = nextDocument.blocks.length - 1;
  } else {
    const index = nextDocument.blocks.findIndex((block) => block.id === mutation.afterId);
    if (index === -1) {
      nextDocument.blocks.push(normalizedBlock);
      insertIndex = nextDocument.blocks.length - 1;
    } else {
      insertIndex = index + 1;
      nextDocument.blocks.splice(insertIndex, 0, normalizedBlock);
    }
  }

  const normalizedNextDocument = normalizePostBlockDocument(nextDocument);
  const next = withHistory(state, normalizedNextDocument);
  return {
    ...next,
    selectedBlockId: normalizedNextDocument.blocks[insertIndex]?.id ?? firstBlockId(next.document),
  };
};

const mutateDeleteBlock = (state: PostEditorState, id: string) => {
  const nextDocument = cloneDocument(state.document);
  const nextBlocks = nextDocument.blocks.filter((block) => block.id !== id);
  if (nextBlocks.length === nextDocument.blocks.length) return state;

  nextDocument.blocks =
    nextBlocks.length > 0
      ? nextBlocks
      : [createPostBlock("writing-canvas", `block-${getNextBlockNumericId(nextDocument)}`)];

  const next = withHistory(state, normalizePostBlockDocument(nextDocument));
  return {
    ...next,
    selectedBlockId: ensureSelectedBlock(state.selectedBlockId, next.document),
  };
};

const mutateMoveBlock = (state: PostEditorState, mutation: MoveBlockMutation) => {
  const nextDocument = cloneDocument(state.document);
  const index = nextDocument.blocks.findIndex((block) => block.id === mutation.id);
  if (index === -1) return state;

  const targetIndex = mutation.direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= nextDocument.blocks.length) {
    return state;
  }

  const [item] = nextDocument.blocks.splice(index, 1);
  nextDocument.blocks.splice(targetIndex, 0, item as PostBlock);

  return withHistory(state, normalizePostBlockDocument(nextDocument));
};

const mutateMoveBlockToIndex = (
  state: PostEditorState,
  mutation: MoveBlockToIndexMutation
) => {
  const nextDocument = cloneDocument(state.document);
  const sourceIndex = nextDocument.blocks.findIndex((block) => block.id === mutation.id);
  if (sourceIndex === -1) return state;

  const boundedTarget = Math.max(0, Math.min(nextDocument.blocks.length, mutation.targetIndex));
  if (boundedTarget === sourceIndex || boundedTarget === sourceIndex + 1) return state;

  const [item] = nextDocument.blocks.splice(sourceIndex, 1);
  if (!item) return state;

  const insertIndex = sourceIndex < boundedTarget ? boundedTarget - 1 : boundedTarget;
  nextDocument.blocks.splice(insertIndex, 0, item as PostBlock);

  return withHistory(state, normalizePostBlockDocument(nextDocument));
};

const mutateTransformBlock = (state: PostEditorState, mutation: TransformBlockMutation) => {
  const nextDocument = cloneDocument(state.document);
  const index = nextDocument.blocks.findIndex((block) => block.id === mutation.id);
  if (index === -1) return state;
  const current = nextDocument.blocks[index] as PostBlock;
  const transformed = transformPostBlock(current, mutation.targetType);
  if (!transformed) return state;
  nextDocument.blocks[index] = transformed;
  return withHistory(state, normalizePostBlockDocument(nextDocument));
};

const mutateEnsureTocBlock = (
  state: PostEditorState,
  afterBlockId?: string | null
) => {
  const existingToc = state.document.blocks.find((block) => block.type === "toc");
  if (existingToc) {
    return {
      ...state,
      selectedBlockId: existingToc.id,
    };
  }

  const nextDocument = cloneDocument(state.document);
  const generatedId = `block-${getNextBlockNumericId(nextDocument)}`;
  const tocBlock = normalizePostBlockDocument({
    version: 1,
    blocks: [createPostBlock("toc", generatedId)],
  }).blocks[0] as PostBlock;

  let insertIndex = 0;
  if (afterBlockId) {
    const index = nextDocument.blocks.findIndex((block) => block.id === afterBlockId);
    insertIndex = index === -1 ? 0 : index + 1;
  }
  nextDocument.blocks.splice(insertIndex, 0, tocBlock);

  const normalizedNextDocument = normalizePostBlockDocument(nextDocument);
  const next = withHistory(state, normalizedNextDocument);
  return {
    ...next,
    selectedBlockId:
      normalizedNextDocument.blocks[insertIndex]?.id ??
      ensureSelectedBlock(next.selectedBlockId, normalizedNextDocument),
  };
};

export const createInitialPostEditorState = (
  document?: PostBlockDocument,
  selectedBlockId?: string | null
): PostEditorState => {
  const normalized = document
    ? normalizePostBlockDocument(document, { fallbackToEmpty: true })
    : createEmptyPostBlockDocument();

  return {
    document: normalized,
    selectedBlockId: ensureSelectedBlock(selectedBlockId ?? null, normalized),
    dirty: false,
    saving: false,
    lastSavedAt: null,
    history: {
      past: [],
      future: [],
    },
  };
};

export const postEditorReducer = (
  state: PostEditorState,
  action: PostEditorAction
): PostEditorState => {
  switch (action.type) {
    case "hydrate": {
      const normalized = normalizePostBlockDocument(action.document, {
        fallbackToEmpty: true,
      });
      return {
        ...createInitialPostEditorState(normalized, action.selectedBlockId),
        lastSavedAt: state.lastSavedAt,
      };
    }
    case "set_saving":
      return {
        ...state,
        saving: action.saving,
      };
    case "mark_saved":
      return {
        ...state,
        dirty: false,
        saving: false,
        lastSavedAt: action.at,
      };
    case "select_block":
      return {
        ...state,
        selectedBlockId: action.id,
      };
    case "update_meta":
      return mutateDocumentMeta(state, action.patch);
    case "update_block":
      return mutateUpdateBlock(state, action.mutation);
    case "insert_block":
      return mutateInsertBlock(state, action.mutation);
    case "delete_block":
      return mutateDeleteBlock(state, action.id);
    case "move_block":
      return mutateMoveBlock(state, action.mutation);
    case "move_block_to_index":
      return mutateMoveBlockToIndex(state, action.mutation);
    case "transform_block":
      return mutateTransformBlock(state, action.mutation);
    case "ensure_toc_block":
      return mutateEnsureTocBlock(state, action.afterBlockId);
    case "undo": {
      if (state.history.past.length === 0) return state;
      const previous = state.history.past[state.history.past.length - 1] as PostBlockDocument;
      const past = state.history.past.slice(0, -1);
      const future = [cloneDocument(state.document), ...state.history.future];
      return {
        ...state,
        document: cloneDocument(previous),
        selectedBlockId: ensureSelectedBlock(state.selectedBlockId, previous),
        dirty: true,
        history: {
          past,
          future,
        },
      };
    }
    case "redo": {
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0] as PostBlockDocument;
      const future = state.history.future.slice(1);
      const past = [...state.history.past, cloneDocument(state.document)];
      return {
        ...state,
        document: cloneDocument(next),
        selectedBlockId: ensureSelectedBlock(state.selectedBlockId, next),
        dirty: true,
        history: {
          past,
          future,
        },
      };
    }
    default:
      return state;
  }
};
