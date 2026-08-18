# TASK-570: Entries Revision Restore Atomicity And Bounded History

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1292
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
  `FOR UPDATE`, narrow revision read by `revisionId`, validate target (full
  `validateEntryData` + `validateEntryReferences`, not just a shape check),
  snapshot the LOCKED current data, update, cache-invalidate post-commit; no
  snapshot on validation failure. Barrier/deferred-writer test proves no lost
  update and rollback leaves no new revision. Restore re-validates the target
  snapshot exactly like `updateEntry` does today so a stale/non-conforming
  snapshot surfaces `ContentValidationError` instead of persisting.
  Keep the existing no-op short-circuit (`areRevisionSnapshotsEqual` →
  `{ restored: false }` with NO new snapshot), pinned by
  `entryRevisionRestore.test.ts:183-199`. The `actorId`-null snapshot guard
  (`entryService.ts:844`) has NO dedicated test today (all existing
  `restoreEntryRevision` calls pass a real actor) — add a null-actor regression
  test (restore succeeds, no new revision row) to the Validation scope.
- Subtask 02 (M-487-02): keyset-cursor metadata page (id, version, createdAt,
  author; no `data`), bounded page size; narrow `getEntryRevisionData(revisionId)`
  detail read used by restore; cursor no-gap/no-dup + query-shape tests.
  **Admin client + UI migration in scope:** `entriesClient.ts` (`EntryRevision`
  drops `data`; add `getEntryRevisionData`), `useEntryRevisions.ts`
  (on-demand detail fetch for the drawer preview), `EntryRevisionDrawer.tsx`
  (render via the detail read), and `tests/vitest/admin/entriesClientRevisions.test.ts`
  (fixtures no longer carry `data`). Without this the metadata page breaks the
  preview and the client tests.
- **NEW internal endpoint (subtask 02):** `GET
  /content/:type/entries/:id/revisions/:revisionId` — narrow detail read for the
  client's `getEntryRevisionData` (id, version, data, author, timestamps),
  `content:read`, strict params validation, mapped via `mapContentEntryError`.
  The current `contentEntryRoutes.ts:403-415` has only the list route and
  `:417-439` only the restore POST; the detail route is NEW, so the Security
  Contract claim "Endpoints unchanged" must be corrected (list + restore stay
  unchanged, detail is additive).
- Subtask 03 (N3): unique `(entryId, version)` index (migration + snapshot +
  journal; migration number pinned to **0076** after TASK-569 (0073), TASK-564
  (0074) and TASK-571 (0075); re-read the live journal immediately before
  allocation) + bounded retry on conflict; concurrency-safe version allocation.

## Fix Strategy

The restore must run inside the existing `runEntryTransaction` (fence + `FOR
UPDATE` + post-commit cache invalidation seam) and re-use the same validation
`updateEntry` performs. `updateEntryTx` does not exist; extract a tx-scoped
update helper or route through the update path inside the same transaction:

```ts
return runEntryTransaction(async (tx) => {
  await acquireNativeCmsWriterFence(tx);
  const [entry] = await tx.select().from(entries)
    .where(eq(entries.id, entryId)).for("update");
  if (!entry) throw new Error("entry_not_found");
  const [revision] = await tx.select().from(contentRevisions)
    .where(and(eq(contentRevisions.entryId, entryId), eq(contentRevisions.id, revisionId)))
    .limit(1);
  if (!revision) throw new Error("entry_revision_not_found");
  const schema = await getEntryContentTypeWithExecutor(tx, entry.typeId); // tx-scoped loader (entryService.ts:465)
  await validateEntryData(entry.typeId, schema, revision.data); // throws ContentValidationError
  await validateEntryReferences(schema, revision.data, tx);     // throws on broken refs
  if (areRevisionSnapshotsEqual(currentData(entry), revision.data)) {
    return { restored: false }; // no-op: NO new snapshot (pinned by entryRevisionRestore.test.ts:183-199)
  }
  if (userId) await createEntryRevisionTx(tx, entryId, currentData(entry), userId); // snapshot LOCKED current
  await updateEntryDataTx(tx, entryId, revision.data);          // tx-scoped write (no re-validation loop)
});
// NO onCommit hook exists on runEntryTransaction (it is a bare db.transaction
// wrapper, entryService.ts:75,318-320). Use the REAL post-commit seam with its
// real signature: applyEntryPostCommitCache(deps, { changed: true, seoChanged:
// false, cacheRef: {...} }) after the transaction resolves, matching the
// current restoreEntryRevision pattern at entryService.ts:851-859 (with a
// post-commit entry re-read for the cacheRef).
```

If any validation fails before the snapshot write, nothing is persisted and no
snapshot is left behind (the whole transaction rolls back).

## Security Contract

- Endpoints: list `GET .../revisions` and restore `POST .../restore` unchanged
  (`content:read` / `content:write`, `contentEntryRoutes.ts:403-439`); NEW
  detail `GET .../revisions/:revisionId` (subtask 02) is `internal`, requires
  `content:read`, strict params validation, reject-unknown body none (GET),
  mapped via `mapContentEntryError`.
- No new payload fields on existing endpoints; reject-unknown unchanged.
- Errors machine-readable: existing `entry_revision_not_found` (404) kept;
  add `revision_conflict` (409, unique-constraint retry exhaustion) to
  `mapContentEntryError` (`contentEntryRoutes.ts:104`); the mapper name is
  `mapContentEntryError`, not `mapContentError`.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- DB race test with a deferred writer barrier when `DATABASE_URL` available.
- New null-actor regression: `restoreEntryRevision` with `actorId = null`
  succeeds and creates NO new revision row (the `entryService.ts:844` guard);
  assert in `tests/unit/content/entryRevisionRestore.test.ts` alongside the
  existing no-op test at :183-199.
- Bun lane: re-run and update the existing owning suites for the new shape/
  fence — `tests/unit/content/entryRevisionRestore.test.ts` (list results lose
  `.data`/`.length` assumptions), `tests/unit/content/entryService.test.ts`
  (listEntryRevisions), `tests/unit/content/entryServiceFacadeFence.test.ts`
  (add `restoreEntryRevision` to the fence-first regex list). Run each named
  file with `bun tests/unit/content/<file>` (env: `set -a && source .env &&
  set +a` when DB-backed).
- Vitest for cursor pagination + query-shape (list loads no `data` columns) +
  admin client/UI migration (`entriesClientRevisions.test.ts`,
  `useEntryRevisions`, `EntryRevisionDrawer`).
- `map*Error` coverage for `entry_revision_not_found` (404) and
  `revision_conflict` (409) in the route suite.

## Notes

- H-487-01 is a real risk of losing current authored content; blocks treating
  TASK-487 as fully closed.
