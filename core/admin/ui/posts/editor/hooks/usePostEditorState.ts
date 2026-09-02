// TASK-105-08-08-L04 split facade: React wiring and the public result type
// only; the document/session/refresh/save-queue regions live in sibling
// modules. Behavior unchanged except the contract-scoped dead-path removals
// proven in coverage/task-105-08-08-l04/AUDIT-refresh-and-savequeue-invariants.md.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  deletePost,
  getCachedPostDetail,
  getCachedPostRevisions,
  publishPost,
  restorePostRevision,
  type PostDetail,
  type PostRevision,
  type PostStatus,
  unpublishPost,
} from "@/services/postsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { uploadClipboardImage } from "@/services/mediaClient";

import type {
  PostBlockDocumentMeta,
  PostBlockType,
} from "../../../../../services/posts/editor/postBlockDocument";
import {
  createInitialPostEditorState,
  postEditorReducer,
  type PostEditorAction,
} from "../postEditorStore";
import type { PostInsertOptions } from "../postInsertFlow";
import { usePostAutosave } from "./usePostAutosave";
import {
  buildDraftSnapshot,
  createMetadataDraftState,
  createPostDocumentActions,
  getPostDataRecord,
  isRecord,
  normalizeEditorDocumentForWritingFlow,
  readOptionalString,
  upsertRevisionList,
  type LivePostDraft,
  type MetadataDraftState,
} from "./postEditorStateDocument";
export {
  buildSilentSyncSnapshot,
  normalizeEditorDocumentForWritingFlow,
  normalizePostDraftSyncMode,
  shouldDeferRefreshForDirtyState,
} from "./postEditorStateDocument";
export type { PostDraftSyncMode } from "./postEditorStateDocument";
import {
  buildEditorSessionKey,
  createEditorIdentityChangedError,
  createEditorMachinery,
  resolvePostIdFromPath,
  type SaveTarget,
} from "./postEditorStateSession";
import {
  createRefreshLifecycle,
  type RefreshLifecycle,
  type RefreshLifecycleSetters,
} from "./postEditorStateRefresh";
import { createSaveQueue, type SaveQueue, type SaveQueueSetters } from "./postEditorStateSaveQueue";

export type { PostInsertOptions, PostInsertSource, PostInsertTarget } from "../postInsertFlow";

