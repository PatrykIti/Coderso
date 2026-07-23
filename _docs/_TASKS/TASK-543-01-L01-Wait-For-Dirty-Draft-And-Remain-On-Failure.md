# TASK-543-01-L01: Wait for Dirty Draft and Remain on Failure

# FileName: TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md

**Parent Task:** TASK-543
**Parent Subtask:** TASK-543-01
**Priority:** High
**Category:** Posts Editor / Autosave / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-543-01
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Reopened:** 2026-07-13 — final closure audit found that a global drain blocked unrelated posts, while a naive per-session drain allowed stale same-post overwrites
**Changelog:** 1255

---

## Scope

Expose a failure-propagating flushLatestAutosave operation from editor state and make the
Close action await it. The operation coalesces with the current save and loops once more
when a newer dirty revision appeared during that request.

## Source and direct-test ownership

This leaf is the only TASK-543 writer of:

- core/admin/ui/posts/editor/hooks/usePostAutosave.ts;
- core/admin/ui/posts/editor/hooks/usePostEditorState.ts;
- core/admin/ui/posts/editor/PostBlockEditorShell.tsx;
- core/admin/ui/posts/editor/PostEditorTopBar.tsx;
- core/admin/ui/posts/editor/header/PostEditorHeader.tsx;
- tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx;
- tests/vitest/ui/post-editor-state-hook-wave.test.tsx;
- tests/vitest/ui/post-block-editor-shell-wave.test.tsx;
- tests/vitest/ui/posts-editor-chrome-wave.test.tsx;
- tests/vitest/ui/post-block-editor-shell.test.tsx;
- tests/vitest/ui-integration/post-autosave-flow.test.tsx;
- tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx;
- tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx;
- tests/vitest/ui-integration/post-editor-layout-shell.test.tsx.

The five historical shell/chrome suites explicitly model a loaded editor (`post` is non-null
and `canMutatePost` is true) when they assert editable controls. Their former partial hook
mocks, which omitted the loaded post, now correctly represent the real SSR/loading fail-closed
boundary; rebaseline the mocks to the loaded contract instead of weakening that production
boundary.

It must not edit API clients/routes, PostsTable.tsx, PostsTable/list test suites, docs,
tasks, or changelog indexes. Add the required compatibility/changed-behavior assertions
before this leaf's source gate; TASK-543-03 may rerun but never edit/rebaseline these files.

## Implementation Pseudocode

~~~ts
// usePostAutosave retains schedule/cancel but flush returns the actual callback promise.
function flush(): Promise<void> {
  cancel debounce timer;
  if disabled or clean: return resolved promise;
  return invoke current onAutosave callback;
}
timer callback invokes the same onAutosave promise and owns the only background
  `.catch(() => undefined)` boundary so scheduled rejection is visible in editor state
  without becoming an unhandled rejection; explicit flush never swallows it;

// Editor state owns a route-session identity, revision, and request identity for every path.
const dirtyRevisionRef = useRef(0); // shared monotonic save/barrier ordering counter
const userMutationGenerationRef = useRef(0); // advances only for authored payload changes
type EditorSession = Readonly<{editorIdentity:string; editorEpoch:number}>;
type PostDraftSnapshot = Readonly<{
  editorIdentity: string;
  basePayload: Readonly<{title:string; slug:string; data:Record<string, unknown>}>;
  metadataPayload: Readonly<{
    tags:string[];
    taxonomy:{categoryId:string|null};
    seo:PostSeo;
  }>;
  autosavePayload: Readonly<PostAutosavePayload>; // exact base + metadata envelope
  metadataSignature: string;
  signature: string; // JSON.stringify({basePayload,metadataPayload}) in fixed key order
}>;
type SaveTarget = Readonly<{
  editorIdentity: string; // stable post id, never inferred from a later render
  editorEpoch: number; // stable route session, captured before any await
  revision: number;
  snapshot: PostDraftSnapshot;
}>;
type SavePersistenceKind = "autosave" | "draft";
type PersistedSaveResult = Readonly<{post:PostDetail; savedAt:string}>;
type SaveQueueRecord = {
  kind: "save";
  target: SaveTarget;
  modes: Set<"manual" | "background" | "close">;
  persistenceKind: SavePersistenceKind;
  syncMode: PostDraftSyncMode;
  admissionOrder: number;
  predecessorBarrierOutcome: Promise<void> | null;
  dispatched: boolean;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};
const activeEditorIdentityRef = useRef<string | null>(null);
const [editorStateIdentity, setEditorStateIdentity] = useState<string | null>(initialPostId);
const editorStateIdentityRef = useRef<string | null>(initialPostId);
const queuedSaveByIdentityRevision = useRef(new Map<string, SaveQueueRecord>()).current;
const drainPromiseByIdentityRef = useRef(new Map<string, Promise<void>>());
const lastPersistedExactTargetRef = useRef<SaveTarget | null>(null);
const potentialWriteSettlementGenerationByIdentityRef = useRef(new Map<string, number>());
const persistedPotentialWriteWatermarkBySessionRef = useRef(new Map<string, number>());
const liveDraftRef = useRef<LivePostDraft>(initialInstalledDraft);
const liveSignatureRef = useRef(initialInstalledSnapshot.signature);

function recordPotentialWriteSettlement(editorIdentity: string): number {
  increment and return the per-post generation exactly once after a physical save or restore
    transport was started and then settled, including failure because the server may have
    partially committed;
}

function acceptPersistedPotentialWriteWatermark(
  editorIdentity: string,
  editorEpoch: number,
  generation: number
): void {
  record that this exact session baseline/write covers generation;
}

function hasRestorationDebt(editorIdentity: string, editorEpoch: number): boolean {
  return session watermark is absent/older than the post settlement generation;
}

