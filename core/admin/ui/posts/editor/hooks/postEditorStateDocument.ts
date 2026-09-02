// TASK-105-08-08-L04 split: the pure post document/draft model shared by the
// post editor state hook — legacy document coercion for the writing flow,
// metadata drafts, draft snapshots/payloads, and revision list upkeep.
// Extracted verbatim from usePostEditorState.ts (single writer:
// TASK-105-08-08-L04). No behavior change.

import {
  type PostAutosavePayload,
  type PostDetail,
  type PostRevision,
  type PostSeo,
} from "@/services/postsClient";

import { coercePostDocument } from "../../../../../services/posts/editor/postBlockLegacyAdapter";
import {
  POST_BLOCK_TYPES,
  WRITING_CANVAS_VERSION,
  type PostBlock,
  type PostBlockDocumentMeta,
  type PostBlockType,
} from "../../../../../services/posts/editor/postBlockDocument";
import { normalizePostBlockDocument } from "../../../../../services/posts/editor/postBlockNormalizer";
import { postRichTextToPlainText } from "../../../../../services/posts/editor/postRichTextSerializer";
import {
  createInitialPostEditorState,
  createPostBlock,
  type PostEditorAction,
  type PostEditorState,
} from "../postEditorStore";
import { resolvePostInsertMutation, type PostInsertOptions } from "../postInsertFlow";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const getPostDataRecord = (post: PostDetail | null): Record<string, unknown> => {
  if (!post || !isRecord(post.data)) return {};
  return { ...post.data };
};

export const createSafeBlockType = (value: string): PostBlockType => {
  const fallback: PostBlockType = "writing-canvas";
  if ((POST_BLOCK_TYPES as readonly string[]).includes(value)) {
    return value as PostBlockType;
  }
  return fallback;
};

const hasMeaningfulParagraphAttrs = (attrs: Record<string, unknown>) =>
  Object.entries(attrs).some(([key, value]) => {
    if (key === "align") return value !== "left";
    if (key === "width") return value !== "auto";
    if (key === "spacingTop") return value !== "md";
    if (key === "spacingBottom") return value !== "md";
    if (key === "textScale") return value !== "md";
    if (key === "highlight") return value === true;
    if (key === "hideOnMobile") return value === true;
    if (key === "anchorId" || key === "className") {
      return typeof value === "string" && value.trim().length > 0;
    }
    return true;
  });

const isEmptyParagraphBlock = (block: PostBlock) => {
  if (block.type !== "paragraph") return false;
  const plainText = postRichTextToPlainText(typeof block.content === "string" ? block.content : "");
  const attrs = isRecord(block.attrs) ? block.attrs : {};
  return plainText.trim().length === 0 && !hasMeaningfulParagraphAttrs(attrs);
};

export const normalizeEditorDocumentForWritingFlow = (input: unknown) => {
  const document = coercePostDocument(input);
  const firstWritingCanvasIndex = document.blocks.findIndex(
    (block) => block.type === "writing-canvas"
  );

  if (firstWritingCanvasIndex !== -1) {
    const nextBlocks = document.blocks.filter(
      (block, index) => !(index < firstWritingCanvasIndex && isEmptyParagraphBlock(block))
    );
    if (nextBlocks.length !== document.blocks.length) {
      return normalizePostBlockDocument(
        {
          version: document.version,
          blocks: nextBlocks,
          meta: document.meta,
        },
        { fallbackToEmpty: true }
      );
    }
    return document;
  }

  if (document.blocks.length === 1 && (document.blocks[0] as PostBlock).type === "paragraph") {
    const paragraphBlock = document.blocks[0] as PostBlock;
    const paragraphId = paragraphBlock.id || "block-1";
    const paragraphText = typeof paragraphBlock.content === "string" ? paragraphBlock.content : "";
    return normalizePostBlockDocument(
      {
        version: document.version,
        blocks: [
          {
            ...createPostBlock("writing-canvas", paragraphId),
            content: {
              version: WRITING_CANVAS_VERSION,
              nodes: [
                {
                  id: "node-1",
                  type: "paragraph",
                  text: paragraphText,
                },
              ],
            },
          },
        ],
        meta: document.meta,
      },
      { fallbackToEmpty: true }
    );
  }

  return document;
};

