# TASK-543-01-L01: Wait for Dirty Draft and Remain on Failure

# FileName: TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md

**Parent Task:** TASK-543
**Parent Subtask:** TASK-543-01
**Priority:** High
**Category:** Posts Editor / Autosave / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-543-01
**Status:** ⏳ To Do
**Changelog:** 1255 (pinned; create only at implementation closure)

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
- tests/vitest/ui/post-block-editor-shell-wave.test.tsx;
- tests/vitest/ui-integration/post-autosave-flow.test.tsx.

It must not edit API clients/routes, PostsTable.tsx, PostsTable/list test suites, docs,
tasks, or changelog indexes. Add the required compatibility/changed-behavior assertions
before this leaf's source gate; TASK-543-03 may rerun but never edit/rebaseline these files.

## Implementation Pseudocode

~~~ts
// usePostAutosave retains schedule/cancel but flush returns the actual callback promise.
function flush(): Promise<void> {
  cancel debounce timer;
  return invoke current onAutosave callback;
}

// Editor state owns document identity, revision, and request identity for every save path.
const dirtyRevisionRef = useRef(0); // incremented by every draft mutation
type SaveTarget = {
  editorIdentity: string; // stable post id, never inferred from a later render
  revision: number;
  snapshot: PostDraftSnapshot;
};
type QueuedRevisionSave = {
  target: SaveTarget;
  modes: Set<"manual" | "background" | "close">;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};
const activeEditorIdentityRef = useRef<string | null>(null);
const queuedSaveByIdentityRevision = useRef(new Map<string, QueuedRevisionSave>()).current;
const orderedSaveQueue = useRef<QueuedRevisionSave[]>([]).current; // ascending revision
const inFlightSaveRef = useRef<QueuedRevisionSave | null>(null);
const drainPromiseRef = useRef<Promise<void> | null>(null);
const lastPersistedExactTargetRef = useRef<SaveTarget | null>(null);

function saveKey(target: SaveTarget): string {
  return stable tuple key(target.editorIdentity, target.revision);
}

function installAuthoritativePersistedTarget(
  target: SaveTarget,
  reason: "initial-load" | "accepted-hydration" | "identity-transition"
): void {
  require target.snapshot is exactly the snapshot installed as the live draft/baseline;
  require activeEditorIdentityRef.current is null
    or activeEditorIdentityRef.current === target.editorIdentity
    or reason === "identity-transition";
  if (reason === "identity-transition") {
    cancel scheduled timer;
    reject/remove queued records for the previous identity with editor_identity_changed;
    let an already dispatched old request settle, but identity-guard its response/error so
      it cannot mutate the new draft, persisted baseline, error surface, or revision state;
    clear old queue keys and reset dirtyRevisionRef for the new identity;
  } else {
    require no newer dirty/pending target is being overwritten by this hydration;
  }
  activeEditorIdentityRef.current = target.editorIdentity;
  dirtyRevisionRef.current = target.revision;
  lastPersistedExactTargetRef.current = target;
}

initial load and every accepted authoritative hydrate:
  build the immutable installed snapshot and revision for the active post;
  call installAuthoritativePersistedTarget after installing that same snapshot;

post-id/editor-identity transition:
  call installAuthoritativePersistedTarget with reason "identity-transition";
  never reuse a revision-only queue key or persisted target from the previous post;

function enqueueExactRevisionSave(
  target: SaveTarget,
  mode: "manual" | "background" | "close"
): Promise<void> {
  if (sameExactTarget(lastPersistedExactTargetRef.current, target)) return Promise.resolve();
  require target.editorIdentity === activeEditorIdentityRef.current;
  const key = saveKey(target);
  const existing = queuedSaveByIdentityRevision.get(key);
  if (existing) {
    require sameSnapshot(existing.target.snapshot, target.snapshot);
    existing.modes.add(mode);
    return existing.promise; // identical target joins one exact write
  }
  // Register immediately, even while A is in flight. A later C can never claim a
  // slot ahead of already captured B or satisfy B merely by advancing a counter.
  const record = createDeferredRevisionSave(target, mode);
  queuedSaveByIdentityRevision.set(key, record);
  insertAscendingByRevision(orderedSaveQueue, record);
  void drainExactRevisionQueue();
  return record.promise;
}