function hasPendingPotentialWrite(editorIdentity: string): boolean {
  return any queued/in-flight save for the post or any same-post barrier whose
    potentialWritePending chain flag is true;
}

function isCurrentEditableSession(session: EditorSession): boolean {
  return mountedRef.current
    && current route id/routeGenerationRef equal session
    && active editor id/epoch refs equal session
    && committed editor-state id/epoch refs equal session
    && liveDraftRef.current id equals session.editorIdentity;
}

function requireCurrentEditableSession(session: EditorSession): void {
  if (!isCurrentEditableSession(session)) throw editor_identity_changed;
}

function installLiveDraftMutation(nextDraft: LivePostDraft): void {
  require current route identity, activeEditorIdentityRef and editorStateIdentityRef all
    equal nextDraft.editorIdentity; otherwise ignore the stale callback;
  snapshot = buildSnapshot(nextDraft);
  liveDraftRef.current = nextDraft;
  if snapshot.signature !== liveSignatureRef.current:
    liveSignatureRef.current = snapshot.signature;
    dirtyRevisionRef.current += 1;
    userMutationGenerationRef.current += 1;
}

wrap every editable setter (`setTitle`, `setSlug`, `setFeaturedImage`,
  `setTagsInput`, `setCategoryId`, `setSeoDraft`) so it computes nextDraft and calls
  installLiveDraftMutation before the React setter;
wrap every editor dispatch through `dispatchEditorAction`: run postEditorReducer against
  liveDraftRef.current.editorState, update that ref, advance revision only when the resulting
  full signature changed, then call the real dispatch. `hydrate`, `set_saving`, `mark_saved`,
  and `select_block` do not advance; update/meta/block/insert/delete/move/transform/TOC/
  undo/redo do when and only when the reducer produced different exact payload bytes;

function captureCurrentTarget(): SaveTarget {
  require current post id equals active editor identity;
  build basePayload and metadataPayload once from the latest refs;
  deep-clone the complete payload with structuredClone (JSON clone fallback only for
    this JSON-safe contract), freeze it in tests/dev, and derive autosavePayload;
  signature = JSON.stringify({basePayload,metadataPayload}) with the exact fixed owner order;
  if signature differs from liveSignatureRef (defensive fallback only):
    synchronize liveDraftRef/liveSignatureRef and increment dirtyRevisionRef plus
      userMutationGenerationRef before return;
  return {editorIdentity,revision:dirtyRevisionRef.current,snapshot};
}

`hasUnsavedChanges` is current snapshot signature !== the active identity's
`lastPersistedExactTargetRef.current.snapshot.signature`. Reducer `state.dirty` remains
UI/history state only and cannot authorize a zero-write Close.

function saveKey(target: SaveTarget): string {
  return stable tuple key(target.editorIdentity, target.editorEpoch, target.revision);
}

Key every authoritative barrier, exact-save record, and local-save generation by the stable
tuple `(editorIdentity, editorEpoch)`, never by post id alone. Response/error/finally guards,
persisted-target comparisons, and logical state ownership use that full session. Physical
transport arbitration, cache-event suppression, and potentially-overwriting predecessor
detection use post identity across epochs. Already-dispatched A0 work is inert to A1 UI state,
errors, and baseline after A→B→A, but it remains a physical predecessor: A1 writes/restores its
exact bytes after A0 settles so stale server/cache bytes cannot become final. Its potential-write
generation survives record cleanup, so a later clean A1 Close cannot forget the obligation.

function installAuthoritativePersistedTarget(
  target: SaveTarget,
  reason: "initial-load" | "accepted-hydration" | "identity-transition",
  authorizedRouteIdentity: string,
  acceptedPotentialWriteGeneration: number
): void {
  require target.snapshot is exactly the snapshot installed as the live draft/baseline;
  require target.editorIdentity === authorizedRouteIdentity;
  require authorizedRouteIdentity is still the identity parsed from the current admin
    route when this synchronous installation runs;
  require activeEditorIdentityRef.current is null
    or activeEditorIdentityRef.current === target.editorIdentity
    or reason === "identity-transition";
  if (reason === "identity-transition") {
    cancel scheduled timer;
    reject/remove queued records for the previous identity with editor_identity_changed;
    let an already dispatched old request settle, but session-guard its response/error so it
      cannot mutate the new draft, persisted baseline, error surface, or revision state;
    retain that request in the post-identity physical lane so a new epoch for the same post
      restores its exact current bytes after settlement, while a different post drains
      independently;
    clear old queue keys and reset dirtyRevisionRef plus userMutationGenerationRef for the
      new identity;
  } else {
    require no newer dirty/pending target is being overwritten by this hydration;
  }
  activeEditorIdentityRef.current = target.editorIdentity;
  dirtyRevisionRef.current = target.revision;
  liveDraftRef.current = the exact installed draft;
  liveSignatureRef.current = target.snapshot.signature;
  lastPersistedExactTargetRef.current = target;
  acceptPersistedPotentialWriteWatermark(
    target.editorIdentity,
    target.editorEpoch,
    acceptedPotentialWriteGeneration
  );
}

initial load and every accepted authoritative hydrate:
  capture the post's potential-write settlement generation before the GET starts and pass that
    captured value into the installed baseline; if an older physical write settles during or
    after the GET, its later generation remains restoration debt rather than being accidentally
    covered by response acceptance;
  build the immutable installed snapshot and revision for the active post;
  call installAuthoritativePersistedTarget after installing that same snapshot;
  same-identity async restore/reload reaches this installer only from the authoritative
  barrier described below;

