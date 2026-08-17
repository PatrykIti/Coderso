# TASK-570: Entries Revision Restore Atomicity And Bounded History

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** High
**Size:** Large

# FileName: TASK-570_Entries_Revision_Restore_Atomicity_And_Bounded_History.md

**Parent Task:** none
**Source Findings:** H-487-01, M-487-02, N3 (audit `_TMP-audit-task-487-entry-revisions.md`, verified at HEAD `4e3dab15`)

## Purpose

`restoreEntryRevision()` is not one atomic operation: it reads entry+type and
the whole revision list outside a transaction, snapshots the current content in
a separate transaction, then overwrites the entry in yet another transaction.
The shared advisory fence does not serialize ordinary writers, so an interleaved
edit can be silently lost (restore reads A → editor writes B → restore snapshots
stale A → restore writes target C; B disappears and the "pre-restore" snapshot
does not reflect what was overwritten). A validation error can also leave an
unnecessary snapshot behind. Separately, the revision list endpoint is unbounded
and loads full JSON payloads.

## Evidence

- `core/services/content/entryService.ts:821-861` (reads `:826-833`, snapshot
  `:843-846`), `:769-805`, `:454-496`; fence
  `core/db/nativeCmsWriterFence.ts:100-108` (`pg_try_advisory_xact_lock_shared`)
  routed via `:232-239`.
- `core/services/content/entryReadService.ts:213-250` — selects ALL revisions
  incl. full `data` jsonb, no limit/cursor; route
  `core/server/routes/contentEntryRoutes.ts:403-413` returns the whole array.
- N3: `content_revisions` has no unique `(entryId, version)`
  (`core/db/tables/content.ts:79-94`); `max(version)+1`
  (`entryService.ts:788-799`) is safe today only because every caller holds the
  entry row `FOR UPDATE`.

## Scope

- Subtask 01 (H-487-01): single `runEntryTransaction` with fence + entry
  `FOR UPDATE`, narrow revision read by `revisionId`, validate target, snapshot
  the LOCKED current data, update, cache-invalidate post-commit; no snapshot on
  validation failure. Barrier/deferred-writer test proves no lost update and
  rollback leaves no new revision.
- Subtask 02 (M-487-02): keyset-cursor metadata page (id, version, createdAt,
  author; no `data`), bounded page size; narrow `getEntryRevisionData(revisionId)`
  detail read used by restore; cursor no-gap/no-dup + query-shape tests.
- Subtask 03 (N3): unique `(entryId, version)` index (migration + snapshot +
  journal) + bounded retry on conflict; concurrency-safe version allocation.

## Fix Strategy

```ts
return runEntryTransaction(async (tx) => {
  await acquireNativeCmsWriterFence(tx);
  const [entry] = await tx.select().from(entries)
    .where(eq(entries.id, entryId)).for("update");
  const revision = await tx.select().from(contentRevisions)
    .where(and(eq(contentRevisions.entryId, entryId), eq(contentRevisions.id, revisionId)))
    .limit(1);
  validateTarget(revision);
  await createEntryRevisionTx(tx, entryId, currentData(entry), userId);
  await updateEntryTx(tx, entryId, revision.data);
  // cache invalidation AFTER commit via onCommit hook
});
```

## Security Contract

- Endpoints unchanged: list requires `content:read`, restore `content:write`
  (`contentEntryRoutes.ts:403-439`).
- No new payload fields; reject-unknown unchanged.
- Errors machine-readable (`revision_not_found`, `revision_conflict`) mapped via
  existing `mapContentError`.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- DB race test with a deferred writer barrier when `DATABASE_URL` available.
- Vitest for cursor pagination + query-shape (list loads no `data` columns).

## Notes

- H-487-01 is a real risk of losing current authored content; blocks treating
  TASK-487 as fully closed.