async function drainExactRevisionQueue(): Promise<void> {
  if (drainPromiseRef.current) return drainPromiseRef.current;
  drainPromiseRef.current = (async () => {
    while (orderedSaveQueue.length > 0) {
      const record = orderedSaveQueue.shift()!; // oldest exact revision first
      inFlightSaveRef.current = record;
      const { editorIdentity, revision, snapshot } = record.target;
      try {
        // The complete updatePost + optional updatePostMetadata chain consumes
        // only this immutable snapshot and is the record's one promise identity.
        const response = await persistSnapshot(editorIdentity, snapshot);
        if (activeEditorIdentityRef.current !== editorIdentity):
          settle this old identity's caller without touching current editor state;
        else if (dirtyRevisionRef.current === revision):
          applySavedResponseAndMarkCurrentRevision(response, snapshot, revision);
        else:
          recordPersistedBaselineWithoutHydratingLiveDraft(response, snapshot, revision);
          // Preserve every newer field, selection and undo state.
        if (activeEditorIdentityRef.current === editorIdentity):
          lastPersistedExactTargetRef.current = record.target;
          clear bounded autosave error;
        record.resolve();
      } catch (error) {
        if (activeEditorIdentityRef.current === editorIdentity):
          set accessible autosave error from safe mapped message;
        record.reject(error);
        rejectAndRemoveEveryQueuedDependent(editorIdentity, error);
        // Do not silently continue with B/C after A failed. Explicit retry captures
        // and enqueues the still-current exact target again.
        break;
      } finally {
        const key = saveKey(record.target);
        if (queuedSaveByIdentityRevision.get(key) === record):
          queuedSaveByIdentityRevision.delete(key);
        if (inFlightSaveRef.current === record): inFlightSaveRef.current = null;
      }
    }
  })().finally(() => {
    drainPromiseRef.current = null;
    if (orderedSaveQueue.length > 0) void drainExactRevisionQueue();
  });
  return drainPromiseRef.current;
}

manual saveDraftInternal:
  target = capture current revision and immutable snapshot before awaiting anything;
  await enqueueExactRevisionSave(target, "manual");
  preserve current manual payload, error, cache, toast, and sync-mode behavior;
  resolve/show success only after target.revision is persisted;
  on success apply a full server response only when no newer revision exists;
  otherwise update only the persisted baseline attributable to the captured snapshot;

async function flushLatestAutosave() {
  cancel scheduled timer;
  while true:
    target = capture current revision and immutable snapshot;
    require target.editorIdentity === activeEditorIdentityRef.current;
    predecessors = pending/in-flight records for target.editorIdentity through target.revision;
    couldOverwriteTarget = predecessors.some(record =>
      !sameSnapshot(record.target.snapshot, target.snapshot)
    );
    if lastPersistedExactTargetRef.current?.editorIdentity === target.editorIdentity
       and sameSnapshot(lastPersistedExactTargetRef.current.snapshot, target.snapshot)
       and !couldOverwriteTarget:
      // Initial/post-hydration clean Close has no predecessors and returns here. A same-byte
      // predecessor is awaited for coalescing, but does not require a duplicate write.
      await all predecessor promises;
      if active identity or dirty revision changed while awaiting: continue;
      return;
    // If A can overwrite a reverted clean target with different bytes, reserve the
    // restoration immediately behind A even though derived dirty state is currently false.
    await enqueueExactRevisionSave(target, "close");
    if activeEditorIdentityRef.current !== target.editorIdentity:
      throw editor_identity_changed;
    if dirtyRevisionRef.current === target.revision: return;
    // A newer edit was captured as a later queue record or is enqueued now.
}

background callback:
  target = capture current revision and immutable snapshot;
  void enqueueExactRevisionSave(target, "background").catch(() => {
    // error is already visible; prevent unhandled rejection only here
  });

