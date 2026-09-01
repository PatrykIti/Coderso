// TASK-105-08-08-L04 split: the post editor queued-persistence region —
// exact-revision save queue admission/drain, the authoritative identity
// barrier, target capture, autosave/manual/close save flows. Extracted from
// usePostEditorState.ts (single writer: TASK-105-08-08-L04) with dependency
// injection; bodies are verbatim except the contract-specified dead-path
// removal:
//   - the same-key conflicting-byte rejection (:1704-1706): the audit proved
//     revision and signature advance together at every writer, so an existing
//     queued record with the same (identity, epoch, revision) key always has
//     the same snapshot and admission coalesces unconditionally.
// See coverage/task-105-08-08-l04/AUDIT-refresh-and-savequeue-invariants.md.

import type { Dispatch, SetStateAction } from "react";

import { isApiClientError } from "@/services/apiClient";
import {
  autosavePost,
  updatePost,
  updatePostMetadata,
  type PostDetail,
  type PostStatus,
} from "@/services/postsClient";

import {
  buildDraftSnapshot,
  createLiveDraftFromPost,
  deepFreezeJsonContract,
  normalizePostDraftSyncMode,
  sameSnapshot,
  type LivePostDraft,
  type MetadataDraftState,
  type PostDraftSyncMode,
} from "./postEditorStateDocument";
import {
  buildEditorSessionKey,
  buildSaveTargetKey,
  createEditorIdentityChangedError,
  isSameEditorSession,
  isUnresolvedPredecessorForTarget,
  resolveCloseSaveErrorCopy,
  type AuthoritativeBarrierMode,
  type AuthoritativeBarrierState,
  type EditorMachinery,
  type PersistedSaveResult,
  type QueuedRevisionSave,
  type SaveMode,
  type SavePersistenceKind,
  type SaveTarget,
} from "./postEditorStateSession";
import {
  createInitialPostEditorState,
  type PostEditorAction,
  type PostEditorState,
} from "../postEditorStore";

export type SaveQueueSetters = {
  setPost: Dispatch<SetStateAction<PostDetail | null>>;
  setTitleState: Dispatch<SetStateAction<string>>;
  setSlugState: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<PostStatus>>;
  setFeaturedImageState: Dispatch<SetStateAction<string>>;
  setMetadataDraftState: Dispatch<SetStateAction<MetadataDraftState>>;
  setBaseData: Dispatch<SetStateAction<Record<string, unknown>>>;
  setEditorState: Dispatch<SetStateAction<PostEditorState>>;
  setPersistedSignature: Dispatch<SetStateAction<string>>;
  setLastSavedAt: Dispatch<SetStateAction<string | null>>;
  setRemoteUpdatePending: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setAutosaveSaving: Dispatch<SetStateAction<boolean>>;
  setAutosaveError: Dispatch<SetStateAction<string | null>>;
};

export type SaveQueueDeps = SaveQueueSetters & {
  /**
   * Route identity captured at queue creation. The facade recreates the queue
   * when the route post id changes (mirroring the former useCallback
   * dependency arrays), so retained stale callbacks fail closed exactly as
   * before the split; all mutable queue state lives in the shared machinery.
   */
  postId: string | null;
  editorRouteEpoch: number;
  dispatch: (action: PostEditorAction) => void;
  requireCurrentEditableSession: () => Readonly<{ identity: string; epoch: number }>;
  /** Shared mutable bookkeeping boxes and guard callbacks (L04-L01). */
  machinery: EditorMachinery;
  /** Latest autosave scheduler handles (read at call time, mirroring the boxes). */
  cancelAutosave: () => void;
  flushScheduledAutosave: () => Promise<void>;
};