post-id/editor-identity transition:
  the route-change effect performs only timer cancellation, old queued-promise rejection,
    and synchronous ref invalidation; it performs no synchronous React setState calls;
  while editorStateIdentity !== current route postId, expose a safe loading boundary:
    null post, blank title/slug/featured/metadata/editor document, no dirty/error/busy state,
    and disabled autosave/mutation callbacks, so the old post is never committed for one frame;
  only the current route loader may call installAuthoritativePersistedTarget with reason
    "identity-transition" and it passes the route identity it captured/revalidated;
  accepted B load batches the B state and then commits editorStateIdentity/editorStateIdentityRef
    to B; a current B load failure commits a blank B-owned error boundary instead;
  a response id that merely differs from activeEditorIdentityRef never authorizes a
    transition by itself;
  increment/capture the route epoch synchronously for every route transition, including
    same-id ABA navigation; never reuse an identity-only queue/barrier/generation key or
    persisted target from the previous route session;

server-operation boundary:
  expose `canMutatePost = isCurrentEditableSession(current route session)`;
  before dispatch and after every await, require the captured editable session for manual
    save, publish, unpublish, preview, trash/delete, revision list/restore, authoritative
    reload, and clipboard upload; stale success/error/finally paths are inert;
  shell/header/preview/revision controls consume `canMutatePost` and are physically disabled
    while loading or when no hydrated post exists; Close remains enabled and its special
    blank/rejected-load path resolves with zero writes;

type AuthoritativeBarrierState = {
  editorIdentity: string;
  editorEpoch: number;
  potentialWritePending: boolean;
  completion: Promise<void>; // releases post-cutoff saves in finally
  outcome: Promise<void>; // success/failure observed by Close and the next barrier
  cutoffAdmissionOrder: number;
  reservedRevision: number;
  userMutationGenerationAtStart: number;
};

const orderedSaveQueue = useRef<SaveQueueRecord[]>([]);
const inFlightSaveByIdentityRef = useRef(new Map<string, SaveQueueRecord>());
const authoritativeBarrierBySession = useRef(
  new Map<string, AuthoritativeBarrierState>()
).current;
const saveAdmissionSequenceRef = useRef(0);
// Logical barriers and failure dependencies belong to an exact route session. The physical
// drain belongs to post identity, so different posts proceed independently and the same post
// has at most one write transport across all epochs. A barrier is never a save, never owns a
// persistence endpoint, and never joins an exact save record.

function enqueueExactRevisionSave(
  target: SaveTarget,
  mode: "manual" | "background" | "close",
  requestedPersistence = mode === "manual" ? "draft" : "autosave",
  syncMode: PostDraftSyncMode = "silent"
): Promise<void> {
  sessionKey = stable tuple key(target.editorIdentity, target.editorEpoch);
  conflictingPredecessor = every pending/in-flight save for the same post that can still
    overwrite target bytes; within the same epoch consider records at or before target.revision,
    while every unresolved older epoch is a physical predecessor regardless of revision reset;
  if sameExactTarget(lastPersistedExactTargetRef.current, target)
     and !conflictingPredecessor
     and no same-session authoritative barrier is active
     and no same-post potential save/barrier work is pending
     and !hasRestorationDebt(target.editorIdentity, target.editorEpoch):
    return Promise.resolve();
  require target's identity and epoch equal the full current editable session;
  const key = saveKey(target);
  const existing = queuedSaveByIdentityRevision.get(key);
  if (existing) {
    require sameSnapshot(existing.target.snapshot, target.snapshot);
    existing.modes.add(mode);
    if (syncMode === "hydrate") existing.syncMode = "hydrate"; // hydrate wins exact join
    return existing.promise; // first capture owns endpoint; exact cross-mode caller joins
  }
  const record: SaveQueueRecord = createDeferredRevisionSave({
    target,
    mode,
    requestedPersistence,
    syncMode,
    admissionOrder: ++saveAdmissionSequenceRef.current,
    predecessorBarrierOutcome:
      authoritativeBarrierBySession.get(sessionKey)?.outcome ?? null,
  });
  queuedSaveByIdentityRevision.set(key, record);
  insert before the first record from the same session with a greater revision, otherwise
    append; a new route epoch is admitted after unresolved older-epoch physical work;
  void drainExactRevisionQueue(target.editorIdentity);
  return record.promise;
}

async function runAuthoritativeIdentityBarrier<T>(
  editorIdentity: string,
  editorEpoch: number,
  mode: "read-only" | "potential-write",
  execute: (
    reservedRevision: number,
    userMutationGenerationAtStart: number,
    markPotentialWriteStarted: () => void
  ) => Promise<T>
): Promise<T> {
  require mounted and current route/active identity+epoch equal the captured session;
  sessionKey = stable tuple key(editorIdentity, editorEpoch);
  cancel scheduled timer;
  previousBarrier = authoritativeBarrierBySession.get(sessionKey);
  crossSessionBarrierPredecessors = snapshot every already-admitted barrier for this post from
    another epoch before publishing the new barrier; never discover later barriers after an
    await, because two epochs could then wait on each other's completion;
  capture userMutationGenerationRef without advancing it, then atomically increment
    dirtyRevisionRef, the save/barrier ordering counter, and reserve that value above every
    admitted record;
  barrier = createBarrierState({
    potentialWritePending: mode is potential-write or any captured predecessor barrier carries
      a pending potential-write chain,
    cutoffAdmissionOrder: saveAdmissionSequenceRef.current,
    reservedRevision: dirtyRevisionRef.current,
    userMutationGenerationAtStart: userMutationGenerationRef.current,
  });
  authoritativeBarrierBySession.set(sessionKey, barrier);
  try {
    if previousBarrier:
      await previousBarrier.outcome; // a failed R1 rejects R2; it never dispatches
    await completion of captured crossSessionBarrierPredecessors, ignoring their outcomes;
    sameSessionPredecessors = every queued/in-flight same-session save whose admissionOrder is
      at or before barrier.cutoffAdmissionOrder;
    await every same-session predecessor promise; // current-session failure propagates
    oldSessionPredecessors = every queued/in-flight same-post save from another epoch that can
      physically finish after the authoritative request;
    await oldSessionPredecessor settlement, ignoring its outcome for this new session;
    result = await execute(
      barrier.reservedRevision,
      barrier.userMutationGenerationAtStart,
      markPotentialWriteStarted
    );
    resolve barrier.outcome;
    return result;
  } catch error {
    reject barrier.outcome with original error;
    reject/remove every same-session save admitted after this barrier cutoff;
    throw original error;
  } finally {
    if potential-write transport started:
      settlementGeneration = recordPotentialWriteSettlement(editorIdentity);
      only a successful exact result still owned by this current session accepts that watermark;
      old-session success/failure and current failure leave restoration debt;
    resolve barrier.completion;
    delete the session map entry only when it still equals this barrier;
  }
}