export const readOptionalString = (value: unknown) => (typeof value === "string" ? value : "");

const normalizeTagInput = (value: string) => {
  const seen = new Set<string>();
  const result: string[] = [];
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(tag);
    });
  return result;
};

export type MetadataDraftState = {
  tagsInput: string;
  categoryId: string;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
  };
};

export const createMetadataDraftState = (post: PostDetail | null): MetadataDraftState => {
  const tagsInput = (post?.tags ?? []).join(", ");
  const categoryId = post?.taxonomy?.category?.id ?? "";
  const seo = {
    title: readOptionalString(post?.seo?.title),
    description: readOptionalString(post?.seo?.description),
    canonicalUrl: readOptionalString(post?.seo?.canonicalUrl),
    robots: readOptionalString(post?.seo?.robots) || "index,follow",
  };
  return { tagsInput, categoryId, seo };
};

const serializeMetadataDraft = (draft: MetadataDraftState) =>
  JSON.stringify({
    tags: normalizeTagInput(draft.tagsInput),
    categoryId: draft.categoryId.trim() || null,
    seo: {
      title: draft.seo.title.trim(),
      description: draft.seo.description.trim(),
      canonicalUrl: draft.seo.canonicalUrl.trim(),
      robots: draft.seo.robots.trim() || "index,follow",
    },
  });

export type PostBasePayload = Readonly<{
  title: string;
  slug: string;
  data: Record<string, unknown>;
}>;

export type PostMetadataPayload = Readonly<{
  tags: string[];
  taxonomy: Readonly<{ categoryId: string | null }>;
  seo: PostSeo;
}>;

export type PostDraftSnapshot = Readonly<{
  editorIdentity: string;
  basePayload: PostBasePayload;
  metadataPayload: PostMetadataPayload;
  autosavePayload: Readonly<PostAutosavePayload>;
  metadataSignature: string;
  signature: string;
}>;

export type LivePostDraft = {
  editorIdentity: string;
  title: string;
  slug: string;
  featuredImage: string;
  metadataDraft: MetadataDraftState;
  baseData: Record<string, unknown>;
  editorState: PostEditorState;
};

export const cloneJsonContract = <T>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

export const deepFreezeJsonContract = <T>(value: T): T => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeJsonContract(child);
  }
  return value;
};

export const buildMetadataPayloadFromDraft = (
  metadataDraft: MetadataDraftState
): PostMetadataPayload => {
  const categoryId = metadataDraft.categoryId.trim() || null;
  return {
    tags: normalizeTagInput(metadataDraft.tagsInput),
    taxonomy: { categoryId },
    seo: {
      title: metadataDraft.seo.title.trim() || null,
      description: metadataDraft.seo.description.trim() || null,
      canonicalUrl: metadataDraft.seo.canonicalUrl.trim() || null,
      robots: metadataDraft.seo.robots.trim() || "index,follow",
    },
  };
};

export const buildDraftSnapshot = (draft: LivePostDraft): PostDraftSnapshot => {
  const data = cloneJsonContract(draft.baseData);
  data.document = cloneJsonContract(draft.editorState.document);
  const featuredImage = draft.featuredImage.trim();
  if (featuredImage) data.featuredImage = featuredImage;
  else delete data.featuredImage;

  const basePayload: PostBasePayload = {
    title: draft.title,
    slug: draft.slug,
    data,
  };
  const metadataPayload = buildMetadataPayloadFromDraft(draft.metadataDraft);
  const metadataSignature = JSON.stringify(metadataPayload);
  const signature = JSON.stringify({ basePayload, metadataPayload });
  return deepFreezeJsonContract({
    editorIdentity: draft.editorIdentity,
    basePayload,
    metadataPayload,
    autosavePayload: {
      ...basePayload,
      ...metadataPayload,
    },
    metadataSignature,
    signature,
  });
};

