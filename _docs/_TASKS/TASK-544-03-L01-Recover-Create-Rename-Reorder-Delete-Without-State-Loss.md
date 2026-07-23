# TASK-544-03-L01: Recover Create, Rename, Reorder, Delete Without State Loss

# FileName: TASK-544-03-L01-Recover-Create-Rename-Reorder-Delete-Without-State-Loss.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-03
**Priority:** Medium
**Category:** Media Admin UI / Reliability / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-544-03
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope

Introduce a typed pending/error/retry model in MediaLibraryPage and promise-returning
folder callbacks in MediaFolderRail. Each editing form awaits success before dismissing.

## Source and direct-test ownership

This leaf is the sole TASK-544 writer of:

- core/admin/ui/media/MediaLibraryPage.tsx;
- core/admin/ui/media/MediaFolderRail.tsx;
- tests/vitest/ui/media-folder-rail.test.tsx;
- tests/vitest/ui/media-library.test.tsx;
- tests/vitest/mediaUi/mediaLibrary.test.tsx.

It must not edit clients/services/routes, shared UI components, other tests, docs, task
indexes, or changelog files. Stage the five operation failure/retry compatibility cases
in these suites before the source gate; closure reruns them read-only and cannot
rebaseline their state-retention assertions.

## Implementation Pseudocode

~~~ts
type FolderOperation =
  | Readonly<{ kind: "load" }>
  | Readonly<{
      kind: "create";
      name: string;
      parentId: string | null;
      formGeneration: number;
    }>
  | Readonly<{ kind: "rename"; id: string; name: string; formGeneration: number }>
  | Readonly<{ kind: "reorder"; orders: readonly Readonly<MediaFolderReorder>[] }>
  | Readonly<{ kind: "delete"; id: string; name: string }>;

type FolderOperationKind = FolderOperation["kind"];
type FolderOperationTarget =
  | Readonly<{ kind: "load" }>
  | Readonly<{
      kind: "create";
      name: string;
      parentId: string | null;
      formGeneration: number;
    }>
  | Readonly<{ kind: "rename"; folderId: string; name: string; formGeneration: number }>
  | Readonly<{ kind: "reorder"; orders: readonly Readonly<MediaFolderReorder>[] }>
  | Readonly<{ kind: "delete"; folderId: string }>;

type FolderOperationFeedback = Readonly<{
  token: number; // stable identity of the captured failure/retry
  kind: FolderOperationKind;
  target: FolderOperationTarget;
  message: string;
  retry: FolderOperation;
  displayFolderName?: string; // bounded UI copy only; never the retry payload
}>;

type FolderRetryResult = Readonly<{
  ok: boolean;
  token: number;
  kind: FolderOperationKind;
  target: FolderOperationTarget;
}>;

type FolderOperationState = {
  pending: Readonly<{attempt:number; kind:FolderOperationKind}> | null;
  loadPendingGeneration: number | null;
  error: FolderOperationFeedback | null;
};

const FOLDER_OPERATION_MESSAGES = Object.freeze({
  load: "Folders could not be loaded. Retry the request.",
  create: "Folder could not be created. Retry when ready.",
  createConflict: "A folder with this slug already exists. Change the name or retry.",
  rename: "Folder could not be renamed. Retry when ready.",
  reorder: "Folder order could not be saved. Retry the same order.",
  delete: "Folder could not be deleted. Retry when ready.",
}); // every value <= 96 characters

const FOLDER_RETRY_NAMES = Object.freeze({
  load: "Retry loading folders",
  create: "Retry creating folder",
  rename: "Retry renaming folder",
  reorder: "Retry saving folder order",
  // Delete appends the separately bounded displayFolderName below.
  deletePrefix: "Retry deleting ",
});

export function formatFolderOperationError(kind, error): string {
  if kind === "create" && isApiClientError(error) &&
     error.code === "media_folder_slug_conflict": return createConflict;
  return the fixed kind-specific fallback;
  // Never return Error.message/details, response text, SQL, HTML, or stack data.
}

function cloneFolderOperation(input): FolderOperation {
  trim/copy strings and copy formGeneration;
  deep-copy and freeze reorder rows + array;
  freeze the outer operation;
}

function targetFor(operation): FolderOperationTarget {
  return a deep-frozen discriminated target;
  // create/rename include normalized name + formGeneration; rename/delete include id;
  // reorder includes copied rows. sameTarget compares every discriminated field/row.
}