async function drainExactRevisionQueue(editorIdentity: string): Promise<void> {
  if (drainPromiseByIdentityRef.current.has(editorIdentity)) {
    return drainPromiseByIdentityRef.current.get(editorIdentity)!;
  }
  postDrain = (async () => {
    for (;;) {
      nextRecord = first orderedSaveQueue record belonging to this post identity;
      if (!nextRecord) break;
      sessionKey = stable tuple key(nextRecord.target.editorIdentity, nextRecord.target.editorEpoch);
      if nextRecord.predecessorBarrierOutcome:
        await that exact outcome before dispatch; on rejection remove/reject the record and
          continue without transport; // a later R2 map entry cannot erase C's R1 dependency
        clear nextRecord.predecessorBarrierOutcome after success;
        if route transition removed the record while awaiting, continue without transport;
      barrier = authoritativeBarrierBySession.get(sessionKey);
      if barrier and nextRecord.admissionOrder > barrier.cutoffAdmissionOrder:
        await barrier.completion;
        continue; // re-read the current barrier; a chained R2 may now own the session
      wait for completion of older barriers for this post from other epochs, but do not inherit
        their failure into this record;
      remove that exact record from orderedSaveQueue;
      inFlightSaveByIdentityRef.current.set(editorIdentity, record);
      const { editorIdentity, editorEpoch } = record.target;
      potentialWriteStarted = false;
      exactWriteSucceeded = false;
      try {
        const { revision, snapshot } = record.target;
        record.dispatched = true;
        restorationDebtAtDispatch = hasRestorationDebt(editorIdentity, editorEpoch);
        mark potentialWriteStarted immediately before the first physical mutation call;
        const response = record.persistenceKind === "autosave"
          ? normalizeAutosaveResult(await autosavePost(editorIdentity, snapshot.autosavePayload))
          : await persistManualSnapshot(editorIdentity, snapshot, {
              writeMetadata:
                lastPersistedExactTargetRef.current?.snapshot.metadataSignature !==
                  snapshot.metadataSignature
                or restorationDebtAtDispatch,
            });
        const persistedTarget = buildPersistedTargetFromResponse(
          response.post,
          response.savedAt,
          {editorIdentity, revision}
        );
        if mounted/current route/active identity+epoch no longer equal the captured session:
          settle caller without touching current editor state;
        else if exact record target is still the current live revision:
          apply saved response according to record.syncMode and mark current revision;
        else:
          record response-derived baseline only; preserve newer live/history state;
        exactWriteSucceeded = true;
        record.resolve();
      } catch (error) {
        if mounted/current route/active identity+epoch still match:
          set bounded accessible autosave error;
        record.reject(error);
        rejectAndRemoveEveryQueuedSaveDependent(editorIdentity, editorEpoch, error);
        // Failure rejects only dependents from this exact session. A newer epoch remains queued
        // and the post lane restarts so it can persist its own exact bytes.
        break;
      } finally {
        if potentialWriteStarted:
          settlementGeneration = recordPotentialWriteSettlement(editorIdentity);
          if exactWriteSucceeded and the record's exact route session is still current:
            acceptPersistedPotentialWriteWatermark(
              editorIdentity,
              editorEpoch,
              settlementGeneration
            );
        remove its exact-save map key by identity guard;
        delete inFlightSaveByIdentityRef[editorIdentity] only when it still owns record;
      }
    }
  })().finally(() => {
    delete drainPromiseByIdentityRef[editorIdentity] only for this drain;
    if this post still has queued records, queue a fresh drain microtask for this post;
  });
  drainPromiseByIdentityRef.current.set(editorIdentity, postDrain);
  return postDrain;
}

restore/reload callers:
  restoreResult = await runAuthoritativeIdentityBarrier(
    current route identity,
    current route epoch,
    "potential-write",
    async (
    reservedRevision,
    userMutationGenerationAtStart,
    markPotentialWriteStarted
  ) => {
    call markPotentialWriteStarted immediately before restorePostRevision;
    const result = await restorePostRevision(...);
    revalidate response/current route identity;
    install result.post only when userMutationGenerationRef still equals the captured value;
      otherwise record its response-derived persisted baseline and preserve newer live bytes;
    return result;
  });
  preserve existing revision-list upsert/refresh from restoreResult.revision;
  reloadResult = await runAuthoritativeIdentityBarrier(
    current route identity,
    current route epoch,
    "read-only",
    async (
    reservedRevision,
    userMutationGenerationAtStart
  ) => {
    post = await getPostCached(...);
    apply the same identity and user-generation guarded authoritative install;
    return post;
  });
  concurrent reload callers keep their own admitted barrier valid while the route/active/
    mounted identity is unchanged; the shared hydration request generation selects only the
    latest caller allowed to write error/busy UI and never cancels an earlier barrier request;
  await the exact typed barrier result before reporting completion;
  on barrier failure retain the live draft and map the bounded operation error;
  never start the authoritative request outside the queue and never compensate only by
    suppressing an older response after it already wrote;