export type UsePostEditorStateResult = {
  postId: string | null;
  editorSessionKey: string;
  post: PostDetail | null;
  title: string;
  slug: string;
  status: PostStatus;
  hasUnsavedChanges: boolean;
  canMutatePost: boolean;
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
  flushLatestAutosave: () => Promise<void>;
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
  selectedBlock:
    ReturnType<typeof createInitialPostEditorState>["document"]["blocks"][number] | null;
  insertFocusToken: number;
  canUndo: boolean;
  canRedo: boolean;
  selectBlock: (id: string | null) => void;
  updateBlockContent: (id: string, content: unknown) => void;
  updateSelectedBlockContent: (content: unknown) => void;
  updateBlockAttrs: (id: string, patch: Record<string, unknown>) => void;
  updateSelectedBlockAttrs: (patch: Record<string, unknown>) => void;
  updateDocumentTypography: (typography: NonNullable<PostBlockDocumentMeta["typography"]>) => void;
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
  // Route epoch as render-visible state (L04-L01): each route identity change
  // advances the generation through the React-blessed adjust-state-during-render
  // pattern instead of a render-scope ref write; the machinery mirrors the
  // identity/epoch into its route boxes in a layout effect so every effect and
  // callback consumer still observes the same values at the same moments.
  const [routeEpochState, setRouteEpochState] = useState<{
    postId: string | null;
    generation: number;
  }>(() => ({ postId, generation: 0 }));
  if (routeEpochState.postId !== postId) {
    setRouteEpochState({ postId, generation: routeEpochState.generation + 1 });
  }
  const editorRouteEpoch = routeEpochState.generation;
  const restoreRequestGenerationRef = useRef(0);
  const initialCachedPost = useMemo(() => (postId ? getCachedPostDetail(postId) : null), [postId]);

  const [post, setPost] = useState<PostDetail | null>(() => initialCachedPost);
  const [title, setTitleState] = useState(() => initialCachedPost?.title ?? "");
  const [slug, setSlugState] = useState(() => initialCachedPost?.slug ?? "");
  const [status, setStatus] = useState<PostStatus>(() => initialCachedPost?.status ?? "draft");
  const [featuredImage, setFeaturedImageState] = useState(() => {
    if (!initialCachedPost || !isRecord(initialCachedPost.data)) return "";
    return readOptionalString(initialCachedPost.data.featuredImage);
  });
  const [metadataDraft, setMetadataDraftState] = useState<MetadataDraftState>(() =>
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
  const [editorStateIdentity, setEditorStateIdentity] = useState<string | null>(() => postId);
  const [editorStateEpoch, setEditorStateEpoch] = useState(() => editorRouteEpoch);

  const initialEditorState = useMemo(
    () =>
      createInitialPostEditorState(normalizeEditorDocumentForWritingFlow(initialCachedPost?.data)),
    [initialCachedPost]
  );
  const [state, setEditorState] = useState(initialEditorState);
  const dispatch = useCallback((action: PostEditorAction) => {
    setEditorState((current) => postEditorReducer(current, action));
  }, []);

  const [baseData, setBaseData] = useState<Record<string, unknown>>(() =>
    getPostDataRecord(initialCachedPost)
  );
  const initialLiveDraft = useMemo<LivePostDraft | null>(() => {
    if (!initialCachedPost || !postId) return null;
    return {
      editorIdentity: postId,
      title: initialCachedPost.title,
      slug: initialCachedPost.slug,
      featuredImage:
        isRecord(initialCachedPost.data) && typeof initialCachedPost.data.featuredImage === "string"
          ? initialCachedPost.data.featuredImage
          : "",
      metadataDraft: createMetadataDraftState(initialCachedPost),
      baseData: getPostDataRecord(initialCachedPost),
      editorState: initialEditorState,
    };
  }, [initialCachedPost, initialEditorState, postId]);
  const initialTarget = useMemo<SaveTarget | null>(() => {
    if (!initialLiveDraft) return null;
    return {
      editorIdentity: initialLiveDraft.editorIdentity,
      editorEpoch: editorRouteEpoch,
      revision: 0,
      snapshot: buildDraftSnapshot(initialLiveDraft),
    };
  }, [initialLiveDraft, editorRouteEpoch]);

  // Render-visible mirrors of the machinery's mutable boxes (L04-L01): the
  // installed live-draft identity and the dirty revision are read during
  // render, so they are React state kept in sync by the machinery at every
  // mutation site. The active session needs no mirror: it only ever holds the
  // last-committed route session, and the editorState identity/epoch pair
  // already gates every projection on the current one (a stale active session
  // can only coexist with a stale editorState pair, never override it).
  const [liveDraftIdentity, setLiveDraftIdentity] = useState<string | null>(
    () => initialLiveDraft?.editorIdentity ?? null
  );
  const [dirtyRevision, setDirtyRevision] = useState(0);

  // Shared mutable editor bookkeeping, created once per mount behind a module
  // factory so no ref is read, written, or passed to a function during render.
  const [machinery] = useState(() =>
    createEditorMachinery({
      postId,
      editorRouteEpoch,
      initialLiveDraft,
      initialTarget,
      dispatch,
      setLiveDraftIdentity,
      setDirtyRevision,
    })
  );

  useLayoutEffect(() => {
    machinery.syncRouteIdentity(postId, editorRouteEpoch);
  }, [editorRouteEpoch, machinery, postId]);

  const [persistedSignature, setPersistedSignature] = useState(
    initialTarget?.snapshot.signature ?? ""
  );

  useEffect(() => {
    machinery.setMounted(true);
    return () => {
      machinery.setMounted(false);
    };
  }, [machinery]);

  const requireCurrentEditableSession = useCallback(() => {
    if (!postId || !machinery.isCurrentEditableSession(postId, editorRouteEpoch)) {
      throw createEditorIdentityChangedError();
    }
    return { identity: postId, epoch: editorRouteEpoch } as const;
  }, [editorRouteEpoch, machinery, postId]);

  const setTitle = useCallback(
    (value: string) => {
      if (machinery.installLiveDraftMutation((current) => ({ ...current, title: value }))) {
        setTitleState(value);
      }
    },
    [machinery]
  );

  const setSlug = useCallback(
    (value: string) => {
      if (machinery.installLiveDraftMutation((current) => ({ ...current, slug: value }))) {
        setSlugState(value);
      }
    },
    [machinery]
  );

  const setFeaturedImage = useCallback(
    (value: string) => {
      if (machinery.installLiveDraftMutation((current) => ({ ...current, featuredImage: value }))) {
        setFeaturedImageState(value);
      }
    },
    [machinery]
  );

  // Queued persistence. Recreated when the route identity changes (mirroring
  // the former per-callback dependency arrays) so retained stale callbacks
  // fail closed exactly as before the split; queue state lives in shared refs.
  const saveQueue: SaveQueue = useMemo(
    () =>
      createSaveQueue({
        postId,
        editorRouteEpoch,
        dispatch,
        machinery,
        requireCurrentEditableSession,
        cancelAutosave: machinery.cancelAutosaveNow,
        flushScheduledAutosave: machinery.flushScheduledAutosaveNow,
        setPost,
        setTitleState,
        setSlugState,
        setStatus,
        setFeaturedImageState,
        setMetadataDraftState,
        setBaseData,
        setEditorState,
        setPersistedSignature,
        setLastSavedAt,
        setRemoteUpdatePending,
        setError,
        setAutosaveSaving,
        setAutosaveError,
      } satisfies SaveQueueSetters & Parameters<typeof createSaveQueue>[0]),
    [dispatch, editorRouteEpoch, machinery, postId, requireCurrentEditableSession]
  );

  // Refresh/reload lifecycle. Recreated when the route post id changes,
  // mirroring the former refresh() dependency array; postId is non-null for
  // every refresh caller (L04 audit).
  const refreshLifecycle: RefreshLifecycle = useMemo(
    () =>
      createRefreshLifecycle({
        postId: postId ?? "",
        dispatch,
        machinery,
        requireCurrentEditableSession,
        saveDraftInternal: saveQueue.saveDraftInternal,
        runAuthoritativeIdentityBarrier: saveQueue.runAuthoritativeIdentityBarrier,
        setLoading,
        setPost,
        setTitleState,
        setSlugState,
        setStatus,
        setFeaturedImageState,
        setMetadataDraftState,
        setBaseData,
        setEditorState,
        setEditorStateIdentity,
        setEditorStateEpoch,
        setPersistedSignature,
        setLastSavedAt,
        setRemoteUpdatePending,
        setError,
        setPreviewOpen,
        setPreviewUrl,
        setPreviewLoading,
        setPreviewError,
        setAutosaveSaving,
        setAutosaveError,
        setDeletingPost,
        setRevisionsOpen,
        setRevisions,
        setRevisionsLoading,
        setRevisionsError,
        setRestoringRevisionId,
        setInsertFocusToken,
      } satisfies RefreshLifecycleSetters & Parameters<typeof createRefreshLifecycle>[0]),
    [dispatch, machinery, postId, requireCurrentEditableSession, saveQueue]
  );

  // Route transition effect: resets the departed session's boxes and rejects
  // saves queued for it (reject handlers settle as microtasks after this
  // effect body, exactly as before the split).
  useEffect(() => {
    const transition = machinery.syncRouteSession(postId, editorRouteEpoch);
    if (!transition.changed) return;
    if (transition.previousIdentity) {
      saveQueue.rejectQueuedSession(transition.previousIdentity, transition.previousEpoch);
    }
  }, [editorRouteEpoch, machinery, postId, saveQueue]);

  // Initial mount/route hydration (the foreground loader).
  useEffect(() => refreshLifecycle.scheduleInitialHydration(postId), [refreshLifecycle, postId]);

  useEffect(() => {
    if (!postId) return;
    const expectedEpoch = machinery.routeGenerationRef.current;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postDetail(postId)) return;
      // Invariant (TASK-105-08-08-L02-L01): the route refs are synced by the
      // layout effect before this passive subscription's cleanup runs, local
      // cache-bus delivery is synchronous from cache writes that ride
      // per-task-drained network promise chains, and remote deliveries are
      // separate tasks that cannot interleave with that synchronous commit
      // window — so no event for the departed post can be observed here and
      // the former route-mismatch return was unreachable.
      const hasLocalPersistenceWork =
        machinery.inFlightSaveByIdentityRef.current.has(postId) ||
        [...machinery.queuedSaveByIdentityRevisionRef.current.values()].some(
          (record) => record.target.editorIdentity === postId
        ) ||
        [...machinery.authoritativeBarrierBySessionRef.current.values()].some(
          (barrier) => barrier.editorIdentity === postId
        ) ||
        machinery.hasRestorationDebt(postId, expectedEpoch);
      if (hasLocalPersistenceWork) return;
      refreshLifecycle.refresh({ force: true }).catch(() => undefined);
    });
  }, [machinery, postId, refreshLifecycle]);

  useEffect(() => {
    if (!postId) return;
    const expectedEpoch = machinery.routeGenerationRef.current;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.postRevisions(postId)) return;
      if (!machinery.isCurrentEditableSession(postId, expectedEpoch)) return;
      const cached = getCachedPostRevisions(postId);
      if (cached) {
        setRevisions(cached);
      }
    });
  }, [machinery, postId]);

  const routeStateCurrent = editorStateIdentity === postId && editorStateEpoch === editorRouteEpoch;
  const hasCurrentLiveDraft = routeStateCurrent && Boolean(postId) && liveDraftIdentity === postId;
  const renderedSignature = useMemo(() => {
    if (!postId || !routeStateCurrent) return "";
    return buildDraftSnapshot({
      editorIdentity: postId,
      title,
      slug,
      featuredImage,
      metadataDraft,
      baseData,
      editorState: state,
    }).signature;
  }, [baseData, featuredImage, metadataDraft, postId, routeStateCurrent, slug, state, title]);
  const hasUnsavedChanges = hasCurrentLiveDraft && renderedSignature !== persistedSignature;
  const editorSessionKey = buildEditorSessionKey(postId, editorRouteEpoch);
  const canMutatePost = postId ? !loading && Boolean(post) && hasCurrentLiveDraft : false;

  const taxonomySummary = useMemo(
    () => ({
      categoryName: post?.taxonomy?.category?.name ?? null,
      tagCount: post?.taxonomy?.tags?.length ?? 0,
    }),
    [post]
  );

  const autosaveSignature = `${postId ?? ""}:${editorRouteEpoch}:${dirtyRevision}:${renderedSignature}`;
  const { cancel: cancelAutosave, flush: flushScheduledAutosave } = usePostAutosave({
    enabled: hasCurrentLiveDraft && !loading && !remoteUpdatePending,
    dirty: hasUnsavedChanges,
    signature: autosaveSignature,
    onAutosave: saveQueue.runAutosave,
  });
  useLayoutEffect(() => {
    machinery.setAutosaveHandles(cancelAutosave, flushScheduledAutosave);
  }, [cancelAutosave, flushScheduledAutosave, machinery]);

  const saveDraft = useCallback(async () => {
    await saveQueue.saveDraftInternal({ syncMode: "silent" });
  }, [saveQueue]);

  const publish = useCallback(async () => {
    const { identity, epoch } = requireCurrentEditableSession();
    setError(null);
    try {
      await saveDraft();
      if (!machinery.isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      await publishPost(identity);
      if (!machinery.isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      await refreshLifecycle.refresh({ force: true, allowDirty: true });
      if (!machinery.isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
    } catch (err) {
      if (machinery.isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to publish post.");
        }
      }
      throw err;
    }
  }, [machinery, refreshLifecycle, requireCurrentEditableSession, saveDraft]);

  const unpublish = useCallback(async () => {
    const { identity, epoch } = requireCurrentEditableSession();
    setError(null);
    try {
      if (
        machinery.hasRestorationDebt(identity, epoch) ||
        machinery.hasPendingPotentialWrite(identity)
      ) {
        await saveDraft();
      }
      await unpublishPost(identity);
      if (!machinery.isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      await refreshLifecycle.refresh({ force: true, allowDirty: true });
      if (!machinery.isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
    } catch (err) {
      if (machinery.isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to move post to draft.");
        }
      }
      throw err;
    }
  }, [machinery, refreshLifecycle, requireCurrentEditableSession, saveDraft]);

  const selectedBlock = useMemo(() => {
    if (!state.selectedBlockId) return null;
    return state.document.blocks.find((block) => block.id === state.selectedBlockId) ?? null;
  }, [state.document.blocks, state.selectedBlockId]);

  const documentActions = useMemo(
    () =>
      createPostDocumentActions({
        dispatchEditorAction: machinery.dispatchEditorAction,
        installLiveDraftMutation: machinery.installLiveDraftMutation,
        blocks: state.document.blocks,
        selectedBlockId: state.selectedBlockId,
        setMetadataDraftState,
        setInsertFocusToken,
      }),
    [
      machinery,
      setInsertFocusToken,
      setMetadataDraftState,
      state.document.blocks,
      state.selectedBlockId,
    ]
  );

  const openRevisions = useCallback(() => {
    try {
      requireCurrentEditableSession();
    } catch {
      return;
    }
    setRevisionsOpen(true);
    refreshLifecycle.loadRevisions().catch(() => undefined);
  }, [refreshLifecycle, requireCurrentEditableSession]);

  const moveToTrash = useCallback(async () => {
    if (deletingPost) return false;
    let session: Readonly<{ identity: string; epoch: number }>;
    try {
      session = requireCurrentEditableSession();
    } catch {
      return false;
    }
    const { identity, epoch } = session;
    setError(null);
    setAutosaveError(null);
    setDeletingPost(true);
    cancelAutosave();
    try {
      const result = await deletePost(identity);
      if (!machinery.isCurrentEditableSession(identity, epoch)) return false;
      return result?.ok === true;
    } catch (err) {
      if (machinery.isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to move post to trash.");
        }
      }
      return false;
    } finally {
      if (machinery.isCurrentEditableSession(identity, epoch)) setDeletingPost(false);
    }
  }, [cancelAutosave, deletingPost, machinery, requireCurrentEditableSession]);

  const handleSetRevisionsOpen = useCallback(
    (open: boolean) => {
      if (open) {
        try {
          requireCurrentEditableSession();
        } catch {
          return;
        }
      }
      setRevisionsOpen(open);
      if (open) {
        refreshLifecycle.loadRevisions().catch(() => undefined);
      }
    },
    [refreshLifecycle, requireCurrentEditableSession]
  );

  const handleSetPreviewOpen = useCallback(
    (open: boolean) => {
      if (open) {
        try {
          requireCurrentEditableSession();
        } catch {
          return;
        }
      }
      setPreviewOpen(open);
    },
    [requireCurrentEditableSession]
  );

  const restoreRevision = useCallback(
    async (revisionId: string) => {
      const { identity: expectedIdentity, epoch: routeGeneration } =
        requireCurrentEditableSession();
      const isCurrentIdentity = () =>
        machinery.isCurrentEditableSession(expectedIdentity, routeGeneration);
      if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
      const requestGeneration = restoreRequestGenerationRef.current + 1;
      restoreRequestGenerationRef.current = requestGeneration;
      const isLatestRequest = () =>
        isCurrentIdentity() && restoreRequestGenerationRef.current === requestGeneration;
      setError(null);
      setRevisionsError(null);
      setRestoringRevisionId(revisionId);
      try {
        cancelAutosave();
        await saveQueue.runAuthoritativeIdentityBarrier(
          expectedIdentity,
          routeGeneration,
          "potential-write",
          async (
            reservedRevision,
            userMutationGenerationAtBarrierStart,
            markPotentialWriteStarted
          ) => {
            if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
            markPotentialWriteStarted();
            const restored = await restorePostRevision(expectedIdentity, revisionId);
            if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
            const restoredAt = new Date().toISOString();
            if (
              !refreshLifecycle.applyBarrierAuthoritativePost(
                restored.post,
                expectedIdentity,
                routeGeneration,
                reservedRevision,
                userMutationGenerationAtBarrierStart,
                restoredAt
              )
            ) {
              throw createEditorIdentityChangedError();
            }
            setRevisions((current) => upsertRevisionList(current, restored.revision));
          }
        );
      } catch (err) {
        if (isLatestRequest()) {
          if (isApiClientError(err)) {
            setRevisionsError(err.message);
          } else {
            setRevisionsError("Failed to restore revision.");
          }
        }
        throw err;
      } finally {
        if (isLatestRequest()) setRestoringRevisionId(null);
      }
    },
    [cancelAutosave, machinery, refreshLifecycle, requireCurrentEditableSession, saveQueue]
  );

  const handleUploadClipboardImage = useCallback(
    async (file: File) => {
      const { identity, epoch } = requireCurrentEditableSession();
      try {
        const result = await uploadClipboardImage(file);
        if (!machinery.isCurrentEditableSession(identity, epoch)) {
          throw createEditorIdentityChangedError();
        }
        return result;
      } catch (err) {
        if (isApiClientError(err)) {
          throw new Error(err.message);
        }
        throw err;
      }
    },
    [machinery, requireCurrentEditableSession]
  );

  const blankEditorState = useMemo(
    () => createInitialPostEditorState(normalizeEditorDocumentForWritingFlow(null)),
    []
  );
  const blankMetadataDraft = useMemo(() => createMetadataDraftState(null), []);
  const visibleEditorState = routeStateCurrent ? state : blankEditorState;

  return {
    postId,
    editorSessionKey,
    post: routeStateCurrent ? post : null,
    title: routeStateCurrent ? title : "",
    slug: routeStateCurrent ? slug : "",
    status: routeStateCurrent ? status : "draft",
    hasUnsavedChanges,
    canMutatePost,
    loading: !routeStateCurrent || loading,
    error: routeStateCurrent ? error : null,
    autosaveError: routeStateCurrent ? autosaveError : null,
    autosaveSaving: routeStateCurrent ? autosaveSaving : false,
    lastSavedAt: routeStateCurrent ? (lastSavedAt ?? visibleEditorState.lastSavedAt) : null,
    remoteUpdatePending: routeStateCurrent ? remoteUpdatePending : false,
    setTitle,
    setSlug,
    featuredImage: routeStateCurrent ? featuredImage : "",
    setFeaturedImage,
    tagsInput: routeStateCurrent ? metadataDraft.tagsInput : blankMetadataDraft.tagsInput,
    setTagsInput: documentActions.setTagsInput,
    categoryId: routeStateCurrent ? metadataDraft.categoryId : blankMetadataDraft.categoryId,
    setCategoryId: documentActions.setCategoryId,
    seoDraft: routeStateCurrent ? metadataDraft.seo : blankMetadataDraft.seo,
    setSeoDraft: documentActions.setSeoDraft,
    taxonomySummary: routeStateCurrent ? taxonomySummary : { categoryName: null, tagCount: 0 },
    deletingPost: routeStateCurrent ? deletingPost : false,
    moveToTrash,
    saveDraft,
    flushLatestAutosave: saveQueue.flushLatestAutosave,
    publish,
    unpublish,
    preview: refreshLifecycle.preview,
    previewUrl: routeStateCurrent ? previewUrl : null,
    previewOpen: routeStateCurrent ? previewOpen : false,
    previewLoading: routeStateCurrent ? previewLoading : false,
    previewError: routeStateCurrent ? previewError : null,
    setPreviewOpen: handleSetPreviewOpen,
    revisionsOpen: routeStateCurrent ? revisionsOpen : false,
    setRevisionsOpen: handleSetRevisionsOpen,
    revisions: routeStateCurrent ? revisions : [],
    revisionsLoading: routeStateCurrent ? revisionsLoading : false,
    revisionsError: routeStateCurrent ? revisionsError : null,
    restoringRevisionId: routeStateCurrent ? restoringRevisionId : null,
    openRevisions,
    restoreRevision,
    state: visibleEditorState,
    selectedBlock: routeStateCurrent ? selectedBlock : null,
    insertFocusToken: routeStateCurrent ? insertFocusToken : 0,
    canUndo: visibleEditorState.history.past.length > 0,
    canRedo: visibleEditorState.history.future.length > 0,
    selectBlock: (id) => machinery.dispatchEditorAction({ type: "select_block", id }),
    updateBlockContent: documentActions.updateBlockContent,
    updateSelectedBlockContent: documentActions.updateSelectedBlockContent,
    updateBlockAttrs: documentActions.updateBlockAttrs,
    updateSelectedBlockAttrs: documentActions.updateSelectedBlockAttrs,
    updateDocumentTypography: documentActions.updateDocumentTypography,
    setExcerpt: documentActions.setExcerpt,
    insertBlock: documentActions.insertBlock,
    ensureDynamicTocBlock: documentActions.ensureDynamicTocBlock,
    deleteBlock: documentActions.deleteBlock,
    deleteSelectedBlock: documentActions.deleteSelectedBlock,
    moveBlock: documentActions.moveBlock,
    moveSelectedBlock: documentActions.moveSelectedBlock,
    moveBlockToIndex: documentActions.moveBlockToIndex,
    transformBlock: documentActions.transformBlock,
    transformSelectedBlock: documentActions.transformSelectedBlock,
    undo: () => machinery.dispatchEditorAction({ type: "undo" }),
    redo: () => machinery.dispatchEditorAction({ type: "redo" }),
    markReloadRemote: refreshLifecycle.markReloadRemote,
    uploadClipboardImage: handleUploadClipboardImage,
  };
}