function boundedFolderDisplayName(name): string {
  collapse control/whitespace runs and trim; fit within 48 Unicode code points total,
    replacing the final code point with one ellipsis when truncated;
  // The full normalized name remains only in the frozen retry operation/target.
}

const [folderOperationState, setFolderOperationState] = useState<FolderOperationState>({
  pending: null,
  loadPendingGeneration: null,
  error: null,
});

const mountedRef = useRef(false);
const folderAttemptRef = useRef(0);
const folderPendingRef = useRef<number | null>(null);
const folderErrorTokenRef = useRef(0);
const folderLoadGenerationRef = useRef(0);
const lastSuccessfulMutationAttemptRef = useRef<number | null>(null);
const folderFeedbackRef = useRef<FolderOperationFeedback | null>(null);
const deferredLoadFailureRef = useRef<{
  loadGeneration: number;
  triggeringAttempt: number;
} | null>(null);

useEffect(() => {
  // Required for the StrictMode setup -> cleanup -> setup development cycle.
  mountedRef.current = true;
  return () => {
    mountedRef.current = false;
    folderAttemptRef.current += 1;
    folderLoadGenerationRef.current += 1;
    folderPendingRef.current = null;
    lastSuccessfulMutationAttemptRef.current = null;
    deferredLoadFailureRef.current = null;
    // No setState from cleanup.
  };
}, []);

function isCurrentAttempt(attempt): boolean {
  return mountedRef.current &&
    folderAttemptRef.current === attempt && folderPendingRef.current === attempt;
}

function isCurrentLoad(loadGeneration): boolean {
  return mountedRef.current && folderLoadGenerationRef.current === loadGeneration;
}

function publishFolderFailure(operation, error): FolderOperationFeedback {
  immutableOperation = cloneFolderOperation(operation);
  feedback = deepFreeze({
    token: ++folderErrorTokenRef.current,
    kind: immutableOperation.kind,
    target: targetFor(immutableOperation),
    message: formatFolderOperationError(immutableOperation.kind, error),
    retry: immutableOperation,
    displayFolderName: immutableOperation.kind === "delete"
      ? boundedFolderDisplayName(immutableOperation.name)
      : undefined,
  });
  folderFeedbackRef.current = feedback before setFolderOperationState;
  return feedback;
}

type FolderLoadOrigin =
  | Readonly<{ kind: "mount" }>
  | Readonly<{ kind: "cache"; triggeringAttempt: number | null }>
  | Readonly<{ kind: "retry"; attempt: number; retriedToken: number }>;

async function guardedLoadFolders({ force, origin }): Promise<"applied" | "failed" | "stale"> {
  loadGeneration = ++folderLoadGenerationRef.current;
  setFolderOperationState(current => ({
    ...current,
    loadPendingGeneration: loadGeneration,
  }));
  errorTokenAtStart = folderFeedbackRef.current?.token ?? null;
  try:
    rows = await listMediaFoldersCached({force});
    if !isCurrentLoad(loadGeneration): return "stale";
    setFolders(rows);
    clear feedback only when it is kind:"load" and its token still equals errorTokenAtStart;
    return "applied";
  catch error:
    if !isCurrentLoad(loadGeneration): return "stale";
    if origin.kind === "retry" && isCurrentAttempt(origin.attempt):
      publishFolderFailure({kind:"load"}, error); // every failed Retry gets a new token
    else if origin.kind === "cache" && origin.triggeringAttempt !== null:
      if folderPendingRef.current === origin.triggeringAttempt:
        deferredLoadFailureRef.current = {loadGeneration,
          triggeringAttempt: origin.triggeringAttempt};
      else if folderAttemptRef.current === origin.triggeringAttempt &&
              lastSuccessfulMutationAttemptRef.current === origin.triggeringAttempt &&
              (folderFeedbackRef.current?.token ?? null) === errorTokenAtStart:
        publishFolderFailure({kind:"load"}, error);
      // Otherwise the triggering mutation failed, unmounted, or was superseded: drop it.
    else if folderPendingRef.current === null &&
            (folderFeedbackRef.current?.token ?? null) === errorTokenAtStart &&
            (folderFeedbackRef.current === null || folderFeedbackRef.current.kind === "load"):
      publishFolderFailure({kind:"load"}, error);
    // A background load never replaces visible create/rename/reorder/delete feedback;
    // a load begun before a newer mutation/error also cannot overwrite that feedback.
    return "failed";
  finally:
    if mounted and loadGeneration is still current:
      setFolderOperationState(current =>
        current.loadPendingGeneration === loadGeneration
          ? {...current, loadPendingGeneration:null}
          : current);
    // An older generation settling after a newer forced GET may never clear the newer
    // visible load-busy identity.
}