manual saveDraftInternal:
  target = capture current revision and immutable snapshot before awaiting anything;
  syncMode = normalizePostDraftSyncMode(options?.syncMode);
  await enqueueExactRevisionSave(target, "manual", "draft", syncMode);
  preserve current manual payload, error, cache, toast, and sync-mode behavior;
  guard every success/failure/finally UI write by mounted state plus unchanged current route
    identity and active editor identity;
  resolve/show success only after target.revision is persisted;
  on success apply a full server response only when no newer revision exists;
  otherwise update only the persisted baseline attributable to the captured snapshot;

async function flushLatestAutosave() {
  // This is the real consumer of usePostAutosave.flush. It cancels the timer,
  // but checks an already-admitted authoritative barrier before it can capture any
  // pre-barrier live bytes. It propagates every save/barrier rejection.
  const closeIdentity = active editor identity captured at entry;
  require mounted before any blank-boundary return and after every await;
  if the current committed identity has no editable live draft for closeIdentity:
    return resolved zero-write; // missing/not-found/rejected-load boundary remains closable
  let scheduledFlushConsumed = false;
  try while true:
    require mounted/current route identity/active identity all equal closeIdentity;
    currentBarrier = authoritative record for this exact Close session;
    if currentBarrier exists:
      await currentBarrier.outcome; // current-session failure propagates
      require mounted/current route identity/active identity all still equal closeIdentity;
      // Never capture/enqueue the pre-R live bytes as a Close save. Re-capture only after
      // R has either hydrated its response (no newer edit) or preserved newer C. The
      // first case is now clean/zero-write; the second captures C strictly after R.
      continue;
    stalePotentialWriteBarriers = every same-post, other-epoch barrier whose
      potentialWritePending flag is true;
    if stalePotentialWriteBarriers are non-empty:
      await every completion, ignoring old-session outcomes;
      require mounted/current route identity/active identity all still equal closeIdentity;
      continue; // settlement generation is recorded before completion releases Close
    if !scheduledFlushConsumed:
      scheduledFlushConsumed = true;
      await flushScheduledAutosave();
      require mounted/current route identity/active identity all still equal closeIdentity;
      // If a barrier registered while the admitted save was awaiting, it now owns the
      // cutoff and must be observed at the top before any new capture.
      continue;
    target = capture current revision and immutable snapshot;
    require target.editorIdentity === closeIdentity and current route/active identity both
      still equal closeIdentity;
    predecessors = pending/in-flight save records for target.editorIdentity through
      target.revision; // authoritative union members were handled above
    couldOverwriteTarget = predecessors.some(record =>
      !sameSnapshot(record.target.snapshot, target.snapshot)
    );
    if lastPersistedExactTargetRef.current?.editorIdentity === target.editorIdentity
       and sameSnapshot(lastPersistedExactTargetRef.current.snapshot, target.snapshot)
       and !couldOverwriteTarget
       and !hasRestorationDebt(target.editorIdentity, target.editorEpoch):
      // Initial/post-hydration clean Close has no predecessors and returns here. A same-byte
      // predecessor is awaited for coalescing, but does not require a duplicate write.
      await all predecessor promises;
      require current route/active identity still equal closeIdentity;
      if dirty revision changed while awaiting, restoration debt appeared, or same-post
         potential work remains: continue;
      return;
    // If A can overwrite a reverted clean target with different bytes, reserve the
    // restoration immediately behind A even though derived dirty state is currently false.
    await enqueueExactRevisionSave(target, "close", "autosave");
    if route identity or activeEditorIdentityRef.current no longer equals closeIdentity:
      throw editor_identity_changed;
    if dirtyRevisionRef.current === target.revision: return;
    // A newer edit was captured as a later queue record or is enqueued now.
  catch error:
    if mounted and active identity still equals closeIdentity:
      set retryable autosave/close error to safe ApiClientError text or bounded generic
        "Failed to save latest changes before closing.";
    rethrow the original error; never navigate or silently resolve;
}

local mutation/cache refresh generation:
  increment localMutationEpoch synchronously before dispatching each local save record or
    authoritative barrier request;
  a cacheBus post-detail event observed while any save/barrier is queued or in flight does
    not start a
    force GET whose response can later hydrate the editor;
  suppress that event while restoration debt remains even after the old record was retired;
  each other refresh captures localMutationEpoch and whether a local mutation was pending;
  after GET, reject/defer hydration if the epoch changed, the refresh began across a local
    save/barrier, or a local mutation became active before acceptance;
  a self-originated or generation-stale GET is inert: it does not hydrate and does not set
    remoteUpdatePending, because that flag disables subsequent autosave and is reserved
    for a genuine external update observed outside a local mutation generation;
  base PATCH and metadata PATCH cache events from one manual record therefore cannot race
    or overwrite the final response-derived silent baseline;
  the synchronous detail event emitted inside restorePostRevision is likewise suppressed
    by its active barrier and cannot start a second hydrate race;
  explicit authoritative operations use their pre-request queue barrier rather than
    bypassing this generation gate;
  when an old-epoch read-only reload resolves after same-post A1 is current, its client-level
    cache upsert is followed by one best-effort force revalidation for the current session
    before the old barrier settles; it never hydrates A1 directly and creates no server-write
    debt or loop;
  Publish invokes `saveDraft` and Preview invokes the same manual exact-save lane in silent sync
    mode before their downstream server operation, so late debt or pending old potential work
    cannot publish/preview stale bytes; these calls share queue/debt correctness with Close but
    preserve the existing manual base-plus-metadata endpoint contract;
  Unpublish preserves its prior clean behavior but invokes manual exact-save first when same-post
    potential work or restoration debt exists;
  response-derived opaque baseData rebase may advance the technical ordering revision but
    never userMutationGenerationRef; therefore a predecessor save's server normalization
    cannot masquerade as a post-barrier user edit and prevent a clean authoritative hydrate;