export const sameSnapshot = (left: PostDraftSnapshot, right: PostDraftSnapshot) =>
  left.editorIdentity === right.editorIdentity && left.signature === right.signature;

export const createLiveDraftFromPost = (post: PostDetail): LivePostDraft => {
  const baseData = getPostDataRecord(post);
  const editorState = createInitialPostEditorState(
    normalizeEditorDocumentForWritingFlow(post.data)
  );
  return {
    editorIdentity: post.id,
    title: post.title,
    slug: post.slug,
    featuredImage:
      isRecord(post.data) && typeof post.data.featuredImage === "string"
        ? post.data.featuredImage
        : "",
    metadataDraft: createMetadataDraftState(post),
    baseData,
    editorState,
  };
};

export const upsertRevisionList = (revisions: PostRevision[], revision: PostRevision) => {
  const index = revisions.findIndex((item) => item.id === revision.id);
  const next = [...revisions];
  if (index === -1) next.unshift(revision);
  else next[index] = revision;
  return next.sort((left, right) => right.version - left.version);
};

export type PostDraftSyncMode = "silent" | "hydrate";

export const normalizePostDraftSyncMode = (
  mode: PostDraftSyncMode | undefined
): PostDraftSyncMode => (mode === "hydrate" ? "hydrate" : "silent");

export const buildSilentSyncSnapshot = (post: PostDetail, savedAt?: string) => {
  const metadataDraft = createMetadataDraftState(post);
  return {
    title: post.title,
    slug: post.slug,
    status: post.status,
    featuredImage:
      isRecord(post.data) && typeof post.data.featuredImage === "string"
        ? post.data.featuredImage
        : "",
    metadataDraft,
    metadataSignature: serializeMetadataDraft(metadataDraft),
    baseData: getPostDataRecord(post),
    savedAt: savedAt ?? post.updatedAt,
  };
};

export const shouldDeferRefreshForDirtyState = (
  options: { allowDirty?: boolean } | undefined,
  hasUnsavedChanges: boolean
) => options?.allowDirty !== true && hasUnsavedChanges;

export type PostDocumentActionsDeps = {
  dispatchEditorAction: (action: PostEditorAction) => boolean;
  installLiveDraftMutation: (mutate: (current: LivePostDraft) => LivePostDraft) => boolean;
  blocks: PostBlock[];
  selectedBlockId: string | null;
  setMetadataDraftState: (
    next: MetadataDraftState | ((prev: MetadataDraftState) => MetadataDraftState)
  ) => void;
  setInsertFocusToken: (next: (value: number) => number) => void;
};

/**
 * Block-editing and metadata-draft setter actions for the post editor state
 * facade. Bodies verbatim from usePostEditorState.ts (TASK-105-08-08-L04);
 * recreated by the facade whenever the editor state inputs change, mirroring
 * the former per-callback dependency arrays.
 */