function flushDeferredLoadFailureAfterSuccess(attempt): void {
  deferred = deferredLoadFailureRef.current;
  if !deferred or deferred.triggeringAttempt !== attempt: return;
  deferredLoadFailureRef.current = null;
  if isCurrentAttempt(attempt) && isCurrentLoad(deferred.loadGeneration):
    publishFolderFailure({kind:"load"}, new Error("media_folders_reconcile_failed"));
}

async function runFolderOperation(rawOperation, retryToken?: number): Promise<boolean> {
  operation = cloneFolderOperation(rawOperation);
  if retryToken is present:
    capturedFeedback = folderFeedbackRef.current;
    if !capturedFeedback or capturedFeedback.token !== retryToken or
       !sameFolderOperation(capturedFeedback.retry, operation): return false;
    // Validate stale Retry synchronously before acquiring pending. No stale-token
    // branch may run after folderPendingRef/React pending has been written.
  if folderPendingRef.current !== null: return false; // serialize user operations
  attempt = ++folderAttemptRef.current;
  folderPendingRef.current = attempt;
  guarded set pending {attempt,kind};
  synchronously clear the currently captured feedback before this explicit user attempt,
    recording its token; later completion may never clear feedback with a newer token;
  succeeded = false;
  try:
    switch operation.kind:
      load -> result = await guardedLoadFolders({
                force:true,
                origin:{kind:"retry",attempt,retriedToken:retryToken},
              });
              succeeded = result === "applied" && isCurrentAttempt(attempt);
      create -> created = await createMediaFolder(payload);
                if !isCurrentAttempt(attempt): return false;
                idempotent upsert returned created row into folders;
                succeeded = true;
      rename -> updated = await updateMediaFolder(payload);
                if !isCurrentAttempt(attempt): return false;
                replace the matching row by id with returned updated row;
                succeeded = true;
      reorder -> await reorderMediaFolders(payload);
                 if !isCurrentAttempt(attempt): return false;
                 apply copied orderIndex rows and parentId only when present;
                 succeeded = true;
      delete -> await deleteMediaFolder(id);
                if !isCurrentAttempt(attempt): return false;
                remove id and set each direct child's parentId to null;
                setActiveFolderId(current => current === id ? null : current);
                setMediaFilterState(current => current.folderId === id
                  ? {...current, folderId:null} : current);
                succeeded = true;
    if succeeded && operation.kind !== "load":
      lastSuccessfulMutationAttemptRef.current = attempt;
      flushDeferredLoadFailureAfterSuccess(attempt);
  catch error:
    if isCurrentAttempt(attempt):
      discard a deferred cache failure for this attempt;
      publishFolderFailure(operation, error);
  finally:
    stillCurrent = mountedRef.current && folderAttemptRef.current === attempt &&
      folderPendingRef.current === attempt;
    if stillCurrent: clear only React pending state whose attempt equals attempt;
    if folderPendingRef.current === attempt: folderPendingRef.current = null;
  return succeeded && mountedRef.current && folderAttemptRef.current === attempt;
}

rail props:
  onCreateFolder(name,parentId,formGeneration): Promise<boolean>;
  onRenameFolder(id,name,formGeneration): Promise<boolean>;
  onDeleteFolder(...): Promise<boolean>;
  onReorder(...): Promise<boolean>;
  folderError: FolderOperationFeedback | null;
  pendingKind = operation pending kind when present, otherwise
    loadPendingGeneration !== null ? "load" : null;
  onRetry(errorToken): Promise<FolderRetryResult | null>;

async function onRetry(errorToken): Promise<FolderRetryResult | null> {
  captured = folderFeedbackRef.current;
  if !captured or captured.token !== errorToken: return null;
  ok = await runFolderOperation(captured.retry, captured.token);
  return {ok, token:captured.token, kind:captured.kind, target:captured.target};
  // A repeated failure has already published a new token; this result retains the
  // captured token and returns ok:false.
}

async submitCreate(event):
  prevent default; validate trimmed draft;
  capture createFormGeneration + normalized draft target in synchronous refs;
  if await onCreateFolder(...captured target) and the current generation/draft/parent
     still exactly match that target:
    clear newName and close form;
  else:
    retain draft/form/focus target;