async route/request identity guard:
  every refresh/restore captures routeIdentity, activeEditorIdentity, mounted state and a
    monotonic request generation before awaiting;
  after every await and before every hydration, error, loading, or restoring-state write,
    require mounted and the current route identity still equals the captured identity;
  require a response post id equals that captured route identity;
  a stale post-1 success or failure after post-2 became active settles only its caller and
    cannot install post-1, clear/set post-2 errors/loading, or change refs;
  applyLoadedPost receives an explicit caller-authorized reason/identity; it never infers
    an identity transition solely from mismatching response bytes;
  a blank committed identity after missing/not-found/rejected load owns no live draft,
    reports non-dirty, disables autosave and ignores mutation callbacks; Close/flush resolves
    without capture or transport so the user can leave the error boundary safely;
  publish/unpublish revalidate the captured full session after their final refresh await;
    a stale completion rejects with editor_identity_changed and shell toasts are emitted only
    when the captured editorSessionKey still equals the current session;

background callback:
  identity = activeEditorIdentityRef.current;
  while authoritativeBarrierByIdentity has identity:
    await that barrier.outcome; // propagate failure; never capture pre-barrier bytes
    require route/active/editor-state identity still equals identity;
  target = recapture current revision and immutable snapshot after the active barrier;
  return enqueueExactRevisionSave(target, "background", "autosave");

shell onClose:
  expose a non-null editorSessionKey = stable tuple(current route id-or-null, route epoch)
    from the hook, including missing-id and loading/error boundaries;
  if closeRecord exists for editorSessionKey: return its promise;
  create {sessionKey:editorSessionKey,promise} and disable repeated Close only for that key;
  promise = flushLatestAutosave()
    .then(() => navigate(admin posts path, replace) only if current key still matches)
    .catch(() => only if current key still matches, focus the existing `Retry now`
      button after the bounded alert renders and stay)
    .finally(clear only the identical record; never clear/focus/navigate a newer session);
  a pending A0 record never disables or joins Close B/A1 after a route-session change;
  synchronize the shell's current-session ref with `useLayoutEffect` (commit-synchronous,
    before user interaction); a passive effect leaves a stale-navigation window after paint;

shell revision boundary:
  mount PostRevisionDrawer only when canMutatePost and key it by editorSessionKey;
  a pending A confirmation is destroyed on loading/B/A1 and cannot invoke B with A's
    revision id; no restore callback exists at the blank/rejected-load boundary;

shell -> PostEditorTopBar -> PostEditorHeader:
  thread closePending separately from the existing general saving indicator;
  disable only the Close button while the Close chain is active;
  stamp `aria-busy`, `data-post-editor-close-pending`, and an sr-only
    `Saving latest changes before closing` label without blocking ordinary editing;
~~~

Use current-state refs or a reducer so each new save captures the latest draft exactly
once. A response for revision A must never hydrate over revision B or mark B saved. The
next loop iteration must build its payload from the retained B snapshot, not from A's
server response. Do not resolve immediately merely because a request is active. If the
current request fails, explicit Close observes that same rejection; it does not start
navigation or silently retry without user intent.

`enqueueExactRevisionSave` registers the caller's captured target immediately. The physical
post lane preserves admission order across epochs and ascending revision order inside an
epoch. A higher saved revision never proves a lower snapshot was written. A manual Save for B
may leave a later C edit
dirty, but it cannot resolve, clear B, or show the existing success feedback until B's
exact snapshot has persisted. Concurrent manual/Close waiters for the same target share its
promise identity; a newer C record queues behind B and cannot overtake or satisfy it.

The authoritative target is seeded from the exact snapshot installed into editor state,
not reconstructed from a later render. Snapshot equality permits a zero-write Close only
when no older pending target can subsequently overwrite those bytes. In particular, if
dirty A is in flight and the user reverts to clean authoritative bytes at revision B, B is
registered immediately behind A and Close waits for the restoration write. A naked
`hasUnsavedChanges === false` shortcut is forbidden. The post id plus route epoch is part of
every logical key; late work from a previous session cannot update the next editor, while its
physical same-post write remains ordered before the next session's restoration.

## Error and UX contract

The existing bounded editor error surface owns text and role=alert/aria-live semantics.
Close shows a pending/disabled state but does not disable editing permanently. On
failure, draft, dirty marker, selection, and undo history remain. A retry can be another
Close or the existing save action. Every explicit flush rejection, including an
authoritative barrier failure, first creates the bounded retryable error surface. The
Close rejection then focuses the existing `Retry now` button after render even when no
autosave error existed beforehand; the alert itself does not gain a synthetic tab stop. Navigation
occurs once at most.

## Compatibility

Existing background autosave delay, exact save payloads, admin path helper, cache behavior,
and manual save feedback remain. A first-created byte-exact record fixes its endpoint:
background/Close use the existing autosave endpoint, manual uses the existing PATCH chain,
and a later cross-mode caller joins that record rather than duplicating the write. No route
or payload changes are made. No sync setState effect
workaround or beforeunload change.
The result type addition is internal to the editor hook.

## Direct regression-test shape

