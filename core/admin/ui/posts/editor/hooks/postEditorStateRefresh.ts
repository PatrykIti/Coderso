// TASK-105-08-08-L04 split: the post editor refresh/reload lifecycle —
// authoritative document installation, load-failure commits, the refresh()
// request lifecycle, initial mount hydration, and the barrier-guarded remote
// reload. Extracted from usePostEditorState.ts (single writer:
// TASK-105-08-08-L04) with dependency injection; bodies are verbatim except
// the contract-specified dead-path removals:
//   - the impossible `!postId` guard (:1097-1101): every caller supplies a
//     real route identity (cache-event effect guard, requireCurrentEditableSession)
//   - the `setLoading` option (:1135-1137, :1179-1183): every caller passes
//     `setLoading: false`, so refresh performs no loading-state writes and no
//     caller gains a foreground request.
// See coverage/task-105-08-08-l04/AUDIT-refresh-and-savequeue-invariants.md.

import type { Dispatch, SetStateAction } from "react";

import { isApiClientError } from "@/services/apiClient";
import {
  getPostCached,
  listPostRevisionsCached,
  previewPost,
  type PostDetail,
  type PostRevision,
  type PostStatus,
} from "@/services/postsClient";

import {
  buildDraftSnapshot,
  createLiveDraftFromPost,
  createMetadataDraftState,
  normalizeEditorDocumentForWritingFlow,
  shouldDeferRefreshForDirtyState,
  type MetadataDraftState,
  type PostDraftSyncMode,
} from "./postEditorStateDocument";
import {
  buildEditorSessionKey,
  createEditorIdentityChangedError,
  type AuthoritativeBarrierMode,
  type EditorMachinery,
  type SaveTarget,
} from "./postEditorStateSession";
import {
  createInitialPostEditorState,
  type PostEditorAction,
  type PostEditorState,
} from "../postEditorStore";

export type RefreshLifecycleSetters = {
  setPost: Dispatch<SetStateAction<PostDetail | null>>;
  setTitleState: Dispatch<SetStateAction<string>>;
  setSlugState: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<PostStatus>>;
  setFeaturedImageState: Dispatch<SetStateAction<string>>;
  setMetadataDraftState: Dispatch<SetStateAction<MetadataDraftState>>;
  setBaseData: Dispatch<SetStateAction<Record<string, unknown>>>;
  setEditorState: Dispatch<SetStateAction<PostEditorState>>;
  setEditorStateIdentity: Dispatch<SetStateAction<string | null>>;
  setEditorStateEpoch: Dispatch<SetStateAction<number>>;
  setPersistedSignature: Dispatch<SetStateAction<string>>;
  setLastSavedAt: Dispatch<SetStateAction<string | null>>;
  setRemoteUpdatePending: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setPreviewOpen: Dispatch<SetStateAction<boolean>>;
  setPreviewUrl: Dispatch<SetStateAction<string | null>>;
  setPreviewLoading: Dispatch<SetStateAction<boolean>>;
  setPreviewError: Dispatch<SetStateAction<string | null>>;
  setAutosaveSaving: Dispatch<SetStateAction<boolean>>;
  setAutosaveError: Dispatch<SetStateAction<string | null>>;
  setDeletingPost: Dispatch<SetStateAction<boolean>>;
  setRevisionsOpen: Dispatch<SetStateAction<boolean>>;
  setRevisions: Dispatch<SetStateAction<PostRevision[]>>;
  setRevisionsLoading: Dispatch<SetStateAction<boolean>>;
  setRevisionsError: Dispatch<SetStateAction<string | null>>;
  setRestoringRevisionId: Dispatch<SetStateAction<string | null>>;
  setInsertFocusToken: Dispatch<SetStateAction<number>>;
};

export type RefreshLifecycleDeps = RefreshLifecycleSetters & {
  /** Route post id captured at lifecycle creation; callers guarantee non-null. */
  postId: string;
  dispatch: (action: PostEditorAction) => void;
  /** Shared mutable bookkeeping boxes and guard callbacks (L04-L01). */
  machinery: EditorMachinery;
  requireCurrentEditableSession: () => Readonly<{ identity: string; epoch: number }>;
  saveDraftInternal: (options?: { syncMode?: PostDraftSyncMode }) => Promise<void>;
  runAuthoritativeIdentityBarrier: <T>(
    identity: string,
    epoch: number,
    mode: AuthoritativeBarrierMode,
    operation: (
      reservedRevision: number,
      userMutationGenerationAtStart: number,
      markPotentialWriteStarted: () => void
    ) => Promise<T>
  ) => Promise<T>;
};

