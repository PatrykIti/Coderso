import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  autosavePost,
  deletePost,
  getCachedPostDetail,
  getCachedPostRevisions,
  getPostCached,
  listPostRevisionsCached,
  previewPost,
  publishPost,
  restorePostRevision,
  type PostRevision,
  type PostDetail,
  type PostSeo,
  type PostStatus,
  unpublishPost,
  updatePostMetadata,
  updatePost,
} from "@/services/postsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { uploadClipboardImage } from "@/services/mediaClient";

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
  postEditorReducer,
} from "../postEditorStore";
import {
  resolvePostInsertMutation,
  type PostInsertOptions,
} from "../postInsertFlow";
import { usePostAutosave } from "./usePostAutosave";

export type {
  PostInsertOptions,
  PostInsertSource,
  PostInsertTarget,
} from "../postInsertFlow";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolvePostIdFromPath = (path: string): string | null => {
  const pathname = path.split(/[?#]/)[0] ?? "";
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "posts");
  if (index === -1) return null;
  const raw = parts[index + 1] ?? null;
  return raw ? decodeURIComponent(raw) : null;
};

const getPostDataRecord = (post: PostDetail | null): Record<string, unknown> => {
  if (!post || !isRecord(post.data)) return {};
  return { ...post.data };
};

const createSafeBlockType = (value: string): PostBlockType => {
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
    const paragraphText =
      typeof paragraphBlock.content === "string" ? paragraphBlock.content : "";
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

const readOptionalString = (value: unknown) => (typeof value === "string" ? value : "");

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

type MetadataDraftState = {
  tagsInput: string;
  categoryId: string;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
  };
};

const createMetadataDraftState = (post: PostDetail | null): MetadataDraftState => {
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

const upsertRevisionList = (revisions: PostRevision[], revision: PostRevision) => {
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

export const buildSilentSyncSnapshot = (
  post: PostDetail,
  savedAt?: string
) => {
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

export type UsePostEditorStateResult = {
  postId: string | null;
  post: PostDetail | null;
  title: string;
  slug: string;
  status: PostStatus;
  hasUnsavedChanges: boolean;
  loading: boolean;
  error: string | null;
  autosaveError: string | null;
  autosaveSaving: boolean;
  lastSavedAt: string | null;
  remoteUpdatePending: boolean;
  setTitle: (value: string) => void;
  setSlug: (value: string) => void;
  featuredImage: string;
  setFeaturedImage: (value: string) => void;
  tagsInput: string;
  setTagsInput: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  seoDraft: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
  };
  setSeoDraft: (patch: Partial<UsePostEditorStateResult["seoDraft"]>) => void;
  taxonomySummary: {
    categoryName: string | null;
    tagCount: number;
  };
  deletingPost: boolean;
  moveToTrash: () => Promise<boolean>;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  preview: () => Promise<void>;
  previewUrl: string | null;
  previewOpen: boolean;
  previewLoading: boolean;
  previewError: string | null;
  setPreviewOpen: (open: boolean) => void;
  revisionsOpen: boolean;
  setRevisionsOpen: (open: boolean) => void;
  revisions: PostRevision[];
  revisionsLoading: boolean;
  revisionsError: string | null;
  restoringRevisionId: string | null;
  openRevisions: () => void;
  restoreRevision: (revisionId: string) => Promise<void>;
  state: ReturnType<typeof createInitialPostEditorState>;
  selectedBlock: PostBlock | null;
  insertFocusToken: number;
  canUndo: boolean;
  canRedo: boolean;
  selectBlock: (id: string | null) => void;
  updateBlockContent: (id: string, content: unknown) => void;
  updateSelectedBlockContent: (content: unknown) => void;
  updateBlockAttrs: (id: string, patch: Record<string, unknown>) => void;
  updateSelectedBlockAttrs: (patch: Record<string, unknown>) => void;
  updateDocumentTypography: (
    typography: NonNullable<PostBlockDocumentMeta["typography"]>
  ) => void;
  setExcerpt: (value: string) => void;
  insertBlock: (type: string, options?: PostInsertOptions) => void;
  ensureDynamicTocBlock: () => void;
  deleteBlock: (id: string) => void;
  deleteSelectedBlock: () => void;
  moveBlock: (id: string, direction: "up" | "down") => void;
  moveSelectedBlock: (direction: "up" | "down") => void;
  moveBlockToIndex: (id: string, targetIndex: number) => void;
  transformBlock: (id: string, targetType: PostBlockType) => void;
  transformSelectedBlock: (targetType: PostBlockType) => void;
  undo: () => void;
  redo: () => void;
  markReloadRemote: () => Promise<void>;
  uploadClipboardImage: (file: File) => Promise<{ id: string; key: string; url: string }>;
};

export function usePostEditorState(): UsePostEditorStateResult {
  const { path } = useAdminRouter();
  const postId = useMemo(() => resolvePostIdFromPath(path), [path]);
  const initialCachedPost = useMemo(
    () => (postId ? getCachedPostDetail(postId) : null),
    [postId]
  );

  const [post, setPost] = useState<PostDetail | null>(() => initialCachedPost);
  const [title, setTitle] = useState(() => initialCachedPost?.title ?? "");
  const [slug, setSlug] = useState(() => initialCachedPost?.slug ?? "");
  const [status, setStatus] = useState<PostStatus>(() => initialCachedPost?.status ?? "draft");
  const [featuredImage, setFeaturedImage] = useState(() => {
    if (!initialCachedPost || !isRecord(initialCachedPost.data)) return "";
    return readOptionalString(initialCachedPost.data.featuredImage);
  });
  const [metadataDraft, setMetadataDraft] = useState<MetadataDraftState>(() =>
    createMetadataDraftState(initialCachedPost)
  );
  const [loading, setLoading] = useState(() => !initialCachedPost);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [autosaveSaving, setAutosaveSaving] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const [insertFocusToken, setInsertFocusToken] = useState(0);

  const [state, dispatch] = useReducer(
    postEditorReducer,
    createInitialPostEditorState(normalizeEditorDocumentForWritingFlow(initialCachedPost?.data))
  );

  const [baseData, setBaseData] = useState<Record<string, unknown>>(() =>
    getPostDataRecord(initialCachedPost)
  );
  const [baseMetadataSignature, setBaseMetadataSignature] = useState<string>(() =>
    serializeMetadataDraft(createMetadataDraftState(initialCachedPost))
  );
  const autosaveInFlightRef = useRef(false);

  const applyLoadedPost = useCallback((nextPost: PostDetail) => {
    setPost(nextPost);
    setTitle(nextPost.title);
    setSlug(nextPost.slug);
    setStatus(nextPost.status);
    setLastSavedAt(nextPost.updatedAt);
    setBaseData(getPostDataRecord(nextPost));
    const nextFeaturedImage =
      isRecord(nextPost.data) && typeof nextPost.data.featuredImage === "string"
        ? nextPost.data.featuredImage
        : "";
    setFeaturedImage(nextFeaturedImage);
    const nextMetadataDraft = createMetadataDraftState(nextPost);
    setMetadataDraft(nextMetadataDraft);
    setBaseMetadataSignature(serializeMetadataDraft(nextMetadataDraft));
    dispatch({
      type: "hydrate",
      document: normalizeEditorDocumentForWritingFlow(nextPost.data),
    });
  }, []);

  const applySavedPostSilently = useCallback((nextPost: PostDetail, savedAt?: string) => {
    const snapshot = buildSilentSyncSnapshot(nextPost, savedAt);
    setPost(nextPost);
    setTitle(snapshot.title);
    setSlug(snapshot.slug);
    setStatus(snapshot.status);
    setFeaturedImage(snapshot.featuredImage);
    setMetadataDraft(snapshot.metadataDraft);
    setBaseData(snapshot.baseData);
    setBaseMetadataSignature(snapshot.metadataSignature);
    dispatch({ type: "mark_saved", at: snapshot.savedAt });
    setLastSavedAt(snapshot.savedAt);
    setRemoteUpdatePending(false);
  }, []);

  const titleDirty = title !== (post?.title ?? "");
  const slugDirty = slug !== (post?.slug ?? "");
  const baselineFeaturedImage =
    post && isRecord(post.data) && typeof post.data.featuredImage === "string"
      ? post.data.featuredImage
      : "";
  const featuredImageDirty = featuredImage !== baselineFeaturedImage;
  const metadataSignature = useMemo(
    () => serializeMetadataDraft(metadataDraft),
    [metadataDraft]
  );
  const metadataDirty = metadataSignature !== baseMetadataSignature;
  const hasUnsavedChanges =
    state.dirty || titleDirty || slugDirty || featuredImageDirty || metadataDirty;
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const taxonomySummary = useMemo(
    () => ({
      categoryName: post?.taxonomy?.category?.name ?? null,
      tagCount: post?.taxonomy?.tags?.length ?? 0,
    }),
    [post]
  );

  const refresh = useCallback(
    async (options?: { force?: boolean; allowDirty?: boolean; setLoading?: boolean }) => {
      if (!postId) {
        setLoading(false);
        setError("Post ID is missing.");
        return;
      }
      if (options?.setLoading !== false) {
        setLoading(true);
      }
      setError(null);
      try {
        const nextPost = await getPostCached(postId, { force: options?.force ?? true });
        if (!nextPost) {
          setError("Post not found.");
          return;
        }
        if (shouldDeferRefreshForDirtyState(options, hasUnsavedChangesRef.current)) {
          setRemoteUpdatePending(true);
          return;
        }
        applyLoadedPost(nextPost);
        setRemoteUpdatePending(false);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load post editor.");
        }
      } finally {
        if (options?.setLoading !== false) {
          setLoading(false);
        }
      }
    },
    [applyLoadedPost, postId]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(async () => {
        if (!postId) {
          if (!active) return;
          setLoading(false);
          setError("Post ID is missing.");
          return;
        }
        const nextPost = await getPostCached(postId, { force: true });
        if (!active) return;
        if (!nextPost) {
          setError("Post not found.");
          return;
        }
        if (shouldDeferRefreshForDirtyState(undefined, hasUnsavedChangesRef.current)) {
          setRemoteUpdatePending(true);
          return;
        }
        applyLoadedPost(nextPost);
        setRemoteUpdatePending(false);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          isApiClientError(err) ? err.message : "Failed to load post editor."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyLoadedPost, postId]);

  useEffect(() => {
    if (!postId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postDetail(postId)) return;
      refresh({ force: true, setLoading: false }).catch(() => undefined);
    });
  }, [postId, refresh]);

  useEffect(() => {
    if (!postId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postRevisions(postId)) return;
      const cached = getCachedPostRevisions(postId);
      if (cached) {
        setRevisions(cached);
      }
    });
  }, [postId]);

  const buildPayloadData = useCallback(() => {
    const current = { ...baseData };
    current.document = state.document;
    const nextFeaturedImage = featuredImage.trim();
    if (nextFeaturedImage.length > 0) {
      current.featuredImage = nextFeaturedImage;
    } else {
      delete current.featuredImage;
    }
    return current;
  }, [baseData, featuredImage, state.document]);

  const buildMetadataPayload = useCallback(() => {
    const normalizedTags = normalizeTagInput(metadataDraft.tagsInput);
    const normalizedCategoryId = metadataDraft.categoryId.trim() || null;
    const normalizedSeo: PostSeo = {
      title: metadataDraft.seo.title.trim() || null,
      description: metadataDraft.seo.description.trim() || null,
      canonicalUrl: metadataDraft.seo.canonicalUrl.trim() || null,
      robots: metadataDraft.seo.robots.trim() || "index,follow",
    };

    return {
      tags: normalizedTags,
      taxonomy: {
        ...(normalizedCategoryId !== null ? { categoryId: normalizedCategoryId } : { categoryId: null }),
      },
      seo: normalizedSeo,
    };
  }, [metadataDraft]);

  const buildAutosavePayload = useCallback(
    () => ({
      title,
      slug,
      data: buildPayloadData(),
      ...buildMetadataPayload(),
    }),
    [buildMetadataPayload, buildPayloadData, slug, title]
  );

  const autosaveSignature = useMemo(
    () =>
      JSON.stringify({
        postId,
        payload: buildAutosavePayload(),
      }),
    [buildAutosavePayload, postId]
  );

  const runAutosave = useCallback(async () => {
    if (!postId || !hasUnsavedChanges || state.saving || autosaveInFlightRef.current) {
      return;
    }
    autosaveInFlightRef.current = true;
    setAutosaveSaving(true);
    setAutosaveError(null);
    try {
      const result = await autosavePost(postId, buildAutosavePayload());
      applySavedPostSilently(result.post, result.savedAt);
    } catch (err) {
      if (isApiClientError(err)) {
        setAutosaveError(err.message);
      } else {
        setAutosaveError("Failed to autosave post.");
      }
    } finally {
      autosaveInFlightRef.current = false;
      setAutosaveSaving(false);
    }
  }, [applySavedPostSilently, buildAutosavePayload, hasUnsavedChanges, postId, state.saving]);

  const { cancel: cancelAutosave } = usePostAutosave({
    enabled: Boolean(postId) && !loading && !remoteUpdatePending,
    dirty: hasUnsavedChanges,
    signature: autosaveSignature,
    onAutosave: runAutosave,
  });

  const loadRevisions = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!postId) return;
      if (!options?.silent) {
        setRevisionsLoading(true);
      }
      setRevisionsError(null);
      try {
        const nextRevisions = await listPostRevisionsCached(postId, {
          force: false,
        });
        setRevisions(nextRevisions);
      } catch (err) {
        if (isApiClientError(err)) {
          setRevisionsError(err.message);
        } else {
          setRevisionsError("Failed to load post revisions.");
        }
      } finally {
        if (!options?.silent) {
          setRevisionsLoading(false);
        }
      }
    },
    [postId]
  );

  const saveDraftInternal = useCallback(async (options?: { syncMode?: PostDraftSyncMode }) => {
    if (!postId) return;
    const syncMode = normalizePostDraftSyncMode(options?.syncMode);
    cancelAutosave();
    dispatch({ type: "set_saving", saving: true });
    setAutosaveError(null);
    setError(null);
    try {
      const updatedDraft = await updatePost(postId, {
        title,
        slug,
        data: buildPayloadData(),
      });
      const synchronizedPost = metadataDirty
        ? await updatePostMetadata(postId, buildMetadataPayload())
        : updatedDraft;
      if (syncMode === "hydrate") {
        applyLoadedPost(synchronizedPost);
      } else {
        applySavedPostSilently(synchronizedPost);
      }
    } catch (err) {
      dispatch({ type: "set_saving", saving: false });
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save post draft.");
      }
      throw err;
    }
  }, [
    applyLoadedPost,
    cancelAutosave,
    buildMetadataPayload,
    buildPayloadData,
    metadataDirty,
    postId,
    slug,
    title,
    applySavedPostSilently,
  ]);

  const saveDraft = useCallback(async () => {
    await saveDraftInternal({ syncMode: "silent" });
  }, [saveDraftInternal]);

  const publish = useCallback(async () => {
    if (!postId) return;
    setError(null);
    try {
      if (hasUnsavedChanges) {
        await saveDraft();
      }
      await publishPost(postId);
      await refresh({ force: true, allowDirty: true, setLoading: false });
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to publish post.");
      }
      throw err;
    }
  }, [hasUnsavedChanges, postId, refresh, saveDraft]);

  const unpublish = useCallback(async () => {
    if (!postId) return;
    setError(null);
    try {
      await unpublishPost(postId);
      await refresh({ force: true, allowDirty: true, setLoading: false });
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to move post to draft.");
      }
      throw err;
    }
  }, [postId, refresh]);

  const preview = useCallback(async () => {
    if (!postId) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setError(null);
    try {
      if (hasUnsavedChanges) {
        await saveDraftInternal({ syncMode: "silent" });
      }
      const result = await previewPost(postId, 30);
      setPreviewUrl(result.previewUrl);
    } catch (err) {
      if (isApiClientError(err)) {
        setPreviewError(err.message);
      } else {
        setPreviewError("Failed to generate post preview.");
      }
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [hasUnsavedChanges, postId, saveDraftInternal]);

  const selectedBlock = useMemo(() => {
    if (!state.selectedBlockId) return null;
    return state.document.blocks.find((block) => block.id === state.selectedBlockId) ?? null;
  }, [state.document.blocks, state.selectedBlockId]);

  const updateBlockContent = useCallback(
    (id: string, content: unknown) => {
      dispatch({
        type: "update_block",
        mutation: {
          id,
          mutate: (block) => ({ ...block, content }),
        },
      });
    },
    []
  );

  const updateSelectedBlockContent = useCallback(
    (content: unknown) => {
      if (!selectedBlock) return;
      updateBlockContent(selectedBlock.id, content);
    },
    [selectedBlock, updateBlockContent]
  );

  const updateBlockAttrs = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      dispatch({
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
    },
    []
  );

  const updateSelectedBlockAttrs = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedBlock) return;
      updateBlockAttrs(selectedBlock.id, patch);
    },
    [selectedBlock, updateBlockAttrs]
  );

  const updateDocumentTypography = useCallback(
    (typography: NonNullable<PostBlockDocumentMeta["typography"]>) => {
      dispatch({
        type: "update_meta",
        patch: {
          typography,
        },
      });
    },
    []
  );

  const setExcerpt = useCallback((value: string) => {
    dispatch({
      type: "update_meta",
      patch: {
        excerpt: value,
      },
    });
  }, []);

  const insertBlock = useCallback(
    (type: string, options?: PostInsertOptions) => {
      const safeType = createSafeBlockType(type);
      const mutation = resolvePostInsertMutation({
        blocks: state.document.blocks,
        selectedBlockId: state.selectedBlockId,
        options,
      });
      dispatch({
        type: "insert_block",
        mutation: {
          block: createPostBlock(safeType),
          ...mutation,
        },
      });
      if (options?.focus !== false) {
        setInsertFocusToken((value) => value + 1);
      }
    },
    [state.document.blocks, state.selectedBlockId]
  );

  const ensureDynamicTocBlock = useCallback(() => {
    dispatch({
      type: "ensure_toc_block",
      afterBlockId: null,
    });
  }, []);

  const deleteBlock = useCallback((id: string) => {
    dispatch({ type: "delete_block", id });
  }, []);

  const deleteSelectedBlock = useCallback(() => {
    if (!state.selectedBlockId) return;
    deleteBlock(state.selectedBlockId);
  }, [deleteBlock, state.selectedBlockId]);

  const moveBlock = useCallback(
    (id: string, direction: "up" | "down") => {
      dispatch({
        type: "move_block",
        mutation: { id, direction },
      });
    },
    []
  );

  const moveSelectedBlock = useCallback(
    (direction: "up" | "down") => {
      if (!state.selectedBlockId) return;
      moveBlock(state.selectedBlockId, direction);
    },
    [moveBlock, state.selectedBlockId]
  );

  const moveBlockToIndex = useCallback((id: string, targetIndex: number) => {
    dispatch({
      type: "move_block_to_index",
      mutation: { id, targetIndex },
    });
  }, []);

  const transformBlock = useCallback((id: string, targetType: PostBlockType) => {
    dispatch({
      type: "transform_block",
      mutation: { id, targetType },
    });
  }, []);

  const transformSelectedBlock = useCallback(
    (targetType: PostBlockType) => {
      if (!state.selectedBlockId) return;
      transformBlock(state.selectedBlockId, targetType);
    },
    [state.selectedBlockId, transformBlock]
  );

  const setTagsInput = useCallback((value: string) => {
    setMetadataDraft((prev) => ({ ...prev, tagsInput: value }));
  }, []);

  const setCategoryId = useCallback((value: string) => {
    setMetadataDraft((prev) => ({ ...prev, categoryId: value }));
  }, []);

  const setSeoDraft = useCallback(
    (patch: Partial<UsePostEditorStateResult["seoDraft"]>) => {
      setMetadataDraft((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          ...patch,
        },
      }));
    },
    []
  );

  const openRevisions = useCallback(() => {
    setRevisionsOpen(true);
    loadRevisions().catch(() => undefined);
  }, [loadRevisions]);

  const moveToTrash = useCallback(async () => {
    if (!postId || deletingPost) return false;
    setError(null);
    setAutosaveError(null);
    setDeletingPost(true);
    cancelAutosave();
    try {
      const result = await deletePost(postId);
      return result?.ok === true;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to move post to trash.");
      }
      return false;
    } finally {
      setDeletingPost(false);
    }
  }, [cancelAutosave, deletingPost, postId]);

  const handleSetRevisionsOpen = useCallback(
    (open: boolean) => {
      setRevisionsOpen(open);
      if (open) {
        loadRevisions().catch(() => undefined);
      }
    },
    [loadRevisions]
  );

  const restoreRevision = useCallback(
    async (revisionId: string) => {
      if (!postId) return;
      setError(null);
      setRevisionsError(null);
      setRestoringRevisionId(revisionId);
      try {
        cancelAutosave();
        const restored = await restorePostRevision(postId, revisionId);
        applyLoadedPost(restored.post);
        setRevisions((current) => upsertRevisionList(current, restored.revision));
        const restoredAt = new Date().toISOString();
        dispatch({ type: "mark_saved", at: restoredAt });
        setLastSavedAt(restoredAt);
        setRemoteUpdatePending(false);
      } catch (err) {
        if (isApiClientError(err)) {
          setRevisionsError(err.message);
        } else {
          setRevisionsError("Failed to restore revision.");
        }
        throw err;
      } finally {
        setRestoringRevisionId(null);
      }
    },
    [applyLoadedPost, cancelAutosave, postId]
  );

  const markReloadRemote = useCallback(async () => {
    await refresh({ force: true, allowDirty: true, setLoading: false });
    setRemoteUpdatePending(false);
  }, [refresh]);

  const handleUploadClipboardImage = useCallback(
    async (file: File) => {
      try {
        return await uploadClipboardImage(file);
      } catch (err) {
        if (isApiClientError(err)) {
          throw new Error(err.message);
        }
        throw err;
      }
    },
    []
  );

  return {
    postId,
    post,
    title,
    slug,
    status,
    hasUnsavedChanges,
    loading,
    error,
    autosaveError,
    autosaveSaving,
    lastSavedAt: lastSavedAt ?? state.lastSavedAt,
    remoteUpdatePending,
    setTitle,
    setSlug,
    featuredImage,
    setFeaturedImage,
    tagsInput: metadataDraft.tagsInput,
    setTagsInput,
    categoryId: metadataDraft.categoryId,
    setCategoryId,
    seoDraft: metadataDraft.seo,
    setSeoDraft,
    taxonomySummary,
    deletingPost,
    moveToTrash,
    saveDraft,
    publish,
    unpublish,
    preview,
    previewUrl,
    previewOpen,
    previewLoading,
    previewError,
    setPreviewOpen,
    revisionsOpen,
    setRevisionsOpen: handleSetRevisionsOpen,
    revisions,
    revisionsLoading,
    revisionsError,
    restoringRevisionId,
    openRevisions,
    restoreRevision,
    state,
    selectedBlock,
    insertFocusToken,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    selectBlock: (id) => dispatch({ type: "select_block", id }),
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
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    markReloadRemote,
    uploadClipboardImage: handleUploadClipboardImage,
  };
}