This leaf owns the test edits and must cover initial and post-hydration clean immediate
Close with zero writes; a clean edit/revert with no predecessor and zero writes; a clean
revert that queues exact restoration behind a different-byte pending write; identity
transition seeding plus stale-response isolation; late old-identity manual rejection and
unmount isolation; deferred old refresh/restore success and failure after a new route
identity loads; dirty delayed success; active autosave
plus newer edit; active manual-save success/failure observed by Close; shared rejection,
retry success, double Close, unmount during resolution, and scheduled background rejection
without an unhandled promise. For A-in-flight then edit B,
resolve A with observably different server values and assert every B draft byte, dirty
state, selection and undo state survives; assert the next request payload is exactly B
and navigation waits for B. Assert navigation count/order, the Close-only disabled/
aria-busy state, visible error state, and focus on the existing `Retry now` button after
the Close rejection renders. Include a barrier-like flush rejection with
`autosaveError === null` before Close; assert the bounded alert/Retry renders, focus lands
on Retry, the original rejection remains observable, and navigation stays put.

For both transports—autosave POST and the manual PATCH + optional metadata PATCH chain—return
a server response whose normalized title/slug/data/metadata differs from the request. Assert
both the current-revision and newer-revision branches seed the persisted signature from that
response-derived snapshot, never from request bytes; the current branch is clean after
hydration while the newer live draft remains dirty and byte-identical. Give the response a
different normalized document, featured image, and retained base-data sentinel in all four
transport/branch combinations. Revert the newer branch to those exact response bytes and prove
that Close performs zero additional writes.

Also start background save A, edit B, invoke manual Save, and prove the manual promise and
success feedback remain pending after A, the next request is exactly B, and they settle
only after B. Cover A rejection propagation, retry, a C edit made while B waits (B saves;
C stays dirty), and concurrent manual/Close waiters without duplicate B writes. Add a
same-target inverse first-owner case where background autosave creates the record first and
later manual Save plus Close join its one POST, issue zero PATCH requests, and share both
success and rejection. Add a
deterministic post-A contention case: enqueue manual B while A is active, then capture/enqueue
Close/background C before A settles; release A and force both waiters runnable. Assert the
wire order is exactly A→B→C, manual B cannot resolve from C, and each persisted payload is
the captured byte-exact snapshot for its own revision. A, B, and C each use distinct sentinels
for title, slug, full document, featured image, tags, category, and SEO; deep-equal every
production-client payload so no cross-revision field mixing can pass.

Start same-identity save A, admit authoritative restore/reload barrier R while A is active,
and prove the physical request order is A→R; then edit/capture C and prove C remains behind
R, preserves its live bytes while R settles, and becomes the final write before Close can
navigate. Repeat with queued B before R, A/R failure, and no newer edit (R is hydrated and
clean with a zero-write Close). Emit real mocked cacheBus detail
events from manual base/metadata saves, defer their force GET responses past record
removal, and assert neither response hydrates over the final response-derived baseline or
resets selection/history/Undo. Emit the restore detail event too, then perform another
edit and prove autosave remains enabled and persists it; no self-event may leave
remoteUpdatePending set. Separately cover dirty-but-not-yet-admitted A, start R, and Close
while R is pending: Close awaits R before consuming the scheduled flush, recaptures R,
and performs zero post-R write unless a real newer C edit exists.
Invoke manual Save after R admission without a content edit while pre-barrier A remains
active; the barrier's reserved revision/generation must prevent that caller from joining A
or resolving before R. Reject self-triggered base/metadata/restore cache GETs and prove
their stale failure/catch/finally paths are inert with no false editor error. Return a
wrong post identity from both restore and reload and assert the barrier rejects fail-
closed, does not upsert a revision, and does not report success.

Queue a save before reload, let that save emit its synchronous detail-cache event, and prove
the event cannot invalidate the admitted reload generation: reload still dispatches after the
save and both its success and rejection settle through the authoritative barrier. Return a
fully normalized A response with different document, featured image, and opaque baseData,
then resolve R without a user edit; R must hydrate clean and Close must perform zero writes.
During an
identity transition, call clean Close on B before and after late A settles and assert zero
writes both times. Immediately after rerendering route A as B, before B's deferred load
settles, assert the public hook result is blank/loading/non-dirty, mutative callbacks cannot
change A or schedule autosave, and no old A editor bytes are exposed. Make stale-finally
coverage observationally non-vacuous: settle old A's
deferred initial GET while B's GET is still pending and prove B remains loading; likewise
settle old restore A while restore B is still pending and prove B's restoring id remains until
B itself settles, for both old-request success and failure.

Chain two same-identity authoritative barriers R1→R2 and reject R1. R2 must reject from
R1's outcome without dispatching its request, and every post-cutoff dependent save must
reject without transport; no later barrier/save may silently continue after the failed
ordering predecessor.
Make the physical admission order non-vacuous with A already in flight, then R1, a directly
queued manual C record, and R2. After A succeeds, C must still wait for R1's exact outcome;
if R1 fails, neither C nor R2 reaches transport and all three dependent callers receive the
same failure. In the success case settle A, then R1, then the exact C payload, and only then
R2; assert final R2 hydration plus a clean zero-write Close. Also resolve restore R1 then R2
and reload R1 then R2 successfully with deterministic request order; a newer UI request token
must not invalidate the earlier admitted barrier.

Cover an initial cached-null rejected load, missing-id/not-found, and an A→B B-load failure.
Each boundary remains blank/non-dirty, leaves mutation callbacks inert, keeps autosave
disabled, physically disables Preview/Save/Publish/revisions/trash/upload, and resolves
flushLatestAutosave without attempting live-draft capture or transport. Invoke every returned
server callback and prove update/metadata/autosave/publish/unpublish/preview/delete/revision-
list/restore/upload transports remain untouched; Close stays enabled.
Actually activate Close at missing-id and while B's load is deferred: it calls the zero-write
flush boundary and navigates once with no save transport. A retained Close callback captured
from old A must still reject after route/epoch mismatch and must not navigate.
For a failed Close followed by retry, pin the exact document bytes, selected block id, history
object (past/present/future, not only its length), and canUndo before failure and prove all
four remain unchanged through rejection and successful retry. Unmount while the first Close
transport is pending, return a fully normalized response, and assert Close rejects/terminates
at the mounted guard with exactly one transport and no stale capture or re-enqueue.

