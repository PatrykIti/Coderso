import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedPostDetail,
  getPostCached,
  previewPost,
  publishPost,
  type PostDetail,
  type PostStatus,
  unpublishPost,
  updatePost,
} from "@/services/postsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { coercePostDocument } from "../../../../../services/posts/editor/postBlockLegacyAdapter";
import { POST_BLOCK_TYPES, type PostBlock, type PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import {
  createInitialPostEditorState,
  createPostBlock,
  postEditorReducer,
} from "../postEditorStore";

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

export type UsePostEditorStateResult = {
  postId: string | null;
  post: PostDetail | null;
  title: string;
  slug: string;
  status: PostStatus;
  loading: boolean;
  error: string | null;
  remoteUpdatePending: boolean;
  setTitle: (value: string) => void;
  setSlug: (value: string) => void;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  preview: () => Promise<void>;
  previewUrl: string | null;
  previewOpen: boolean;
  previewLoading: boolean;
  previewError: string | null;
  setPreviewOpen: (open: boolean) => void;
  state: ReturnType<typeof createInitialPostEditorState>;
  selectedBlock: PostBlock | null;
  canUndo: boolean;
  canRedo: boolean;
  selectBlock: (id: string | null) => void;
  updateSelectedBlockContent: (content: unknown) => void;
  updateSelectedBlockAttrs: (patch: Record<string, unknown>) => void;
  setExcerpt: (value: string) => void;
  insertBlock: (type: string) => void;
  deleteSelectedBlock: () => void;
  moveSelectedBlock: (direction: "up" | "down") => void;
  undo: () => void;
  redo: () => void;
  markReloadRemote: () => Promise<void>;
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
  const [loading, setLoading] = useState(() => !initialCachedPost);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [state, dispatch] = useReducer(
    postEditorReducer,
    createInitialPostEditorState(coercePostDocument(initialCachedPost?.data))
  );

  const baseDataRef = useRef<Record<string, unknown>>(getPostDataRecord(initialCachedPost));

  const applyLoadedPost = useCallback((nextPost: PostDetail) => {
    setPost(nextPost);
    setTitle(nextPost.title);
    setSlug(nextPost.slug);
    setStatus(nextPost.status);
    baseDataRef.current = getPostDataRecord(nextPost);
    dispatch({
      type: "hydrate",
      document: coercePostDocument(nextPost.data),
    });
  }, []);

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
        if (!options?.allowDirty && state.dirty) {
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
    [applyLoadedPost, postId, state.dirty]
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
    return current;
  }, [state.document]);

  const saveDraft = useCallback(async () => {
    if (!postId) return;
    dispatch({ type: "set_saving", saving: true });
    setError(null);
    try {
      const updated = await updatePost(postId, {
        title,
        slug,
        data: buildPayloadData(),
      });
      applyLoadedPost(updated);
      dispatch({ type: "mark_saved", at: new Date().toISOString() });
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
  }, [applyLoadedPost, buildPayloadData, postId, slug, title]);

  const publish = useCallback(async () => {
    if (!postId) return;
    setError(null);
    try {
      if (state.dirty) {
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
  }, [postId, refresh, saveDraft, state.dirty]);

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
      if (state.dirty) {
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
  }, [postId, saveDraft, state.dirty]);

  const selectedBlock = useMemo(() => {
    if (!state.selectedBlockId) return null;
    return state.document.blocks.find((block) => block.id === state.selectedBlockId) ?? null;
  }, [state.document.blocks, state.selectedBlockId]);

  const updateSelectedBlockContent = useCallback(
    (content: unknown) => {
      if (!selectedBlock) return;
      dispatch({
        type: "update_block",
        mutation: {
          id: selectedBlock.id,
          mutate: (block) => ({ ...block, content }),
        },
      });
    },
    [selectedBlock]
  );

  const updateSelectedBlockAttrs = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedBlock) return;
      dispatch({
        type: "update_block",
        mutation: {
          id: selectedBlock.id,
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
    [selectedBlock]
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

  const deleteSelectedBlock = useCallback(() => {
    if (!state.selectedBlockId) return;
    dispatch({ type: "delete_block", id: state.selectedBlockId });
  }, [state.selectedBlockId]);

  const moveSelectedBlock = useCallback(
    (direction: "up" | "down") => {
      if (!state.selectedBlockId) return;
      dispatch({
        type: "move_block",
        mutation: { id: state.selectedBlockId, direction },
      });
    },
    [state.selectedBlockId]
  );

  const markReloadRemote = useCallback(async () => {
    await refresh({ force: true, allowDirty: true, setLoading: false });
    setRemoteUpdatePending(false);
  }, [refresh]);

  return {
    postId,
    post,
    title,
    slug,
    status,
    loading,
    error,
    remoteUpdatePending,
    setTitle,
    setSlug,
    saveDraft,
    publish,
    unpublish,
    preview,
    previewUrl,
    previewOpen,
    previewLoading,
    previewError,
    setPreviewOpen,
    state,
    selectedBlock,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    selectBlock: (id) => dispatch({ type: "select_block", id }),
    updateSelectedBlockContent,
    updateSelectedBlockAttrs,
    setExcerpt,
    insertBlock,
    deleteSelectedBlock,
    moveSelectedBlock,
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    markReloadRemote,
  };
}