export const createSaveQueue = (deps: SaveQueueDeps) => {
  const {
    postId,
    editorRouteEpoch,
    dispatch,
    requireCurrentEditableSession,
    machinery,
    cancelAutosave,
    flushScheduledAutosave,
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
  } = deps;
  const {
    dispatchEditorAction,
    isCurrentEditableSession,
    hasRestorationDebt,
    hasPendingPotentialWrite,
    advanceLocalMutationGeneration,
    recordPotentialWriteSettlement,
    acceptPersistedPotentialWriteWatermark,
    bumpDirtyRevision,
    mountedRef,
    routePostIdRef,
    routeGenerationRef,
    activeEditorIdentityRef,
    activeEditorEpochRef,
    editorStateIdentityRef,
    editorStateEpochRef,
    liveDraftRef,
    liveSignatureRef,
    dirtyRevisionRef,
    userMutationGenerationRef,
    lastPersistedExactTargetRef,
    queuedSaveByIdentityRevisionRef,
    orderedSaveQueueRef,
    inFlightSaveByIdentityRef,
    drainPromiseByIdentityRef,
    drainQueueRef,
    authoritativeBarrierBySessionRef,
    saveAdmissionSequenceRef,
  } = machinery;

  const rejectQueuedSession = (identity: string, epoch: number) => {
    const error = createEditorIdentityChangedError();
    const remaining: QueuedRevisionSave[] = [];
    for (const record of orderedSaveQueueRef.current) {
      if (
        record.target.editorIdentity !== identity ||
        record.target.editorEpoch !== epoch ||
        record.dispatched
      ) {
        remaining.push(record);
        continue;
      }
      queuedSaveByIdentityRevisionRef.current.delete(buildSaveTargetKey(record.target));
      record.reject(error);
    }
    orderedSaveQueueRef.current = remaining;
  };

  const captureCurrentTarget = (): SaveTarget => {
    const identity = activeEditorIdentityRef.current;
    const epoch = activeEditorEpochRef.current;
    const liveDraft = liveDraftRef.current;
    if (
      !identity ||
      !isCurrentEditableSession(identity, epoch) ||
      routePostIdRef.current !== identity ||
      !liveDraft ||
      liveDraft.editorIdentity !== identity
    ) {
      throw createEditorIdentityChangedError();
    }
    const snapshot = buildDraftSnapshot(liveDraft);
    if (snapshot.signature !== liveSignatureRef.current) {
      liveSignatureRef.current = snapshot.signature;
      bumpDirtyRevision();
      userMutationGenerationRef.current += 1;
    }
    return deepFreezeJsonContract({
      editorIdentity: identity,
      editorEpoch: epoch,
      revision: dirtyRevisionRef.current,
      snapshot,
    });
  };

  const captureCurrentTargetAfterAuthoritativeBarrier = async (
    identity: string,
    epoch: number
  ): Promise<SaveTarget> => {
    const sessionKey = buildEditorSessionKey(identity, epoch);
    for (;;) {
      const barrier = authoritativeBarrierBySessionRef.current.get(sessionKey);
      if (!barrier) return captureCurrentTarget();
      await barrier.outcome;
      if (!isCurrentEditableSession(identity, epoch)) {
        throw createEditorIdentityChangedError();
      }
    }
  };

  const applyPersistedResponse = (record: QueuedRevisionSave, response: PersistedSaveResult) => {
    const { editorIdentity, editorEpoch, revision } = record.target;
    if (!isCurrentEditableSession(editorIdentity, editorEpoch)) {
      return;
    }
    const authoritativeTarget = lastPersistedExactTargetRef.current;
    if (
      authoritativeTarget &&
      isSameEditorSession(authoritativeTarget, record.target) &&
      authoritativeTarget.revision > revision
    ) {
      return;
    }

    const responseLiveDraft = createLiveDraftFromPost(response.post);
    responseLiveDraft.editorIdentity = editorIdentity;
    const persistedTarget: SaveTarget = {
      editorIdentity,
      editorEpoch,
      revision,
      snapshot: buildDraftSnapshot(responseLiveDraft),
    };
    const isCurrentRevision =
      dirtyRevisionRef.current === revision &&
      liveDraftRef.current?.editorIdentity === editorIdentity &&
      liveSignatureRef.current === record.target.snapshot.signature;

    lastPersistedExactTargetRef.current = persistedTarget;
    if (!mountedRef.current) return;
    setPost(response.post);
    setStatus(response.post.status);
    setPersistedSignature(persistedTarget.snapshot.signature);
    setLastSavedAt(response.savedAt);
    setRemoteUpdatePending(false);
    setAutosaveError(null);

    if (!isCurrentRevision) {
      const currentLiveDraft = liveDraftRef.current;
      if (currentLiveDraft?.editorIdentity === editorIdentity) {
        const rebasedLiveDraft: LivePostDraft = {
          ...currentLiveDraft,
          baseData: responseLiveDraft.baseData,
        };
        const rebasedSignature = buildDraftSnapshot(rebasedLiveDraft).signature;
        if (rebasedSignature !== liveSignatureRef.current) {
          bumpDirtyRevision();
        }
        liveDraftRef.current = rebasedLiveDraft;
        liveSignatureRef.current = rebasedSignature;
        setBaseData(responseLiveDraft.baseData);
      }
      return;
    }

    if (record.syncMode === "silent") {
      const currentLiveDraft = liveDraftRef.current;
      if (!currentLiveDraft || currentLiveDraft.editorIdentity !== editorIdentity) return;
      const responseDocument = responseLiveDraft.editorState.document;
      const retainedSelection = responseDocument.blocks.some(
        (block) => block.id === currentLiveDraft.editorState.selectedBlockId
      )
        ? currentLiveDraft.editorState.selectedBlockId
        : (responseDocument.blocks[0]?.id ?? null);
      const synchronizedEditorState: PostEditorState = {
        ...currentLiveDraft.editorState,
        document: responseDocument,
        selectedBlockId: retainedSelection,
        dirty: false,
        saving: false,
        lastSavedAt: response.savedAt,
      };
      const silentlySynchronizedDraft: LivePostDraft = {
        ...responseLiveDraft,
        editorState: synchronizedEditorState,
      };
      const synchronizedSnapshot = buildDraftSnapshot(silentlySynchronizedDraft);
      liveDraftRef.current = silentlySynchronizedDraft;
      liveSignatureRef.current = synchronizedSnapshot.signature;
      setEditorState(synchronizedEditorState);
      setTitleState(silentlySynchronizedDraft.title);
      setSlugState(silentlySynchronizedDraft.slug);
      setFeaturedImageState(silentlySynchronizedDraft.featuredImage);
      setMetadataDraftState(silentlySynchronizedDraft.metadataDraft);
      setBaseData(silentlySynchronizedDraft.baseData);
      return;
    }

    const currentSelection = liveDraftRef.current?.editorState.selectedBlockId ?? null;
    responseLiveDraft.editorState = createInitialPostEditorState(
      responseLiveDraft.editorState.document,
      currentSelection
    );
    liveDraftRef.current = responseLiveDraft;
    liveSignatureRef.current = persistedTarget.snapshot.signature;
    setTitleState(responseLiveDraft.title);
    setSlugState(responseLiveDraft.slug);
    setFeaturedImageState(responseLiveDraft.featuredImage);
    setMetadataDraftState(responseLiveDraft.metadataDraft);
    setBaseData(responseLiveDraft.baseData);
    dispatch({
      type: "hydrate",
      document: responseLiveDraft.editorState.document,
      selectedBlockId: currentSelection,
    });
  };

  const drainExactRevisionQueue = async (identity: string): Promise<void> => {
    const activeDrain = drainPromiseByIdentityRef.current.get(identity);
    if (activeDrain) return activeDrain;
    const drainPromise = (async () => {
      for (;;) {
        const nextRecord = orderedSaveQueueRef.current.find(
          (record) => record.target.editorIdentity === identity
        );
        if (!nextRecord) break;
        const sessionKey = buildEditorSessionKey(
          nextRecord.target.editorIdentity,
          nextRecord.target.editorEpoch
        );
        if (nextRecord.predecessorBarrierOutcome) {
          try {
            await nextRecord.predecessorBarrierOutcome;
            nextRecord.predecessorBarrierOutcome = null;
          } catch (error) {
            const queuedIndex = orderedSaveQueueRef.current.indexOf(nextRecord);
            if (queuedIndex !== -1) {
              orderedSaveQueueRef.current.splice(queuedIndex, 1);
            }
            const key = buildSaveTargetKey(nextRecord.target);
            if (queuedSaveByIdentityRevisionRef.current.get(key) === nextRecord) {
              queuedSaveByIdentityRevisionRef.current.delete(key);
            }
            nextRecord.reject(error);
            continue;
          }
          if (!orderedSaveQueueRef.current.includes(nextRecord)) continue;
        }
        const crossSessionBarriers = [...authoritativeBarrierBySessionRef.current.values()].filter(
          (barrier) =>
            barrier.editorIdentity === identity &&
            barrier.editorEpoch !== nextRecord.target.editorEpoch &&
            nextRecord.admissionOrder > barrier.cutoffAdmissionOrder
        );
        if (crossSessionBarriers.length > 0) {
          await Promise.all(crossSessionBarriers.map((barrier) => barrier.completion));
          continue;
        }
        const barrier = authoritativeBarrierBySessionRef.current.get(sessionKey);
        if (barrier && nextRecord.admissionOrder > barrier.cutoffAdmissionOrder) {
          await barrier.completion;
          continue;
        }
        const queuedIndex = orderedSaveQueueRef.current.indexOf(nextRecord);
        if (queuedIndex === -1) continue;
        const [record] = orderedSaveQueueRef.current.splice(queuedIndex, 1);
        if (!record) continue;
        inFlightSaveByIdentityRef.current.set(identity, record);
        const { editorIdentity, editorEpoch, snapshot } = record.target;
        let potentialWriteStarted = false;
        let exactWriteSucceeded = false;
        try {
          record.dispatched = true;
          if (isCurrentEditableSession(editorIdentity, editorEpoch)) {
            if (record.persistenceKind === "autosave") setAutosaveSaving(true);
            setAutosaveError(null);
          }
          if (!isCurrentEditableSession(editorIdentity, editorEpoch)) {
            throw createEditorIdentityChangedError();
          }

          let response: PersistedSaveResult;
          if (record.persistenceKind === "autosave") {
            potentialWriteStarted = true;
            const result = await autosavePost(editorIdentity, snapshot.autosavePayload);
            response = { post: result.post, savedAt: result.savedAt };
          } else {
            const restorationDebtAtDispatch = hasRestorationDebt(editorIdentity, editorEpoch);
            potentialWriteStarted = true;
            const updatedDraft = await updatePost(editorIdentity, snapshot.basePayload);
            const predecessorMetadataSignature =
              lastPersistedExactTargetRef.current &&
              isSameEditorSession(lastPersistedExactTargetRef.current, record.target)
                ? lastPersistedExactTargetRef.current.snapshot.metadataSignature
                : null;
            const sessionStillCurrent = isCurrentEditableSession(editorIdentity, editorEpoch);
            const synchronizedPost =
              sessionStillCurrent &&
              (restorationDebtAtDispatch ||
                predecessorMetadataSignature !== snapshot.metadataSignature)
                ? await (async () => {
                    return updatePostMetadata(editorIdentity, snapshot.metadataPayload);
                  })()
                : updatedDraft;
            response = { post: synchronizedPost, savedAt: synchronizedPost.updatedAt };
          }

          applyPersistedResponse(record, response);
          exactWriteSucceeded = true;
          record.resolve();
        } catch (error) {
          if (isCurrentEditableSession(editorIdentity, editorEpoch)) {
            setAutosaveError(isApiClientError(error) ? error.message : "Failed to autosave post.");
          }
          record.reject(error);

          const remaining: QueuedRevisionSave[] = [];
          for (const dependent of orderedSaveQueueRef.current) {
            if (
              dependent.target.editorIdentity !== editorIdentity ||
              dependent.target.editorEpoch !== editorEpoch
            ) {
              remaining.push(dependent);
              continue;
            }
            queuedSaveByIdentityRevisionRef.current.delete(buildSaveTargetKey(dependent.target));
            dependent.reject(error);
          }
          orderedSaveQueueRef.current = remaining;
          break;
        } finally {
          const key = buildSaveTargetKey(record.target);
          if (queuedSaveByIdentityRevisionRef.current.get(key) === record) {
            queuedSaveByIdentityRevisionRef.current.delete(key);
          }
          if (inFlightSaveByIdentityRef.current.get(identity) === record) {
            inFlightSaveByIdentityRef.current.delete(identity);
          }
          if (potentialWriteStarted) {
            const settlementGeneration = recordPotentialWriteSettlement(identity);
            if (exactWriteSucceeded && isCurrentEditableSession(editorIdentity, editorEpoch)) {
              acceptPersistedPotentialWriteWatermark(
                editorIdentity,
                editorEpoch,
                settlementGeneration
              );
            }
          }
          if (isCurrentEditableSession(editorIdentity, editorEpoch)) {
            if (record.persistenceKind === "autosave") setAutosaveSaving(false);
          }
        }
      }
    })().finally(() => {
      drainPromiseByIdentityRef.current.delete(identity);
      const hasQueuedIdentityRecord = orderedSaveQueueRef.current.some(
        (record) => record.target.editorIdentity === identity
      );
      if (hasQueuedIdentityRecord) {
        queueMicrotask(() => {
          if (
            !drainPromiseByIdentityRef.current.has(identity) &&
            orderedSaveQueueRef.current.some((record) => record.target.editorIdentity === identity)
          ) {
            void drainQueueRef.current(identity);
          }
        });
      }
    });
    drainPromiseByIdentityRef.current.set(identity, drainPromise);
    return drainPromise;
  };
  drainQueueRef.current = drainExactRevisionQueue;

  const enqueueExactRevisionSave = (
    target: SaveTarget,
    mode: SaveMode,
    persistenceKind: SavePersistenceKind = mode === "manual" ? "draft" : "autosave",
    syncMode: PostDraftSyncMode = "silent"
  ): Promise<void> => {
    if (!isCurrentEditableSession(target.editorIdentity, target.editorEpoch)) {
      return Promise.reject(createEditorIdentityChangedError());
    }

    const predecessors = [...queuedSaveByIdentityRevisionRef.current.values()].filter((record) =>
      isUnresolvedPredecessorForTarget(record, target)
    );
    const conflictingPredecessor = predecessors.some(
      (record) => !sameSnapshot(record.target.snapshot, target.snapshot)
    );
    const persisted = lastPersistedExactTargetRef.current;
    const admittedAcrossAuthoritativeBarrier = authoritativeBarrierBySessionRef.current.has(
      buildEditorSessionKey(target.editorIdentity, target.editorEpoch)
    );
    const restorationDebt = hasRestorationDebt(target.editorIdentity, target.editorEpoch);
    const pendingPotentialWrite = hasPendingPotentialWrite(target.editorIdentity);
    if (
      persisted &&
      isSameEditorSession(persisted, target) &&
      sameSnapshot(persisted.snapshot, target.snapshot) &&
      !conflictingPredecessor &&
      !admittedAcrossAuthoritativeBarrier &&
      !restorationDebt &&
      !pendingPotentialWrite
    ) {
      return Promise.resolve();
    }

    const key = buildSaveTargetKey(target);
    const existing = queuedSaveByIdentityRevisionRef.current.get(key);
    if (existing) {
      // Same-key admission always coalesces: the capture discipline advances
      // the revision with every signature change, so an existing record under
      // the same (identity, epoch, revision) key carries the same snapshot
      // (TASK-105-08-08-L04 audit; the former conflicting-byte rejection was
      // structurally impossible and is removed by contract).
      existing.modes.add(mode);
      if (syncMode === "hydrate") existing.syncMode = "hydrate";
      return existing.promise;
    }

    let resolvePromise: () => void = () => undefined;
    let rejectPromise: (error: unknown) => void = () => undefined;
    const promise = new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    void promise.catch(() => undefined);
    const record: QueuedRevisionSave = {
      target,
      modes: new Set([mode]),
      persistenceKind,
      syncMode,
      admissionOrder: saveAdmissionSequenceRef.current + 1,
      predecessorBarrierOutcome:
        authoritativeBarrierBySessionRef.current.get(
          buildEditorSessionKey(target.editorIdentity, target.editorEpoch)
        )?.outcome ?? null,
      dispatched: false,
      promise,
      resolve: resolvePromise,
      reject: rejectPromise,
    };
    saveAdmissionSequenceRef.current = record.admissionOrder;
    advanceLocalMutationGeneration(target.editorIdentity, target.editorEpoch);
    queuedSaveByIdentityRevisionRef.current.set(key, record);
    const insertAt = orderedSaveQueueRef.current.findIndex(
      (queued) =>
        queued.target.editorIdentity === target.editorIdentity &&
        queued.target.editorEpoch === target.editorEpoch &&
        queued.target.revision > target.revision
    );
    if (insertAt === -1) orderedSaveQueueRef.current.push(record);
    else orderedSaveQueueRef.current.splice(insertAt, 0, record);
    void drainExactRevisionQueue(target.editorIdentity);
    return promise;
  };

  const runAuthoritativeIdentityBarrier = async <T>(
    identity: string,
    epoch: number,
    mode: AuthoritativeBarrierMode,
    operation: (
      reservedRevision: number,
      userMutationGenerationAtStart: number,
      markPotentialWriteStarted: () => void
    ) => Promise<T>
  ): Promise<T> => {
    if (!isCurrentEditableSession(identity, epoch)) {
      throw createEditorIdentityChangedError();
    }
    const sessionKey = buildEditorSessionKey(identity, epoch);
    const previousBarrier = authoritativeBarrierBySessionRef.current.get(sessionKey);
    const crossSessionBarrierPredecessors = [
      ...authoritativeBarrierBySessionRef.current.values(),
    ].filter(
      (candidate) => candidate.editorIdentity === identity && candidate.editorEpoch !== epoch
    );
    let releaseBarrier: () => void = () => undefined;
    let resolveOutcome: () => void = () => undefined;
    let rejectOutcome: (error: unknown) => void = () => undefined;
    let potentialWriteStarted = false;
    let operationSucceeded = false;
    const barrierCompletion = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    const barrierOutcome = new Promise<void>((resolve, reject) => {
      resolveOutcome = resolve;
      rejectOutcome = reject;
    });
    void barrierOutcome.catch(() => undefined);
    bumpDirtyRevision();
    const barrier: AuthoritativeBarrierState = {
      editorIdentity: identity,
      editorEpoch: epoch,
      potentialWritePending:
        mode === "potential-write" ||
        Boolean(previousBarrier?.potentialWritePending) ||
        crossSessionBarrierPredecessors.some((candidate) => candidate.potentialWritePending),
      completion: barrierCompletion,
      outcome: barrierOutcome,
      cutoffAdmissionOrder: saveAdmissionSequenceRef.current,
      reservedRevision: dirtyRevisionRef.current,
      userMutationGenerationAtStart: userMutationGenerationRef.current,
    };
    advanceLocalMutationGeneration(identity, epoch);
    authoritativeBarrierBySessionRef.current.set(sessionKey, barrier);
    try {
      if (previousBarrier) await previousBarrier.outcome;
      await Promise.all(crossSessionBarrierPredecessors.map((candidate) => candidate.completion));
      const predecessors = [...queuedSaveByIdentityRevisionRef.current.values()].filter(
        (record) =>
          record.target.editorIdentity === identity &&
          record.admissionOrder <= barrier.cutoffAdmissionOrder
      );
      await Promise.all(
        predecessors.map((record) =>
          record.target.editorEpoch === epoch
            ? record.promise
            : record.promise.catch(() => undefined)
        )
      );
      const result = await operation(
        barrier.reservedRevision,
        barrier.userMutationGenerationAtStart,
        () => {
          if (mode === "potential-write") potentialWriteStarted = true;
        }
      );
      operationSucceeded = true;
      resolveOutcome();
      return result;
    } catch (error) {
      rejectOutcome(error);
      const remaining: QueuedRevisionSave[] = [];
      for (const record of orderedSaveQueueRef.current) {
        if (
          record.target.editorIdentity !== identity ||
          record.target.editorEpoch !== epoch ||
          record.admissionOrder <= barrier.cutoffAdmissionOrder
        ) {
          remaining.push(record);
          continue;
        }
        queuedSaveByIdentityRevisionRef.current.delete(buildSaveTargetKey(record.target));
        record.reject(error);
      }
      orderedSaveQueueRef.current = remaining;
      throw error;
    } finally {
      if (potentialWriteStarted) {
        const settlementGeneration = recordPotentialWriteSettlement(identity);
        if (operationSucceeded && isCurrentEditableSession(identity, epoch)) {
          acceptPersistedPotentialWriteWatermark(identity, epoch, settlementGeneration);
        }
      }
      releaseBarrier();
      if (authoritativeBarrierBySessionRef.current.get(sessionKey) === barrier) {
        authoritativeBarrierBySessionRef.current.delete(sessionKey);
      }
    }
  };

  const runAutosave = async () => {
    const identity = activeEditorIdentityRef.current;
    const epoch = activeEditorEpochRef.current;
    const target =
      identity &&
      authoritativeBarrierBySessionRef.current.has(buildEditorSessionKey(identity, epoch))
        ? await captureCurrentTargetAfterAuthoritativeBarrier(identity, epoch)
        : captureCurrentTarget();
    await enqueueExactRevisionSave(target, "background", "autosave");
  };

  const saveDraftInternal = async (options?: { syncMode?: PostDraftSyncMode }) => {
    const { identity, epoch } = requireCurrentEditableSession();
    const syncMode = normalizePostDraftSyncMode(options?.syncMode);
    cancelAutosave();
    const target = captureCurrentTarget();
    dispatchEditorAction({ type: "set_saving", saving: true });
    setAutosaveError(null);
    setError(null);
    try {
      await enqueueExactRevisionSave(target, "manual", "draft", syncMode);
    } catch (err) {
      if (isCurrentEditableSession(identity, epoch)) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to save post draft.");
        }
      }
      throw err;
    } finally {
      if (isCurrentEditableSession(identity, epoch)) {
        dispatchEditorAction({ type: "set_saving", saving: false });
      }
    }
  };

  const flushLatestAutosave = async () => {
    const closeIdentity = postId;
    const closeEpoch = editorRouteEpoch;
    if (!mountedRef.current) throw createEditorIdentityChangedError();
    if (routePostIdRef.current !== closeIdentity || routeGenerationRef.current !== closeEpoch) {
      throw createEditorIdentityChangedError();
    }
    if (
      editorStateIdentityRef.current !== closeIdentity ||
      editorStateEpochRef.current !== closeEpoch ||
      liveDraftRef.current?.editorIdentity !== closeIdentity
    ) {
      return;
    }
    if (!closeIdentity) return;
    if (
      activeEditorIdentityRef.current !== closeIdentity ||
      activeEditorEpochRef.current !== closeEpoch
    ) {
      throw createEditorIdentityChangedError();
    }
    const assertCloseIdentityCurrent = () => {
      if (
        !mountedRef.current ||
        routePostIdRef.current !== closeIdentity ||
        routeGenerationRef.current !== closeEpoch ||
        activeEditorIdentityRef.current !== closeIdentity ||
        activeEditorEpochRef.current !== closeEpoch
      ) {
        throw createEditorIdentityChangedError();
      }
    };
    try {
      assertCloseIdentityCurrent();
      let scheduledAutosaveFlushed = false;
      for (;;) {
        assertCloseIdentityCurrent();
        const barrier = authoritativeBarrierBySessionRef.current.get(
          buildEditorSessionKey(closeIdentity, closeEpoch)
        );
        if (barrier) {
          await barrier.outcome;
          assertCloseIdentityCurrent();
          continue;
        }
        const stalePotentialWriteBarriers = [
          ...authoritativeBarrierBySessionRef.current.values(),
        ].filter(
          (candidate) =>
            candidate.editorIdentity === closeIdentity &&
            candidate.editorEpoch !== closeEpoch &&
            candidate.potentialWritePending
        );
        if (stalePotentialWriteBarriers.length > 0) {
          await Promise.all(stalePotentialWriteBarriers.map((candidate) => candidate.completion));
          assertCloseIdentityCurrent();
          continue;
        }
        if (!scheduledAutosaveFlushed) {
          scheduledAutosaveFlushed = true;
          await flushScheduledAutosave();
          assertCloseIdentityCurrent();
          continue;
        }
        assertCloseIdentityCurrent();
        const target = captureCurrentTarget();
        if (target.editorIdentity !== closeIdentity) {
          throw createEditorIdentityChangedError();
        }
        const predecessors = [...queuedSaveByIdentityRevisionRef.current.values()].filter(
          (record) => isUnresolvedPredecessorForTarget(record, target)
        );
        const conflictingPredecessor = predecessors.some(
          (record) => !sameSnapshot(record.target.snapshot, target.snapshot)
        );
        const persisted = lastPersistedExactTargetRef.current;
        const restorationDebt = hasRestorationDebt(target.editorIdentity, target.editorEpoch);
        if (
          persisted &&
          isSameEditorSession(persisted, target) &&
          sameSnapshot(persisted.snapshot, target.snapshot) &&
          !conflictingPredecessor &&
          !restorationDebt
        ) {
          await Promise.all(
            predecessors.map((record) =>
              record.target.editorEpoch === target.editorEpoch
                ? record.promise
                : record.promise.catch(() => undefined)
            )
          );
        } else {
          await enqueueExactRevisionSave(target, "close", "autosave");
        }

        assertCloseIdentityCurrent();
        if (
          dirtyRevisionRef.current === target.revision &&
          !hasRestorationDebt(target.editorIdentity, target.editorEpoch) &&
          !hasPendingPotentialWrite(target.editorIdentity)
        ) {
          assertCloseIdentityCurrent();
          return;
        }
      }
    } catch (error) {
      if (
        closeIdentity &&
        mountedRef.current &&
        routePostIdRef.current === closeIdentity &&
        routeGenerationRef.current === closeEpoch &&
        activeEditorIdentityRef.current === closeIdentity &&
        activeEditorEpochRef.current === closeEpoch
      ) {
        setAutosaveError(resolveCloseSaveErrorCopy(error));
      }
      throw error;
    }
  };

  return {
    rejectQueuedSession,
    captureCurrentTarget,
    captureCurrentTargetAfterAuthoritativeBarrier,
    applyPersistedResponse,
    drainExactRevisionQueue,
    enqueueExactRevisionSave,
    runAuthoritativeIdentityBarrier,
    runAutosave,
    saveDraftInternal,
    flushLatestAutosave,
  };
};

export type SaveQueue = ReturnType<typeof createSaveQueue>;
