# TASK-543-01: Autosave Flush Before Close

# FileName: TASK-543-01-Autosave-Flush-Before-Close.md

**Parent Task:** TASK-543
**Priority:** High
**Category:** Posts Editor / Autosave / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-544 (program land order; no shared source ownership)
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Reopened:** 2026-07-13 — final closure audit found that a global drain blocked unrelated posts, while a naive per-session drain allowed stale same-post overwrites
**Changelog:** 1255

---

## Scope

Turn Close into an awaited save boundary. Coalesce with a running autosave, then save any
newer dirty revision before navigation. Scheduled background saves may present an error
without throwing into the event loop; an explicit Close flush must propagate failure to
the shell so the editor remains open.

## Grounded anchors at task start

- `usePostAutosave.ts` exposes `flush`/`cancel`, but the timer path does not own
  rejection handling and editor state currently discards `flush`.
- `usePostEditorState.ts` uses distinct autosave and manual-save endpoints, swallows
  autosave failures, skips while another save is active, and applies whole stale
  responses over live state.
- `PostBlockEditorShell.tsx` still navigates immediately from Close.

## Leaf

TASK-543-01-L01 is the sole writer of the autosave hook, editor-state hook, editor
shell, the two header components required to expose the Close-only pending state, and
  the four directly affected autosave/editor-state/editor-shell suites. Those changed-behavior tests
land and pass with the source. TASK-543-03-L01 reruns them read-only and owns only
smoke/docs/closure.

## Invariants

- Initial and accepted post-hydration clean Close navigate immediately and create no
  write because the authoritative snapshot seeds the active identity's exact persisted
  target.
- Dirty Close awaits the latest revision, including edits made during an earlier save.
- A draft that reverts to the authoritative bytes while an older different-byte write is
  pending must enqueue that reverted exact target behind the older write; `dirty === false`
  alone never proves Close is safe. With no potentially overwriting predecessor, the same
  byte-identical clean revert requires no write.
- Exactly one registered save promise owns each revision across manual save,
  background autosave, and explicit Close. Captured targets enter one ascending exact-
  revision queue immediately; a newer revision cannot overtake or satisfy an older target,
  and multiple Close activations coalesce.
- Save identity includes both the edited post id and a route-session epoch. An identity
  transition, including A→B→A, cancels queued work for the old session, prevents its late
  response from mutating or blocking the new editor session, resets revision/queue state,
  and seeds the new authoritative persisted target.
- Logical queue keys, revisions, barriers, error ownership, and response guards use the full
  route-session key. Physical drain and in-flight ownership use post identity: different post B
  persists independently of unresolved A0, while same-post A1 waits for A0 settlement and then
  writes its exact newest bytes. An old-session failure settles ordering without rejecting A1.
- Potential-write settlement generation survives removal of the A0 queue/barrier record. A1's
  accepted persisted baseline owns a session watermark; any later same-post save/restore
  settlement creates restoration debt until an exact A1 write succeeds. Zero-write Close and
  pre-Publish/Preview persistence require both byte equality and a current watermark.
- Loading/rejected-load boundaries expose no live mutation authority: Preview, Save,
  Publish, trash, revisions, restore, reload, and upload are disabled/inert while Close
  preserves its zero-write-safe path.
- Only the still-current route loader can authorize an editor identity transition. Stale
  refresh/restore success, failure, and finally paths from the previous route are inert.
- A same-identity authoritative restore/hydration cannot be physically overwritten by an
  older local save. Register restore/reload as an authoritative queue barrier before its
  request starts: admitted predecessors settle first and newly captured saves remain
  behind it. Clean Close observes the barrier and every later exact save.
- Barrier admission reserves the shared revision/generation immediately, so a later no-
  edit manual/Close caller cannot reuse and join a pre-barrier revision.
- Cache refreshes emitted by local saves cannot hydrate over their response-derived
  baseline or reset silent-save selection/history. A refresh started across a local-save
  epoch is stale even when its GET resolves after the queue record is removed, remains
  inert, and cannot leave autosave disabled through `remoteUpdatePending`.
- Self-originated stale GET success, failure, and finally paths are all inert. Restore and
  reload responses with the wrong post identity reject fail-closed instead of settling the
  authoritative barrier or revision list.
- Manual Save captures its target before joining an older request and resolves/succeeds
  only after that exact target is persisted; a later edit remains dirty.
- Failure stays in the editor with dirty data and an accessible retryable error.
- Every explicit Close flush rejection, including an authoritative barrier failure,
  creates the bounded retryable error surface before rethrow so focus can land on the
  existing `Retry now` action without relying on a pre-existing autosave error.
- Late manual/autosave success or failure from another identity or after unmount cannot
  mutate the active error/saving state. Unmount cancels timers but does not falsely report
  an unfinished save as successful.

## Security Contract

No route or permission changes. Existing post save/publish endpoints retain auth, RBAC,
CSRF, admin_write, and strict validation. The UI cannot treat a rejected authorized
write as success and cannot navigate because an error was swallowed.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx \
  tests/vitest/ui/post-editor-state-hook-wave.test.tsx \
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx \
  tests/vitest/ui-integration/post-autosave-flow.test.tsx
~~~

## Superseded pre-fix evidence

The following source-matrix result predates the route-session drift finding and is not final
completion evidence. It must be replaced after the identity/epoch remediation is validated.

The editor now treats Close as an awaited exact-draft persistence boundary. Queue,
authoritative-barrier, route-identity, failure, retry, and unmount behavior passed the final
four-file source matrix (93/93); the family-wide validation and live evidence are recorded in
TASK-543-03-L01 and changelog 1255.

## Superseded closure attempt

The evidence below predates the final cross-session drain finding and is not completion proof.

The final route-session implementation covers stale loader/save/restore/publish work, including
A0→B→A1, while the exact-revision queue and authoritative barriers preserve newest-draft order.
The expanded TASK-543-01 ownership matrix, including the five corrected loaded/SSR boundary
suites, passed inside the final 13-file 144/144 run. Full validation and browser evidence are
recorded by TASK-543-03-L01 and changelog 1255.
