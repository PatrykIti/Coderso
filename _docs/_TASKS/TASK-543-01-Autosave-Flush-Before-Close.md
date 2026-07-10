# TASK-543-01: Autosave Flush Before Close

# FileName: TASK-543-01-Autosave-Flush-Before-Close.md

**Parent Task:** TASK-543
**Priority:** High
**Category:** Posts Editor / Autosave / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-544 (program land order; no shared source ownership)
**Status:** ⏳ To Do
**Changelog:** 1255 (pinned; create only at implementation closure)

---

## Scope

Turn Close into an awaited save boundary. Coalesce with a running autosave, then save any
newer dirty revision before navigation. Scheduled background saves may present an error
without throwing into the event loop; an explicit Close flush must propagate failure to
the shell so the editor remains open.

## Grounded anchors

- core/admin/ui/posts/editor/hooks/usePostAutosave.ts:11-42 exposes flush/cancel.
- core/admin/ui/posts/editor/hooks/usePostEditorState.ts:587-614 swallows save errors,
  returns while saving, and discards flush.
- core/admin/ui/posts/editor/PostBlockEditorShell.tsx:595-647 navigates immediately from
  Close at :625.

## Leaf

TASK-543-01-L01 is the sole writer of the autosave hook, editor-state hook, editor
shell, the two header components required to expose the Close-only pending state, and
the three directly affected autosave/editor-shell suites. Those changed-behavior tests
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
- Save identity includes the edited post identity. An identity transition cancels queued
  work for the old editor, prevents its late response from mutating the new editor, resets
  revision/queue state, and seeds the new authoritative persisted target.
- Manual Save captures its target before joining an older request and resolves/succeeds
  only after that exact target is persisted; a later edit remains dirty.
- Failure stays in the editor with dirty data and an accessible retryable error.
- Unmount cancels timers but does not falsely report an unfinished save as successful.

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
  tests/vitest/ui/post-block-editor-shell-wave.test.tsx
~~~