Start Close for A with its save pending, switch the route to B before A settles, then cover
both late A success and failure. Every post-await save and Close guard must reject the stale
A operation, leave B draft/baseline/error state untouched, and prevent the old Close from
resolving as navigation success.

At shell level keep Close A0 pending, switch to B and then A1, and prove each new session's
Close is immediately enabled and owns a distinct promise. Late A0 success/failure cannot
navigate, focus Retry, or clear B/A1 pending state; only the current session navigates once.
Open A's restore confirmation before switching: loading/B unmounts it, it never returns after
hydration, and zero B restore transports use the stale revision id. Defer the final refresh of
publish/unpublish A, hydrate B, then settle A: both operations reject stale, preserve B, and
emit neither success nor error toast in B.

Add same-post ABA regressions. Start A0 autosave and, separately, A0 restore, navigate
A0→B→A1, and cover both old success and failure. B GET/save and A1 GET/load/edit remain
independent of unresolved A0. A1 physical Save/dirty Close remains undispatched behind A0;
after A0 success or failure it dispatches its exact payload once, and A0 failure cannot reject
or poison A1. A clean A1 Close behind a different-byte A0 write must enqueue an exact
restoration rather than navigate zero-write. Model durable server bytes plus real cache events
and assert the final forced read/cache and current UI contain A1, never late A0. Old A0 may
settle only its callers and cannot leak document/baseline/error/restoring state into A1.
Exercise clean manual Save as a distinct caller while an old-epoch potential write remains
pending: it must not zero-return, must wait settlement, and must own the exact A1 restoration.
Give stale A0 distinct durable tags, category, and SEO and prove the manual restoration always
emits the exact A1 metadata PATCH when settlement debt exists, even though A1's local persisted
metadata signature still matches its clean snapshot. Cover old success and possible partial
failure, and pin the final durable/cache/UI metadata before Publish/Preview may continue.
Directly invoke clean Preview and clean Unpublish with same-post restoration debt. In success,
the downstream preview/unpublish transport remains absent until exact full-envelope restoration
finishes; in restoration failure it remains absent and the existing bounded error contract is
observed. Pin the complete A1 payload in both action families.
Also chain two barriers in A1, navigate through B to A2, and admit an A2 barrier while the
older chain is pending. Prove A2 waits only already-admitted predecessors, never forms a
cross-epoch completion cycle, ignores the stale A1 failure, dispatches exactly once, and
hydrates the authoritative A2 result.
Resolve a stale A0 read-only reload after A1 hydration with a mutable shared-cache mock. Prove
the stale client upsert is immediately revalidated to A1, the A1 UI is never hydrated by the
old response, and no autosave/manual write or console-visible failure is produced.
Defer the A1 GET itself, settle a physical A0 potential write after that GET captured its
generation but before its response is released, then accept the A1 response. Prove its
request-start watermark remains older than the settlement generation and a later clean action
performs exact restoration of durable/cache A1 bytes.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx \
  tests/vitest/ui/post-editor-state-hook-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx \
  tests/vitest/ui/posts-editor-chrome-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx \
  tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx \
  tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx \
  tests/vitest/ui-integration/post-editor-layout-shell.test.tsx
~~~

Re-run a named file alone before declaring a failure.

## Acceptance criteria

- Close cannot outrun an active or newly required autosave.
- Initial/post-hydration clean Close creates no write, but a clean revert cannot outrun an
  older pending write that would replace its bytes.
- Editor identity transitions reset/seed exact-target state and isolate late old responses.
- Only a current route-identity loader can authorize transition; stale refresh/restore
  success, failure, and finally paths cannot switch or mutate the newer editor.
- A same-identity authoritative barrier starts its request only after every already-
  admitted predecessor; newer exact saves stay behind it and Close observes all of them.
- Local save cache events and late GETs cannot reset silent-save history/selection or
  replace the final response-derived baseline.
- An older response cannot overwrite or falsely mark a newer revision saved.
- Flush failure is observable by the shell and prevents navigation.
- Repeated activation yields one save chain and one navigation.

## Completion

Implemented and regression-pinned the exact-revision queue, per-post transport ownership,
route-session epochs, authoritative barriers, settlement generations, exact metadata restoration,
failure-propagating retry, and zero-write clean Close. The final family matrix passed 159/159;
TASK-543-03-L01 and changelog 1255 own the complete full-lane, gate, and live-browser proof.

## Superseded pre-fix evidence

The following result predates the route-session drift finding and is not final completion
evidence. It must be replaced after the identity/epoch remediation is validated.

Implemented the immutable exact-revision save queue, authoritative restore/reload barriers,
identity and mounted guards, failure-propagating Close flush, focused Retry, and coalesced
navigation. The four-file source suite passed 93/93; full validation and the seven-flow live
smoke are summarized in TASK-543-03-L01 and changelog 1255.

## Superseded closure attempt

The evidence below predates the final cross-session drain finding and is not completion proof.

The final implementation isolates work by post plus route epoch, keeps loading/rejected-load
mutation boundaries fail-closed, and makes Close await the newest exact durable snapshot. The
final 13-file family matrix passed 144/144, including the source leaf's route-session, queue,
barrier, loaded-mock, and SSR loading-boundary regressions. TASK-543-03-L01 and changelog 1255
record the full gates and live failure/retry, restoration, and double-Close proof.
