// TASK-105-08-08-L04 split: editor session identity, epochs, save-target keys,
// and snapshot/session comparators for the post editor state hook. Extracted
// verbatim from usePostEditorState.ts (single writer: TASK-105-08-08-L04).
// No behavior change: these are the pure session-contract helpers the hook,
// refresh lifecycle, and save queue share.

import { isApiClientError } from "@/services/apiClient";
import type { PostDetail } from "@/services/postsClient";

import {
  buildDraftSnapshot,
  type LivePostDraft,
  type PostDraftSnapshot,
} from "./postEditorStateDocument";
import { postEditorReducer, type PostEditorAction } from "../postEditorStore";

/** Resolves the post id from an admin route path (`/posts/<id>/...`). */
export const resolvePostIdFromPath = (path: string): string | null => {
  const pathname = path.split(/[?#]/)[0] ?? "";
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "posts");
  if (index === -1) return null;
  const raw = parts[index + 1] ?? null;
  return raw ? decodeURIComponent(raw) : null;
};

export type SaveTarget = Readonly<{
  editorIdentity: string;
  editorEpoch: number;
  revision: number;
  snapshot: PostDraftSnapshot;
}>;

export type SaveMode = "manual" | "background" | "close";
export type SavePersistenceKind = "autosave" | "draft";
export type PersistedSaveResult = Readonly<{ post: PostDetail; savedAt: string }>;
export type AuthoritativeBarrierMode = "read-only" | "potential-write";

export type QueuedRevisionSave = {
  target: SaveTarget;
  modes: Set<SaveMode>;
  persistenceKind: SavePersistenceKind;
  syncMode: "silent" | "hydrate";
  admissionOrder: number;
  predecessorBarrierOutcome: Promise<void> | null;
  dispatched: boolean;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type AuthoritativeBarrierState = {
  editorIdentity: string;
  editorEpoch: number;
  potentialWritePending: boolean;
  completion: Promise<void>;
  outcome: Promise<void>;
  cutoffAdmissionOrder: number;
  reservedRevision: number;
  userMutationGenerationAtStart: number;
};

export const buildEditorSessionKey = (editorIdentity: string | null, editorEpoch: number) =>
  JSON.stringify([editorIdentity, editorEpoch]);

export const buildSaveTargetKey = (target: SaveTarget) =>
  JSON.stringify([target.editorIdentity, target.editorEpoch, target.revision]);

export const isSameEditorSession = (left: SaveTarget, right: SaveTarget) =>
  left.editorIdentity === right.editorIdentity && left.editorEpoch === right.editorEpoch;

export const isUnresolvedPredecessorForTarget = (record: QueuedRevisionSave, target: SaveTarget) =>
  record.target.editorIdentity === target.editorIdentity &&
  (record.target.editorEpoch !== target.editorEpoch || record.target.revision <= target.revision);

export const createEditorIdentityChangedError = () =>
  Object.assign(new Error("The active post changed before saving completed."), {
    code: "editor_identity_changed",
  });

export const resolveCloseSaveErrorCopy = (error: unknown) =>
  isApiClientError(error) && error.message.trim().length > 0
    ? error.message
    : "Failed to save latest changes before closing.";

// TASK-105-08-08-L04-L01: the editor machinery owns every mutable bookkeeping
// box the post editor state hook, save queue, and refresh lifecycle share.
// The boxes are plain `{ current }` holders created once per editor mount
// (via a lazy useState initializer in the facade) so no React ref is ever
// passed to a function during render; the render-visible projections of the
// mutable state (route epoch, active session, live-draft identity, dirty
// revision) are React state mirrors the machinery notifies through the
// injected setters, keeping rendering output identical to the former
// useRef-based wiring.

type BooleanBox = { current: boolean };
type NumberBox = { current: number };
type StringOrNullBox = { current: string | null };
type LiveDraftBox = { current: LivePostDraft | null };
type StringBox = { current: string };
type SaveTargetBox = { current: SaveTarget | null };
type QueuedSaveMapBox = { current: Map<string, QueuedRevisionSave> };
type OrderedSaveQueueBox = { current: QueuedRevisionSave[] };
type InFlightSaveMapBox = { current: Map<string, QueuedRevisionSave> };
type DrainPromiseMapBox = { current: Map<string, Promise<void>> };
type DrainQueueBox = { current: (identity: string) => Promise<void> };
type BarrierMapBox = { current: Map<string, AuthoritativeBarrierState> };
type GenerationMapBox = { current: Map<string, number> };
type CancelAutosaveBox = { current: () => void };
type FlushAutosaveBox = { current: () => Promise<void> };

export type EditorMachineryDeps = {
  /** Route identity captured when the machinery is created (first render). */
  postId: string | null;
  editorRouteEpoch: number;
  initialLiveDraft: LivePostDraft | null;
  initialTarget: SaveTarget | null;
  dispatch: (action: PostEditorAction) => void;
  /** Render mirrors kept in sync whenever the mutable boxes change. */
  setLiveDraftIdentity: (identity: string | null) => void;
  setDirtyRevision: (revision: number) => void;
};

export type RouteSessionTransition = {
  changed: boolean;
  previousIdentity: string | null;
  previousEpoch: number;
};

export type EditorMachinery = {
  mountedRef: BooleanBox;
  routePostIdRef: StringOrNullBox;
  routeGenerationRef: NumberBox;
  activeEditorIdentityRef: StringOrNullBox;
  activeEditorEpochRef: NumberBox;
  editorStateIdentityRef: StringOrNullBox;
  editorStateEpochRef: NumberBox;
  hydrationRequestGenerationRef: NumberBox;
  liveDraftRef: LiveDraftBox;
  liveSignatureRef: StringBox;
  dirtyRevisionRef: NumberBox;
  userMutationGenerationRef: NumberBox;
  lastPersistedExactTargetRef: SaveTargetBox;
  queuedSaveByIdentityRevisionRef: QueuedSaveMapBox;
  orderedSaveQueueRef: OrderedSaveQueueBox;
  inFlightSaveByIdentityRef: InFlightSaveMapBox;
  drainPromiseByIdentityRef: DrainPromiseMapBox;
  drainQueueRef: DrainQueueBox;
  authoritativeBarrierBySessionRef: BarrierMapBox;
  potentialWriteSettlementGenerationByIdentityRef: GenerationMapBox;
  persistedPotentialWriteWatermarkBySessionRef: GenerationMapBox;
  saveAdmissionSequenceRef: NumberBox;
  localSaveGenerationBySessionRef: GenerationMapBox;
  cancelAutosaveRef: CancelAutosaveBox;
  flushScheduledAutosaveRef: FlushAutosaveBox;
  isCurrentEditableSession: (identity: string, epoch: number) => boolean;
  dispatchEditorAction: (action: PostEditorAction) => boolean;
  installLiveDraftMutation: (mutate: (current: LivePostDraft) => LivePostDraft) => boolean;
  getPotentialWriteSettlementGeneration: (identity: string) => number;
  recordPotentialWriteSettlement: (identity: string) => number;
  acceptPersistedPotentialWriteWatermark: (
    identity: string,
    epoch: number,
    generation: number
  ) => void;
  hasRestorationDebt: (identity: string, epoch: number) => boolean;
  hasPendingPotentialWrite: (identity: string) => boolean;
  advanceLocalMutationGeneration: (identity: string, epoch: number) => void;
  /** Dirty-revision writers that also notify the facade's render mirror. */
  bumpDirtyRevision: () => void;
  setDirtyRevisionTo: (revision: number) => void;
  /** Installs a live draft of any identity and notifies the render mirror. */
  installLiveDraft: (draft: LivePostDraft | null) => void;
  syncRouteIdentity: (postId: string | null, epoch: number) => void;
  syncRouteSession: (postId: string | null, epoch: number) => RouteSessionTransition;
  setMounted: (mounted: boolean) => void;
  setAutosaveHandles: (cancel: () => void, flush: () => Promise<void>) => void;
  cancelAutosaveNow: () => void;
  flushScheduledAutosaveNow: () => Promise<void>;
};

export const createEditorMachinery = (deps: EditorMachineryDeps): EditorMachinery => {
  const {
    postId,
    editorRouteEpoch,
    initialLiveDraft,
    initialTarget,
    dispatch,
    setLiveDraftIdentity,
    setDirtyRevision,
  } = deps;

  const mountedRef: BooleanBox = { current: true };
  const routePostIdRef: StringOrNullBox = { current: postId };
  const routeGenerationRef: NumberBox = { current: editorRouteEpoch };
  const activeEditorIdentityRef: StringOrNullBox = { current: postId };
  const activeEditorEpochRef: NumberBox = { current: editorRouteEpoch };
  const editorStateIdentityRef: StringOrNullBox = { current: postId };
  const editorStateEpochRef: NumberBox = { current: editorRouteEpoch };
  const hydrationRequestGenerationRef: NumberBox = { current: 0 };
  const liveDraftRef: LiveDraftBox = { current: initialLiveDraft };
  const liveSignatureRef: StringBox = { current: initialTarget?.snapshot.signature ?? "" };
  const dirtyRevisionRef: NumberBox = { current: 0 };
  const userMutationGenerationRef: NumberBox = { current: 0 };
  const lastPersistedExactTargetRef: SaveTargetBox = { current: initialTarget };
  const queuedSaveByIdentityRevisionRef: QueuedSaveMapBox = { current: new Map() };
  const orderedSaveQueueRef: OrderedSaveQueueBox = { current: [] };
  const inFlightSaveByIdentityRef: InFlightSaveMapBox = { current: new Map() };
  const drainPromiseByIdentityRef: DrainPromiseMapBox = { current: new Map() };
  const drainQueueRef: DrainQueueBox = { current: async () => undefined };
  const authoritativeBarrierBySessionRef: BarrierMapBox = { current: new Map() };
  const potentialWriteSettlementGenerationByIdentityRef: GenerationMapBox = { current: new Map() };
  const persistedPotentialWriteWatermarkBySessionRef: GenerationMapBox = {
    current: initialTarget
      ? new Map<string, number>([
          [buildEditorSessionKey(initialTarget.editorIdentity, initialTarget.editorEpoch), 0],
        ])
      : new Map<string, number>(),
  };
  const saveAdmissionSequenceRef: NumberBox = { current: 0 };
  const localSaveGenerationBySessionRef: GenerationMapBox = { current: new Map() };
  const cancelAutosaveRef: CancelAutosaveBox = { current: () => undefined };
  const flushScheduledAutosaveRef: FlushAutosaveBox = { current: async () => undefined };

  const bumpDirtyRevision = () => {
    dirtyRevisionRef.current += 1;
    setDirtyRevision(dirtyRevisionRef.current);
  };

  const setDirtyRevisionTo = (revision: number) => {
    dirtyRevisionRef.current = revision;
    setDirtyRevision(revision);
  };

  const installLiveDraft = (draft: LivePostDraft | null) => {
    liveDraftRef.current = draft;
    setLiveDraftIdentity(draft?.editorIdentity ?? null);
  };

  const syncRouteIdentity = (nextPostId: string | null, epoch: number) => {
    routePostIdRef.current = nextPostId;
    routeGenerationRef.current = epoch;
  };

  const syncRouteSession = (nextPostId: string | null, epoch: number): RouteSessionTransition => {
    const previousIdentity = activeEditorIdentityRef.current;
    const previousEpoch = activeEditorEpochRef.current;
    if (previousIdentity === nextPostId && previousEpoch === epoch) {
      return { changed: false, previousIdentity, previousEpoch };
    }
    cancelAutosaveRef.current();
    activeEditorIdentityRef.current = nextPostId;
    activeEditorEpochRef.current = epoch;
    setDirtyRevisionTo(0);
    userMutationGenerationRef.current = 0;
    installLiveDraft(null);
    liveSignatureRef.current = "";
    lastPersistedExactTargetRef.current = null;
    return { changed: true, previousIdentity, previousEpoch };
  };

  const setMounted = (mounted: boolean) => {
    mountedRef.current = mounted;
  };

  const setAutosaveHandles = (cancel: () => void, flush: () => Promise<void>) => {
    cancelAutosaveRef.current = cancel;
    flushScheduledAutosaveRef.current = flush;
  };

  const cancelAutosaveNow = () => {
    cancelAutosaveRef.current();
  };

  const flushScheduledAutosaveNow = () => flushScheduledAutosaveRef.current();

  const isCurrentEditableSession = (identity: string, epoch: number) => {
    const liveDraft = liveDraftRef.current;
    return (
      mountedRef.current &&
      routePostIdRef.current === identity &&
      routeGenerationRef.current === epoch &&
      activeEditorIdentityRef.current === identity &&
      activeEditorEpochRef.current === epoch &&
      editorStateIdentityRef.current === identity &&
      editorStateEpochRef.current === epoch &&
      liveDraft?.editorIdentity === identity
    );
  };

  const dispatchEditorAction = (action: PostEditorAction) => {
    const identity = activeEditorIdentityRef.current;
    const liveDraft = liveDraftRef.current;
    if (
      !identity ||
      routePostIdRef.current !== identity ||
      routeGenerationRef.current !== activeEditorEpochRef.current ||
      editorStateIdentityRef.current !== identity ||
      editorStateEpochRef.current !== activeEditorEpochRef.current ||
      !liveDraft ||
      liveDraft.editorIdentity !== identity
    ) {
      return false;
    }
    const nextEditorState = postEditorReducer(liveDraft.editorState, action);
    const nextDraft = { ...liveDraft, editorState: nextEditorState };
    const nextSignature = buildDraftSnapshot(nextDraft).signature;
    if (nextSignature !== liveSignatureRef.current) {
      bumpDirtyRevision();
      userMutationGenerationRef.current += 1;
      liveSignatureRef.current = nextSignature;
    }
    liveDraftRef.current = nextDraft;
    dispatch(action);
    return true;
  };

  const installLiveDraftMutation = (mutate: (current: LivePostDraft) => LivePostDraft) => {
    const current = liveDraftRef.current;
    const identity = activeEditorIdentityRef.current;
    if (
      !identity ||
      routePostIdRef.current !== identity ||
      routeGenerationRef.current !== activeEditorEpochRef.current ||
      editorStateIdentityRef.current !== identity ||
      editorStateEpochRef.current !== activeEditorEpochRef.current ||
      !current ||
      current.editorIdentity !== identity
    ) {
      return false;
    }
    const next = mutate(current);
    const nextSignature = buildDraftSnapshot(next).signature;
    if (nextSignature !== liveSignatureRef.current) {
      bumpDirtyRevision();
      userMutationGenerationRef.current += 1;
      liveSignatureRef.current = nextSignature;
    }
    liveDraftRef.current = next;
    return true;
  };

  const getPotentialWriteSettlementGeneration = (identity: string) =>
    potentialWriteSettlementGenerationByIdentityRef.current.get(identity) ?? 0;

  const recordPotentialWriteSettlement = (identity: string) => {
    const nextGeneration =
      (potentialWriteSettlementGenerationByIdentityRef.current.get(identity) ?? 0) + 1;
    potentialWriteSettlementGenerationByIdentityRef.current.set(identity, nextGeneration);
    return nextGeneration;
  };

  const acceptPersistedPotentialWriteWatermark = (
    identity: string,
    epoch: number,
    generation: number
  ) => {
    persistedPotentialWriteWatermarkBySessionRef.current.set(
      buildEditorSessionKey(identity, epoch),
      generation
    );
  };

  const hasRestorationDebt = (identity: string, epoch: number) => {
    const currentGeneration =
      potentialWriteSettlementGenerationByIdentityRef.current.get(identity) ?? 0;
    const persistedWatermark = persistedPotentialWriteWatermarkBySessionRef.current.get(
      buildEditorSessionKey(identity, epoch)
    );
    return persistedWatermark === undefined
      ? currentGeneration > 0
      : persistedWatermark < currentGeneration;
  };

  const hasPendingPotentialWrite = (identity: string) =>
    [...queuedSaveByIdentityRevisionRef.current.values()].some(
      (record) => record.target.editorIdentity === identity
    ) ||
    [...authoritativeBarrierBySessionRef.current.values()].some(
      (barrier) => barrier.editorIdentity === identity && barrier.potentialWritePending
    );

  const advanceLocalMutationGeneration = (identity: string, epoch: number) => {
    const sessionKey = buildEditorSessionKey(identity, epoch);
    localSaveGenerationBySessionRef.current.set(
      sessionKey,
      (localSaveGenerationBySessionRef.current.get(sessionKey) ?? 0) + 1
    );
  };

  return {
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
    dirtyRevisionRef,
    userMutationGenerationRef,
    lastPersistedExactTargetRef,
    queuedSaveByIdentityRevisionRef,
    orderedSaveQueueRef,
    inFlightSaveByIdentityRef,
    drainPromiseByIdentityRef,
    drainQueueRef,
    authoritativeBarrierBySessionRef,
    potentialWriteSettlementGenerationByIdentityRef,
    persistedPotentialWriteWatermarkBySessionRef,
    saveAdmissionSequenceRef,
    localSaveGenerationBySessionRef,
    cancelAutosaveRef,
    flushScheduledAutosaveRef,
    isCurrentEditableSession,
    dispatchEditorAction,
    installLiveDraftMutation,
    getPotentialWriteSettlementGeneration,
    recordPotentialWriteSettlement,
    acceptPersistedPotentialWriteWatermark,
    hasRestorationDebt,
    hasPendingPotentialWrite,
    advanceLocalMutationGeneration,
    bumpDirtyRevision,
    setDirtyRevisionTo,
    installLiveDraft,
    syncRouteIdentity,
    syncRouteSession,
    setMounted,
    setAutosaveHandles,
    cancelAutosaveNow,
    flushScheduledAutosaveNow,
  };
};