async submitRename(...):
  capture renameFormGeneration + folder id + normalized draft in synchronous refs;
  if await onRenameFolder(...captured target) and current generation/id/draft still match:
    clear draft and close;
  else retain both;

async retryVisibleError():
  captured = folderError;
  result = await onRetry(captured.token);
  if result?.ok && result.token === captured.token && result.kind === captured.kind &&
     sameTarget(result.target,captured.target) && current form generation/id/draft still match:
    close/clear only that matching create or rename form;

async move/delete:
  await callback;
  on failure preserve selection and current derived order;
  apply no optimistic mutation before success.

render error:
  role="alert" + aria-live, fixed bounded text, operation-specific Retry button;
  expose only bounded internal-admin observability through literal attributes:
    alert `data-folder-error-token` + `data-folder-error-kind`, with the bounded copy in
      a `data-folder-error-message` descendant;
    Retry button `data-folder-retry-token`, `data-folder-retry-kind`,
      `data-folder-retry-name`, `data-folder-retry-target-id`,
      `data-folder-retry-parent-id`, and `data-folder-retry-form-generation`;
    create/rename form `data-folder-form-kind`, `data-folder-form-generation`,
      `data-folder-form-target-id`, and `data-folder-form-parent-id`;
  omit inapplicable attributes instead of serializing `undefined`; values are folder/form
    identity already visible to the authenticated media editor, never credentials or raw errors;
  load/create/rename/reorder use the exact FOLDER_RETRY_NAMES value;
  delete retry label is `Retry deleting <bounded displayFolderName>` and is explicit
  confirmation; use max-w-full/min-w-0/break-words so it cannot overflow;
  do not replace the folder tree or steal focus unexpectedly.

row actions:
  MediaLibraryPage root exposes `data-media-filter-folder-id`; rail root exposes
    `data-media-folder-rail` + `data-active-folder-id`; each folder row exposes
    `data-media-folder-id`, `data-media-folder-name`, present-only
    `data-media-folder-parent-id`, and semantic
    `aria-current`; its action wrapper exposes `data-media-folder-actions`;
  these internal-admin attributes mirror already-rendered folder/filter identity only and
    make browser geometry/state reads deterministic without a debug global or JSON payload;
  exact visibility contract includes `group-focus-within:inline-flex`,
  `max-lg:inline-flex`, `[@media(hover:none)]:inline-flex`, and
  `[@media(pointer:coarse)]:inline-flex` in addition to wide pointer hover;
  disable duplicate actions while pending and set aria-busy on the rail;

cacheBus/mount:
  mount uses origin:{kind:"mount"}; manual Retry uses origin:{kind:"retry",...};
  cache event synchronously captures triggeringAttempt=folderPendingRef.current before it
    starts origin:{kind:"cache",triggeringAttempt} without taking mutation pending;
  guarded load publishes its own generation-scoped load-pending state before awaiting, so
    retained rows stay visible while the rail exposes aria-busy/disabled actions; mutation
    pending wins the displayed kind when both identities overlap;
  because clients broadcast after durable mutation but before returning to this page, a
    matching cache failure is deferred; guarded local mutation success lands first, then
    the failure becomes a new load Retry. Mutation failure/staleness discards it;
  a stale load cannot set rows/error or clear a newer operation.
~~~

Use operation-attempt, load-generation, error-token, pending, and mounted guards before
every async folders/error/pending/selection write. The unmount cleanup invalidates both
generations and is StrictMode-safe without calling setState. `attempt` names pending
execution identity; `token` names only captured failure/retry identity. Avoid synchronous
setState effects; state changes belong to events, subscriptions, and async result
boundaries. Retry reuses the immutable normalized payload captured at failure, while
editing/resubmitting the retained input is a separate new operation.
That explicit resubmit consumes the visible captured failure before it starts; its success
therefore leaves no stale old alert, while a newer cache/reconciliation failure remains
visible because completion never clears by kind alone.

The live smoke on 2026-07-12 caught the missing cache-revalidation busy write: an exact
latched forced GET was active while the rail still exposed `aria-busy="false"`. The
generation-scoped load-pending state and deferred cross-tab/stale-generation regressions are
part of this leaf's implementation contract; do not weaken the smoke to hide the drift.

## Error and compatibility contract