shell onClose:
  if closePromise exists: return closePromise;
  set closing true and disable repeated Close;
  closePromise = flushLatestAutosave()
    .then(() => navigate(admin posts path, replace))
    .catch(() => focus/announce existing save error and stay)
    .finally(identity guard clears closePromise and closing state if still mounted);

shell -> PostEditorTopBar -> PostEditorHeader:
  thread closePending separately from the existing general saving indicator;
  disable only the Close button while the Close chain is active;
  expose aria-busy and pending accessible text without blocking ordinary editing;
~~~

Use current-state refs or a reducer so each new save captures the latest draft exactly
once. A response for revision A must never hydrate over revision B or mark B saved. The
next loop iteration must build its payload from the retained B snapshot, not from A's
server response. Do not resolve immediately merely because a request is active. If the
current request fails, explicit Close observes that same rejection; it does not start
navigation or silently retry without user intent.

`enqueueExactRevisionSave` registers the caller's captured target immediately and the
drain persists records in ascending revision order. A higher saved revision never proves a
lower snapshot was written. A manual Save for B may leave a later C edit
dirty, but it cannot resolve, clear B, or show the existing success feedback until B's
exact snapshot has persisted. Concurrent manual/Close waiters for the same target share its
promise identity; a newer C record queues behind B and cannot overtake or satisfy it.

The authoritative target is seeded from the exact snapshot installed into editor state,
not reconstructed from a later render. Snapshot equality permits a zero-write Close only
when no older pending target can subsequently overwrite those bytes. In particular, if
dirty A is in flight and the user reverts to clean authoritative bytes at revision B, B is
registered immediately behind A and Close waits for the restoration write. A naked
`hasUnsavedChanges === false` shortcut is forbidden. A post identity is part of every key;
late work from a previous identity cannot update the next editor.

## Error and UX contract

The existing bounded editor error surface owns text and role=alert/aria-live semantics.
Close shows a pending/disabled state but does not disable editing permanently. On
failure, draft, dirty marker, selection, and undo history remain. A retry can be another
Close or the existing save action. Navigation occurs once at most.

## Compatibility

Existing background autosave delay, save payload, admin path helper, cache behavior, and
manual save semantics remain. Manual and autosave writes share only request/revision
identity; they do not change endpoint or payload behavior. No sync setState effect
workaround or beforeunload change.
The result type addition is internal to the editor hook.

## Direct regression-test shape

This leaf owns the test edits and must cover initial and post-hydration clean immediate
Close with zero writes; a clean edit/revert with no predecessor and zero writes; a clean
revert that queues exact restoration behind a different-byte pending write; identity
transition seeding plus stale-response isolation; dirty delayed success; active autosave
plus newer edit; active manual-save success/failure observed by Close; shared rejection,
retry success, double Close, unmount during resolution, and scheduled background rejection
without an unhandled promise. For A-in-flight then edit B,
resolve A with observably different server values and assert every B draft byte, dirty
state, selection and undo state survives; assert the next request payload is exactly B
and navigation waits for B. Assert navigation count/order, the Close-only disabled/
aria-busy state, and visible error state.

Also start background save A, edit B, invoke manual Save, and prove the manual promise and
success feedback remain pending after A, the next request is exactly B, and they settle
only after B. Cover A rejection propagation, retry, a C edit made while B waits (B saves;
C stays dirty), and concurrent manual/Close waiters without duplicate B writes. Add a
deterministic post-A contention case: enqueue manual B while A is active, then capture/enqueue
Close/background C before A settles; release A and force both waiters runnable. Assert the
wire order is exactly A→B→C, manual B cannot resolve from C, and each persisted payload is
the captured byte-exact snapshot for its own revision.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx
~~~

Re-run a named file alone before declaring a failure.

## Acceptance criteria

- Close cannot outrun an active or newly required autosave.
- Initial/post-hydration clean Close creates no write, but a clean revert cannot outrun an
  older pending write that would replace its bytes.
- Editor identity transitions reset/seed exact-target state and isolate late old responses.
- An older response cannot overwrite or falsely mark a newer revision saved.
- Flush failure is observable by the shell and prevents navigation.
- Repeated activation yields one save chain and one navigation.
