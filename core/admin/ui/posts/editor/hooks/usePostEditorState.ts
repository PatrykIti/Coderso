import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  autosavePost,
  getCachedPostDetail,
  getPostCached,
  listPostRevisions,
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
import { POST_BLOCK_TYPES, type PostBlock, type PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
} from "../postEditorStore";
import { usePostAutosave } from "./usePostAutosave";

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
  const fallback: PostBlockType = "paragraph";
  if ((POST_BLOCK_TYPES as readonly string[]).includes(value)) {
    return value as PostBlockType;
  }
  return fallback;
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
  canUndo: boolean;
  canRedo: boolean;
  selectBlock: (id: string | null) => void;
  updateBlockContent: (id: string, content: unknown) => void;
  updateSelectedBlockContent: (content: unknown) => void;
  updateBlockAttrs: (id: string, patch: Record<string, unknown>) => void;
  updateSelectedBlockAttrs: (patch: Record<string, unknown>) => void;
  setExcerpt: (value: string) => void;
  insertBlock: (type: string) => void;
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
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);

  const [state, dispatch] = useReducer(
    postEditorReducer,
    createInitialPostEditorState(coercePostDocument(initialCachedPost?.data))
  );

  const baseDataRef = useRef<Record<string, unknown>>(getPostDataRecord(initialCachedPost));
  const baseMetadataSignatureRef = useRef<string>(
    serializeMetadataDraft(createMetadataDraftState(initialCachedPost))
  );
  const autosaveInFlightRef = useRef(false);

  const applyLoadedPost = useCallback((nextPost: PostDetail) => {
    setPost(nextPost);
    setTitle(nextPost.title);
    setSlug(nextPost.slug);
    setStatus(nextPost.status);
    setLastSavedAt(nextPost.updatedAt);
    baseDataRef.current = getPostDataRecord(nextPost);
    const nextFeaturedImage =
      isRecord(nextPost.data) && typeof nextPost.data.featuredImage === "string"
        ? nextPost.data.featuredImage
        : "";
    setFeaturedImage(nextFeaturedImage);
    const nextMetadataDraft = createMetadataDraftState(nextPost);
    setMetadataDraft(nextMetadataDraft);
    baseMetadataSignatureRef.current = serializeMetadataDraft(nextMetadataDraft);
    dispatch({
      type: "hydrate",
      document: coercePostDocument(nextPost.data),
    });
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
  const metadataDirty = metadataSignature !== baseMetadataSignatureRef.current;
  const hasUnsavedChanges =
    state.dirty || titleDirty || slugDirty || featuredImageDirty || metadataDirty;

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
        if (!options?.allowDirty && hasUnsavedChanges) {
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
    [applyLoadedPost, hasUnsavedChanges, postId]
  );

  useEffect(() => {
    refresh({ force: true, setLoading: !initialCachedPost }).catch(() => undefined);
  }, [initialCachedPost, refresh]);

  useEffect(() => {
    if (!postId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postDetail(postId)) return;
      refresh({ force: true, setLoading: false }).catch(() => undefined);
    });
  }, [postId, refresh]);

  const buildPayloadData = useCallback(() => {
    const current = { ...baseDataRef.current };
    current.document = state.document;
    const nextFeaturedImage = featuredImage.trim();
    if (nextFeaturedImage.length > 0) {
      current.featuredImage = nextFeaturedImage;
    } else {
      delete current.featuredImage;
    }
    return current;
  }, [featuredImage, state.document]);

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
      applyLoadedPost(result.post);
      dispatch({ type: "mark_saved", at: result.savedAt });
      setLastSavedAt(result.savedAt);
      setRemoteUpdatePending(false);
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
  }, [applyLoadedPost, buildAutosavePayload, hasUnsavedChanges, postId, state.saving]);

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
        const nextRevisions = await listPostRevisions(postId);
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

  const saveDraft = useCallback(async () => {
    if (!postId) return;
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
      applyLoadedPost(synchronizedPost);
      const savedAt = new Date().toISOString();
      dispatch({ type: "mark_saved", at: savedAt });
      setLastSavedAt(savedAt);
      setRemoteUpdatePending(false);
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
  ]);

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
        await saveDraft();
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
  }, [hasUnsavedChanges, postId, saveDraft]);

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

  const setExcerpt = useCallback((value: string) => {
    dispatch({
      type: "update_meta",
      patch: {
        excerpt: value,
      },
    });
  }, []);

  const insertBlock = useCallback(
    (type: string) => {
      const safeType = createSafeBlockType(type);
      dispatch({
        type: "insert_block",
        mutation: {
          block: createPostBlock(safeType),
          afterId: state.selectedBlockId,
        },
      });
    },
    [state.selectedBlockId]
  );

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
        const restoredAt = new Date().toISOString();
        dispatch({ type: "mark_saved", at: restoredAt });
        setLastSavedAt(restoredAt);
        setRemoteUpdatePending(false);
        await loadRevisions({ silent: true });
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
    [applyLoadedPost, cancelAutosave, loadRevisions, postId]
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
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    selectBlock: (id) => dispatch({ type: "select_block", id }),
    updateBlockContent,
    updateSelectedBlockContent,
    updateBlockAttrs,
    updateSelectedBlockAttrs,
    setExcerpt,
    insertBlock,
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