No raw server/DB message, details, HTML, SQL, constraint token, or stack is rendered.
Existing cacheBus refresh remains the authoritative background reconciliation; idempotent
local updates from successful mutation responses make success visible even if the following
forced GET fails. That GET exposes a separate load Retry. Failed mutations do not clear
cache, drafts, order, or selection. Delete success keeps the rail, Filters panel, badge, and
grid consistent by conditionally clearing both folder-filter state owners. The bounded
delete display label is presentation-only; the full frozen id/name payload is retried.
The current callback contract changes only inside these two co-owned UI files; external
client service signatures remain.

## Direct regression-test shape

This leaf owns the test edits. For load/create/rename/reorder/delete, defer and reject the
promise, assert visible error/pending state and retained exact draft/selection/order, then
retry and resolve. Also reject a load Retry twice and prove each rejection publishes a fresh
token and visible fixed load Retry before the next success. Assert duplicate activation
blocked; invoke `onRetry` with a stale token and prove it writes neither pending ref nor pending
UI. Assert unrelated later error not cleared by stale completion, stale/unmounted completions
return no success, and StrictMode setup-cleanup-setup still permits the current mount to write.
Edit a retained create/rename draft and submit it as a fresh operation; prove the old captured
alert is consumed, success closes only the matching current form, and a newer feedback token
is never cleared by that completion.

The named cross-tab regression must defer the external cacheBus GET before it settles. While
that exact request is held, assert the last-good tree is byte-identical, rail
`aria-busy="true"`, and one retained-row mutation action disabled; programmatically attempting
that disabled action yields zero mutation requests and does not take `folderPendingRef`.
Reject the deferred GET, then assert busy clears while the last-good tree and fixed load Retry
remain. A separate named overlapping-generation regression starts load generation 2, settles
older generation 1 first, and proves generation 1 cannot clear busy or write rows; only
generation 2 settlement clears busy and installs current rows.

Drive the real synchronous ordering where a successful mutation client broadcasts before its
promise returns: fail that forced GET, prove the returned mutation row/order/delete result is
applied locally first, then prove a separate load Retry appears and never replays the mutation.
Cover cache-event/load overlap and mutation-failure discard of deferred reconciliation errors.
For delete, assert failure preserves both `activeFolderId` and
`mediaFilterState.folderId`; success clears each only when it still equals the deleted id and
keeps rail/panel/badge/grid aligned.

Feed HTML-like, SQL/constraint, stack, and oversized error messages and prove only fixed copy
renders. Feed an oversized/control-character folder name and prove the immutable Retry retains
the full normalized payload while the delete label is capped and does not overflow. Assert
keyboard Tab/Enter/Space reachability, focus retention, exact narrow plus `(hover: none)` and
`(pointer: coarse)` action-visibility selectors (including wide coarse-pointer), `aria-busy`,
disabled duplicate controls, and the exact `FOLDER_RETRY_NAMES`/bounded-delete Retry labels.
Assert the literal bounded observability attributes above mirror current state, omit
inapplicable values, and never contain raw error text/details; browser smoke must read these
attributes through DOM locators rather than a page-side debug/evidence object.
Edit or cancel/reopen a
create/rename form while a request resolves and prove success closes only when token, kind,
target, formGeneration, current id, and normalized draft all match. Initial delete cancel
performs no request; explicit delete Retry performs the immutable delete without a second
generic confirmation.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/media-folder-rail.test.tsx \
  tests/vitest/ui/media-library.test.tsx \
  tests/vitest/mediaUi/mediaLibrary.test.tsx
~~~

Re-run a named file alone before declaring a failure.

## Acceptance criteria

- No folder promise rejection is swallowed.
- Create/rename drafts close only on success.
- Every operation has a visible retry path and preserves user state on failure.
- Stale load/operation completions and unmounts perform no state write.
- Repeated load Retry failures remain visible under fresh tokens; mutation and reconciliation
  failures are never confused or replayed.
- Successful create/rename dismissal requires complete token/kind/target/form-generation and
  current-draft identity; delete keeps both folder-filter state owners consistent.
- Prototype active-row tokens and the 200px wide rail geometry remain unchanged; the compact
  alert does not overflow the narrow layout.

## Completion evidence

Implemented and verified exactly as contracted, including retained drafts/order/selection,
fixed bounded alerts, immutable Retry identity, success-only dismissal, delete filter
consistency, cacheBus reconciliation ordering, keyboard/touch reachability, and guarded
async cancellation. The corrective generation-scoped load-busy state remains visible until
the newest load settles and cannot be cleared by an older completion.