export type RefreshOptions = { force?: boolean; allowDirty?: boolean };

export const createRefreshLifecycle = (deps: RefreshLifecycleDeps) => {
  const {
    postId,
    dispatch,
    machinery,
    requireCurrentEditableSession,
    saveDraftInternal,
    runAuthoritativeIdentityBarrier,
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
  } = deps;
  const {
    isCurrentEditableSession,
    hasRestorationDebt,
    getPotentialWriteSettlementGeneration,
    acceptPersistedPotentialWriteWatermark,
    mountedRef,
    routePostIdRef,
    routeGenerationRef,
    activeEditorIdentityRef,
    activeEditorEpochRef,
    editorStateIdentityRef,
    editorStateEpochRef,
    hydrationRequestGenerationRef,
    liveDraftRef,
    liveSignatureRef,
    lastPersistedExactTargetRef,
    queuedSaveByIdentityRevisionRef,
    authoritativeBarrierBySessionRef,
    localSaveGenerationBySessionRef,
    dirtyRevisionRef,
    userMutationGenerationRef,
  } = machinery;

  const installAuthoritativePost = (
    nextPost: PostDetail,
    reason: "initial-load" | "accepted-hydration" | "identity-transition",
    savedAt = nextPost.updatedAt,
    expectedEpoch = routeGenerationRef.current,
    acceptedPotentialWriteGeneration = getPotentialWriteSettlementGeneration(nextPost.id)
  ) => {
    // Invariant (TASK-105-08-08-L02-L01): both callers (applyLoadedPost,
    // applyBarrierAuthoritativePost) pin the route and active pairs to
    // (nextPost.id, expectedEpoch) in their own synchronous guards, so the
    // former mismatch return was unreachable — and an identity-transition
    // install therefore always follows a route transition whose facade effect
    // already rejected the departed session's queued saves, making the former
    // departed-session sweep here unreachable too.
    const hasPendingSameIdentitySave = [...queuedSaveByIdentityRevisionRef.current.values()].some(
      (record) =>
        record.target.editorIdentity === nextPost.id && record.target.editorEpoch === expectedEpoch
    );
    if (reason !== "identity-transition" && hasPendingSameIdentitySave) {
      if (mountedRef.current) setRemoteUpdatePending(true);
      return false;
    }

    const nextLiveDraft = createLiveDraftFromPost(nextPost);
    const revision = reason === "identity-transition" ? 0 : dirtyRevisionRef.current;
    const target: SaveTarget = {
      editorIdentity: nextPost.id,
      editorEpoch: expectedEpoch,
      revision,
      snapshot: buildDraftSnapshot(nextLiveDraft),
    };

    activeEditorIdentityRef.current = nextPost.id;
    activeEditorEpochRef.current = expectedEpoch;
    editorStateIdentityRef.current = nextPost.id;
    editorStateEpochRef.current = expectedEpoch;
    machinery.setDirtyRevisionTo(revision);
    if (reason === "identity-transition") userMutationGenerationRef.current = 0;
    machinery.installLiveDraft(nextLiveDraft);
    liveSignatureRef.current = target.snapshot.signature;
    lastPersistedExactTargetRef.current = target;
    acceptPersistedPotentialWriteWatermark(
      nextPost.id,
      expectedEpoch,
      acceptedPotentialWriteGeneration
    );

    if (!mountedRef.current) return true;
    setEditorStateIdentity(nextPost.id);
    setEditorStateEpoch(expectedEpoch);
    setPost(nextPost);
    setTitleState(nextLiveDraft.title);
    setSlugState(nextLiveDraft.slug);
    setStatus(nextPost.status);
    setFeaturedImageState(nextLiveDraft.featuredImage);
    setMetadataDraftState(nextLiveDraft.metadataDraft);
    setBaseData(nextLiveDraft.baseData);
    dispatch({
      type: "hydrate",
      document: nextLiveDraft.editorState.document,
    });
    setLastSavedAt(savedAt);
    setPersistedSignature(target.snapshot.signature);
    setRemoteUpdatePending(false);
    if (reason === "identity-transition") {
      setError(null);
      setPreviewOpen(false);
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      setAutosaveSaving(false);
      setAutosaveError(null);
      setDeletingPost(false);
      setRevisionsOpen(false);
      setRevisions([]);
      setRevisionsLoading(false);
      setRevisionsError(null);
      setRestoringRevisionId(null);
      setInsertFocusToken(0);
    }
    return true;
  };

  const applyLoadedPost = (
    nextPost: PostDetail,
    expectedIdentity: string,
    expectedEpoch: number,
    acceptedPotentialWriteGeneration: number
  ) => {
    if (
      nextPost.id !== expectedIdentity ||
      routePostIdRef.current !== expectedIdentity ||
      routeGenerationRef.current !== expectedEpoch ||
      activeEditorIdentityRef.current !== expectedIdentity ||
      activeEditorEpochRef.current !== expectedEpoch
    ) {
      return false;
    }
    return installAuthoritativePost(
      nextPost,
      editorStateIdentityRef.current === expectedIdentity &&
        editorStateEpochRef.current === expectedEpoch
        ? "accepted-hydration"
        : "identity-transition",
      nextPost.updatedAt,
      expectedEpoch,
      acceptedPotentialWriteGeneration
    );
  };

  const commitIdentityLoadFailure = (
    expectedIdentity: string | null,
    expectedEpoch: number,
    message: string
  ) => {
    // Invariant (TASK-105-08-08-L02-L01): all five call sites run
    // isCurrentRequest() synchronously before calling (refresh's two,
    // scheduleInitialHydration's three), and that check is a superset of the
    // former guard (mounted + route + active pairs) — so its mismatch return
    // was unreachable.
    if (
      editorStateIdentityRef.current === expectedIdentity &&
      editorStateEpochRef.current === expectedEpoch
    ) {
      setError(message);
      return;
    }
    editorStateIdentityRef.current = expectedIdentity;
    editorStateEpochRef.current = expectedEpoch;
    setEditorStateIdentity(expectedIdentity);
    setEditorStateEpoch(expectedEpoch);
    setPost(null);
    setTitleState("");
    setSlugState("");
    setStatus("draft");
    setFeaturedImageState("");
    setMetadataDraftState(createMetadataDraftState(null));
    setBaseData({});
    setEditorState(createInitialPostEditorState(normalizeEditorDocumentForWritingFlow(null)));
    setPersistedSignature("");
    setLastSavedAt(null);
    setRemoteUpdatePending(false);
    setPreviewOpen(false);
    setPreviewUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setAutosaveSaving(false);
    setAutosaveError(null);
    setDeletingPost(false);
    setRevisionsOpen(false);
    setRevisions([]);
    setRevisionsLoading(false);
    setRevisionsError(null);
    setRestoringRevisionId(null);
    setInsertFocusToken(0);
    setError(message);
  };

  const applyBarrierAuthoritativePost = (
    nextPost: PostDetail,
    expectedIdentity: string,
    expectedEpoch: number,
    reservedRevision: number,
    userMutationGenerationAtBarrierStart: number,
    savedAt = nextPost.updatedAt,
    acceptedPotentialWriteGeneration = getPotentialWriteSettlementGeneration(expectedIdentity)
  ) => {
    if (
      !mountedRef.current ||
      nextPost.id !== expectedIdentity ||
      routePostIdRef.current !== expectedIdentity ||
      routeGenerationRef.current !== expectedEpoch ||
      activeEditorIdentityRef.current !== expectedIdentity ||
      activeEditorEpochRef.current !== expectedEpoch ||
      editorStateIdentityRef.current !== expectedIdentity ||
      editorStateEpochRef.current !== expectedEpoch
    ) {
      return false;
    }
    if (
      userMutationGenerationRef.current === userMutationGenerationAtBarrierStart &&
      installAuthoritativePost(
        nextPost,
        "accepted-hydration",
        savedAt,
        expectedEpoch,
        acceptedPotentialWriteGeneration
      )
    ) {
      return true;
    }

    const responseDraft = createLiveDraftFromPost(nextPost);
    const persistedTarget: SaveTarget = {
      editorIdentity: expectedIdentity,
      editorEpoch: expectedEpoch,
      revision: reservedRevision,
      snapshot: buildDraftSnapshot(responseDraft),
    };
    lastPersistedExactTargetRef.current = persistedTarget;
    acceptPersistedPotentialWriteWatermark(
      expectedIdentity,
      expectedEpoch,
      acceptedPotentialWriteGeneration
    );
    setPost(nextPost);
    setStatus(nextPost.status);
    setPersistedSignature(persistedTarget.snapshot.signature);
    setLastSavedAt(savedAt);
    setRemoteUpdatePending(false);
    setAutosaveError(null);
    return true;
  };

  const hasSynchronousUnsavedDraft = (identity: string, epoch: number) => {
    const liveDraft = liveDraftRef.current;
    const persisted = lastPersistedExactTargetRef.current;
    return (
      liveDraft?.editorIdentity === identity &&
      (!persisted ||
        persisted.editorIdentity !== identity ||
        persisted.editorEpoch !== epoch ||
        liveSignatureRef.current !== persisted.snapshot.signature ||
        hasRestorationDebt(identity, epoch))
    );
  };

  const refresh = async (options?: RefreshOptions) => {
    // Callers guarantee a real route identity (TASK-105-08-08-L04 audit); the
    // former `!postId` fail-open branch was structurally unreachable and is
    // removed by contract. The `setLoading` option is gone with it: every
    // caller passes a background policy, so refresh never touches loading.
    const expectedIdentity = postId;
    const routeGeneration = routeGenerationRef.current;
    const sessionKey = buildEditorSessionKey(expectedIdentity, routeGeneration);
    const potentialWriteGenerationAtRequestStart =
      getPotentialWriteSettlementGeneration(expectedIdentity);
    const requestGeneration = hydrationRequestGenerationRef.current + 1;
    hydrationRequestGenerationRef.current = requestGeneration;
    const saveGeneration = localSaveGenerationBySessionRef.current.get(sessionKey) ?? 0;
    const startedAcrossLocalSave = [...queuedSaveByIdentityRevisionRef.current.values()].some(
      (record) =>
        record.target.editorIdentity === expectedIdentity &&
        record.target.editorEpoch === routeGeneration
    );
    const startedAcrossAuthoritativeBarrier =
      authoritativeBarrierBySessionRef.current.has(sessionKey);
    const startedAcrossLocalMutation = startedAcrossLocalSave || startedAcrossAuthoritativeBarrier;
    const isStaleAcrossLocalMutation = () =>
      startedAcrossLocalMutation ||
      (localSaveGenerationBySessionRef.current.get(sessionKey) ?? 0) !== saveGeneration ||
      [...queuedSaveByIdentityRevisionRef.current.values()].some(
        (record) =>
          record.target.editorIdentity === expectedIdentity &&
          record.target.editorEpoch === routeGeneration
      ) ||
      authoritativeBarrierBySessionRef.current.has(sessionKey);
    const isCurrentRequest = () =>
      mountedRef.current &&
      routePostIdRef.current === expectedIdentity &&
      routeGenerationRef.current === routeGeneration &&
      activeEditorIdentityRef.current === expectedIdentity &&
      activeEditorEpochRef.current === routeGeneration &&
      hydrationRequestGenerationRef.current === requestGeneration;
    if (!startedAcrossLocalMutation) setError(null);
    try {
      const nextPost = await getPostCached(expectedIdentity, {
        force: options?.force ?? true,
      });
      if (!isCurrentRequest()) return;
      if (isStaleAcrossLocalMutation()) return;
      if (!nextPost) {
        commitIdentityLoadFailure(expectedIdentity, routeGeneration, "Post not found.");
        return;
      }
      const hasDirtyActiveDraft =
        liveDraftRef.current?.editorIdentity === expectedIdentity &&
        (hasSynchronousUnsavedDraft(expectedIdentity, routeGeneration) ||
          [...queuedSaveByIdentityRevisionRef.current.values()].some(
            (record) =>
              record.target.editorIdentity === expectedIdentity &&
              record.target.editorEpoch === routeGeneration
          ));
      if (shouldDeferRefreshForDirtyState(options, hasDirtyActiveDraft)) {
        setRemoteUpdatePending(true);
        return;
      }
      if (
        applyLoadedPost(
          nextPost,
          expectedIdentity,
          routeGeneration,
          potentialWriteGenerationAtRequestStart
        )
      ) {
        setRemoteUpdatePending(false);
      }
    } catch (err) {
      if (!isCurrentRequest()) return;
      if (isStaleAcrossLocalMutation()) return;
      commitIdentityLoadFailure(
        expectedIdentity,
        routeGeneration,
        isApiClientError(err) ? err.message : "Failed to load post editor."
      );
    }
  };

  /**
   * Initial mount/route hydration (the foreground loader). Returns the effect
   * cleanup. Body verbatim from the former hydration effect; unlike refresh()
   * this path legitimately starts with a null route identity (off-canvas
   * mount), so its null branch stays.
   */
  const scheduleInitialHydration = (expectedIdentity: string | null) => {
    let active = true;
    const routeGeneration = routeGenerationRef.current;
    const sessionKey = expectedIdentity
      ? buildEditorSessionKey(expectedIdentity, routeGeneration)
      : null;
    const potentialWriteGenerationAtRequestStart = expectedIdentity
      ? getPotentialWriteSettlementGeneration(expectedIdentity)
      : 0;
    const requestGeneration = hydrationRequestGenerationRef.current + 1;
    hydrationRequestGenerationRef.current = requestGeneration;
    const saveGeneration = expectedIdentity
      ? (localSaveGenerationBySessionRef.current.get(sessionKey as string) ?? 0)
      : 0;
    const startedAcrossLocalSave = expectedIdentity
      ? [...queuedSaveByIdentityRevisionRef.current.values()].some(
          (record) =>
            record.target.editorIdentity === expectedIdentity &&
            record.target.editorEpoch === routeGeneration
        )
      : false;
    const startedAcrossAuthoritativeBarrier = expectedIdentity
      ? authoritativeBarrierBySessionRef.current.has(sessionKey as string)
      : false;
    const startedAcrossLocalMutation = startedAcrossLocalSave || startedAcrossAuthoritativeBarrier;
    const isStaleAcrossLocalMutation = () => {
      if (!expectedIdentity) return false;
      return (
        startedAcrossLocalMutation ||
        (localSaveGenerationBySessionRef.current.get(sessionKey as string) ?? 0) !==
          saveGeneration ||
        [...queuedSaveByIdentityRevisionRef.current.values()].some(
          (record) =>
            record.target.editorIdentity === expectedIdentity &&
            record.target.editorEpoch === routeGeneration
        ) ||
        authoritativeBarrierBySessionRef.current.has(sessionKey as string)
      );
    };
    const isCurrentRequest = () =>
      active &&
      mountedRef.current &&
      routePostIdRef.current === expectedIdentity &&
      routeGenerationRef.current === routeGeneration &&
      activeEditorIdentityRef.current === expectedIdentity &&
      activeEditorEpochRef.current === routeGeneration &&
      hydrationRequestGenerationRef.current === requestGeneration;
    void Promise.resolve()
      .then(async () => {
        if (!expectedIdentity) {
          if (!isCurrentRequest()) return;
          deps.setLoading(false);
          commitIdentityLoadFailure(null, routeGeneration, "Post ID is missing.");
          return;
        }
        const nextPost = await getPostCached(expectedIdentity, { force: true });
        if (!isCurrentRequest()) return;
        if (isStaleAcrossLocalMutation()) return;
        if (!nextPost) {
          commitIdentityLoadFailure(expectedIdentity, routeGeneration, "Post not found.");
          return;
        }
        const hasDirtyActiveDraft =
          liveDraftRef.current?.editorIdentity === expectedIdentity &&
          (hasSynchronousUnsavedDraft(expectedIdentity, routeGeneration) ||
            [...queuedSaveByIdentityRevisionRef.current.values()].some(
              (record) =>
                record.target.editorIdentity === expectedIdentity &&
                record.target.editorEpoch === routeGeneration
            ));
        if (shouldDeferRefreshForDirtyState(undefined, hasDirtyActiveDraft)) {
          setRemoteUpdatePending(true);
          return;
        }
        if (
          applyLoadedPost(
            nextPost,
            expectedIdentity,
            routeGeneration,
            potentialWriteGenerationAtRequestStart
          )
        ) {
          setRemoteUpdatePending(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCurrentRequest()) return;
        if (isStaleAcrossLocalMutation()) return;
        commitIdentityLoadFailure(
          expectedIdentity,
          routeGeneration,
          isApiClientError(err) ? err.message : "Failed to load post editor."
        );
      })
      .finally(() => {
        if (isCurrentRequest()) deps.setLoading(false);
      });
    return () => {
      active = false;
    };
  };

  const markReloadRemote = async () => {
    const { identity: expectedIdentity, epoch: routeGeneration } = requireCurrentEditableSession();
    const isCurrentIdentity = () => isCurrentEditableSession(expectedIdentity, routeGeneration);
    if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
    const requestGeneration = hydrationRequestGenerationRef.current + 1;
    hydrationRequestGenerationRef.current = requestGeneration;
    const isLatestRequest = () =>
      isCurrentIdentity() && hydrationRequestGenerationRef.current === requestGeneration;
    setError(null);
    if (hasRestorationDebt(expectedIdentity, routeGeneration)) {
      setRemoteUpdatePending(true);
      return;
    }
    try {
      await runAuthoritativeIdentityBarrier(
        expectedIdentity,
        routeGeneration,
        "read-only",
        async (reservedRevision, userMutationGenerationAtBarrierStart) => {
          if (!isCurrentIdentity()) throw createEditorIdentityChangedError();
          if (hasRestorationDebt(expectedIdentity, routeGeneration)) {
            setRemoteUpdatePending(true);
            return;
          }
          const acceptedPotentialWriteGeneration =
            getPotentialWriteSettlementGeneration(expectedIdentity);
          const nextPost = await getPostCached(expectedIdentity, { force: true });
          if (!isCurrentIdentity()) {
            const currentEpoch = activeEditorEpochRef.current;
            if (
              currentEpoch !== routeGeneration &&
              isCurrentEditableSession(expectedIdentity, currentEpoch)
            ) {
              await getPostCached(expectedIdentity, { force: true }).catch(() => undefined);
            }
            throw createEditorIdentityChangedError();
          }
          // Invariant (TASK-105-08-08-L02-L01): the barrier awaits every
          // predecessor (queued and in-flight alike — dispatched records stay
          // in the keyed map until their settling finally) and every
          // cross-session barrier before this operation, and post-cutoff
          // admissions wait for this barrier's outcome before dispatching, so
          // no settlement can move the restoration debt between the check
          // above and the post-get check below — the former second
          // setRemoteUpdatePending return was unreachable.
          if (!nextPost) {
            if (isLatestRequest()) setError("Post not found.");
            return;
          }
          if (
            !applyBarrierAuthoritativePost(
              nextPost,
              expectedIdentity,
              routeGeneration,
              reservedRevision,
              userMutationGenerationAtBarrierStart,
              nextPost.updatedAt,
              acceptedPotentialWriteGeneration
            )
          ) {
            throw createEditorIdentityChangedError();
          }
        }
      );
    } catch (error) {
      if (isLatestRequest()) {
        setError(isApiClientError(error) ? error.message : "Failed to load post editor.");
      }
      throw error;
    }
  };

  const loadRevisions = async (options?: { silent?: boolean }) => {
    const { identity, epoch } = requireCurrentEditableSession();
    if (!options?.silent) {
      setRevisionsLoading(true);
    }
    setRevisionsError(null);
    try {
      const nextRevisions = await listPostRevisionsCached(identity, {
        force: false,
      });
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      setRevisions(nextRevisions);
    } catch (err) {
      if (isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setRevisionsError(err.message);
        } else {
          setRevisionsError("Failed to load post revisions.");
        }
      }
      throw err;
    } finally {
      if (!options?.silent && isCurrentEditableSession(identity, epoch)) {
        setRevisionsLoading(false);
      }
    }
  };

  const preview = async () => {
    const { identity, epoch } = requireCurrentEditableSession();
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setError(null);
    try {
      await saveDraftInternal({ syncMode: "silent" });
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      const result = await previewPost(identity, 30);
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
      setPreviewUrl(result.previewUrl);
    } catch (err) {
      if (isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setPreviewError(err.message);
        } else {
          setPreviewError("Failed to generate post preview.");
        }
        setPreviewUrl(null);
      }
    } finally {
      if (isCurrentEditableSession(identity, epoch)) setPreviewLoading(false);
    }
  };

  return {
    installAuthoritativePost,
    applyLoadedPost,
    commitIdentityLoadFailure,
    applyBarrierAuthoritativePost,
    hasSynchronousUnsavedDraft,
    refresh,
    scheduleInitialHydration,
    markReloadRemote,
    loadRevisions,
    preview,
  };
};

export type RefreshLifecycle = ReturnType<typeof createRefreshLifecycle>;