export const createPostDocumentActions = (deps: PostDocumentActionsDeps) => {
  const {
    dispatchEditorAction,
    installLiveDraftMutation,
    blocks,
    selectedBlockId,
    setMetadataDraftState,
    setInsertFocusToken,
  } = deps;

  const updateBlockContent = (id: string, content: unknown) => {
    dispatchEditorAction({
      type: "update_block",
      mutation: {
        id,
        mutate: (block) => ({ ...block, content }),
      },
    });
  };

  const updateSelectedBlockContent = (content: unknown) => {
    if (!selectedBlockId) return;
    updateBlockContent(selectedBlockId, content);
  };

  const updateBlockAttrs = (id: string, patch: Record<string, unknown>) => {
    dispatchEditorAction({
      type: "update_block",
      mutation: {
        id,
        mutate: (block) => ({
          ...block,
          attrs: {
            ...(isRecord(block.attrs) ? block.attrs : {}),
            ...patch,
          },
        }),
      },
    });
  };

  const updateSelectedBlockAttrs = (patch: Record<string, unknown>) => {
    if (!selectedBlockId) return;
    updateBlockAttrs(selectedBlockId, patch);
  };

  const updateDocumentTypography = (
    typography: NonNullable<PostBlockDocumentMeta["typography"]>
  ) => {
    dispatchEditorAction({
      type: "update_meta",
      patch: {
        typography,
      },
    });
  };

  const setExcerpt = (value: string) => {
    dispatchEditorAction({
      type: "update_meta",
      patch: {
        excerpt: value,
      },
    });
  };

  const insertBlock = (type: string, options?: PostInsertOptions) => {
    const safeType = createSafeBlockType(type);
    const mutation = resolvePostInsertMutation({
      blocks,
      selectedBlockId,
      options,
    });
    const inserted = dispatchEditorAction({
      type: "insert_block",
      mutation: {
        block: createPostBlock(safeType),
        ...mutation,
      },
    });
    if (inserted && options?.focus !== false) {
      setInsertFocusToken((value) => value + 1);
    }
  };

  const ensureDynamicTocBlock = () => {
    dispatchEditorAction({
      type: "ensure_toc_block",
      afterBlockId: null,
    });
  };

  const deleteBlock = (id: string) => {
    dispatchEditorAction({ type: "delete_block", id });
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlockId) return;
    deleteBlock(selectedBlockId);
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    dispatchEditorAction({
      type: "move_block",
      mutation: { id, direction },
    });
  };

  const moveSelectedBlock = (direction: "up" | "down") => {
    if (!selectedBlockId) return;
    moveBlock(selectedBlockId, direction);
  };

  const moveBlockToIndex = (id: string, targetIndex: number) => {
    dispatchEditorAction({
      type: "move_block_to_index",
      mutation: { id, targetIndex },
    });
  };

  const transformBlock = (id: string, targetType: PostBlockType) => {
    dispatchEditorAction({
      type: "transform_block",
      mutation: { id, targetType },
    });
  };

  const transformSelectedBlock = (targetType: PostBlockType) => {
    if (!selectedBlockId) return;
    transformBlock(selectedBlockId, targetType);
  };

  const setTagsInput = (value: string) => {
    if (
      installLiveDraftMutation((current) => ({
        ...current,
        metadataDraft: { ...current.metadataDraft, tagsInput: value },
      }))
    ) {
      setMetadataDraftState((prev) => ({ ...prev, tagsInput: value }));
    }
  };

  const setCategoryId = (value: string) => {
    if (
      installLiveDraftMutation((current) => ({
        ...current,
        metadataDraft: { ...current.metadataDraft, categoryId: value },
      }))
    ) {
      setMetadataDraftState((prev) => ({ ...prev, categoryId: value }));
    }
  };

  const setSeoDraft = (patch: Partial<MetadataDraftState["seo"]>) => {
    if (
      installLiveDraftMutation((current) => ({
        ...current,
        metadataDraft: {
          ...current.metadataDraft,
          seo: { ...current.metadataDraft.seo, ...patch },
        },
      }))
    ) {
      setMetadataDraftState((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          ...patch,
        },
      }));
    }
  };

  return {
    updateBlockContent,
    updateSelectedBlockContent,
    updateBlockAttrs,
    updateSelectedBlockAttrs,
    updateDocumentTypography,
    setExcerpt,
    insertBlock,
    ensureDynamicTocBlock,
    deleteBlock,
    deleteSelectedBlock,
    moveBlock,
    moveSelectedBlock,
    moveBlockToIndex,
    transformBlock,
    transformSelectedBlock,
    setTagsInput,
    setCategoryId,
    setSeoDraft,
  };
};

export type PostDocumentActions = ReturnType<typeof createPostDocumentActions>;
