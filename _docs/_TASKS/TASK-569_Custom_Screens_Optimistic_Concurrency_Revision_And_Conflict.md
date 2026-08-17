# TASK-569: Custom Screens Optimistic Concurrency Revision And Conflict

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1291 (pinned)
**Priority:** High
**Size:** Large

# FileName: TASK-569_Custom_Screens_Optimistic_Concurrency_Revision_And_Conflict.md

**Parent Task:** none
**Source Findings:** H-540-01 + N2 (audit `_TMP-audit-task-540-custom-screens.md`, verified at HEAD `4e3dab15`)

## Purpose

Two concurrent admin PATCHes to the same Custom Screen definition silently
last-writer-wins: the `FOR UPDATE` lock serializes each write but the second
request unconditionally writes its full stale document, so the first writer's
changes disappear with no conflict. The whole authored Screen definition (large
JSON document) can be lost. The UI already simulates a 409
(`custom_screen_conflict`) that the backend never produces, so the UI guard is
dead code against the real API.

**Scope boundary for `expectedRevision`:** only the definition-bearing editor
save path requires `expectedRevision`. Non-editor PATCH callers that change only
`status`/`name`/`showInSidebar` without a definition — the list page status
toggle and bulk actions (`CustomScreenListPage.tsx:223,272`) and the assistant
executor (`actionExecutorService.ts:1442,4197,4283`) — do NOT send a revision
and must keep working. The conditional revision check applies only when the
payload carries a `definition` (or when `expectedRevision` is present).

## Evidence

- `core/services/customScreens/customScreenService.ts:262-335` — `FOR UPDATE`
  at `:273-277` but unconditional `UPDATE ... WHERE id` at `:317-335`, no
  version precondition.
- Table `core/db/tables/customScreens.ts:21-50` — only `updatedAt`, no
  monotonic revision.
- PATCH schema `core/services/customScreens/customScreenJsonSchemas.ts:569-596`
  — no `expectedRevision`/`expectedUpdatedAt`, `additionalProperties: false`.
- Client `core/admin/services/customScreensClient.ts:618-640` — full-body PATCH,
  cache broadcast only after success.
- Editor guard `core/admin/ui/custom-screens/hooks/useCustomScreenEditorPersistence.ts:413-427,530-539`
  — event-only guard.
- UI tests simulate 409 at
  `tests/vitest/ui/custom-screen-editor-hydration-authority.test.tsx:317,476`
  while `core/server/routes/customScreenRoutes.ts:38-82,121-128` never produces
  or maps `custom_screen_conflict`.
- N2: pre-lock observed read in `updateCustomScreen` (`customScreenService.ts:266-281`)
  can throw spurious `custom_screen_invalid` 400 when a concurrent writer changed
  `contentTypeId` and this request omitted it (admin-visible, not TASK-9999).

## Scope

- Add a monotonic `revision` column (migration + snapshot + journal; next free
  migration number pinned at allocation time, currently `0073`).
- PATCH schema: optional `expectedRevision` (reject-unknown allowlist entry +
  round-trip persistence test). Required semantics: when the payload includes
  `definition`, `expectedRevision` MUST be present and the conditional
  `UPDATE ... WHERE id = ? AND revision = ?` applies; zero returned rows map to
  `custom_screen_conflict` / HTTP 409 via `mapCustomScreenError`. Non-definition
  metadata PATCHes (status/name/showInSidebar) proceed without the revision
  check (existing list-page and assistant callers stay unchanged).
- Server response: add `revision` to `CustomScreenRecord`/`mapRow`
  (`customScreenService.ts:124-127`) and to the client record type so every
  editor save sends the freshly returned revision (otherwise the second save
  conflicts by design). Stale browser-cache records without `revision` must be
  revalidated before a definition save (client treats missing revision as
  needs-reload, not a hard 400).
- Lock reorder for N2: drop the pre-lock observed read
  (`customScreenService.ts:266`); lock the screen row FIRST (`FOR UPDATE`),
  then resolve `contentTypeId` from the locked row before
  `lockContentTypeContext` (`:272`), so concurrent `contentTypeId` changes can
  never cause a spurious `custom_screen_invalid` 400.
- Client sends the loaded revision; on a real 409 keep the local draft and show
  a conflict message (the existing UI guard path becomes live).
- Add a two-concurrent-PATCH DB race test + a UI test that a real 409 preserves
  the local draft.

## Fix Strategy

```ts
// migration (next free number): ALTER TABLE custom_screens ADD COLUMN revision bigint NOT NULL DEFAULT 1;
// service update (definition-bearing path only):
const [locked] = await tx.select({ id, contentTypeId, revision })
  .from(customScreens).where(eq(customScreens.id, id)).for("update");
if (!locked) throw new Error("custom_screen_not_found");
if (input.definition !== undefined) {
  if (input.expectedRevision == null) throw new Error("custom_screen_revision_required");
  await lockContentTypeContext(tx, locked.contentTypeId); // AFTER row lock
  const updated = await tx.update(customScreens)
    .set({ definition, updatedAt, revision: sql`revision + 1` })
    .where(and(eq(customScreens.id, id), eq(customScreens.revision, input.expectedRevision)))
    .returning({ id: customScreens.id, revision: customScreens.revision });
  if (updated.length === 0) throw new Error("custom_screen_conflict");
}
// non-definition metadata PATCH: plain UPDATE without the revision precondition
```

`mapCustomScreenError` gains `custom_screen_conflict` → `ApiError(409)` and
`custom_screen_revision_required` → `ApiError(400)` (message-string convention;
no new error class needed). The route maps them via the existing
`mapCustomScreenError` boundary (`core/server/routes/customScreenRoutes.ts`).

## Security Contract

- Endpoint unchanged: `internal` admin; the route uses `content:write`
  (`customScreenRoutes.ts:114,121,143,164`) — there is no `custom_screens:write`
  permission in the repo, correct the RBAC reference accordingly.
- `expectedRevision` joins the reject-unknown allowlist with a round-trip
  persistence test.
- 409 payload is sanitized (code only, no internals).

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest UI suite (409 preserves draft) + service unit tests + a regression that
  non-definition metadata PATCH (status/name) still succeeds without
  `expectedRevision` (list-page + assistant caller shapes).
- Vitest client test: response `revision` is stored and sent on the next save;
  stale cache without `revision` triggers revalidation, not a hard 400.
- DB race test when `DATABASE_URL` available (two concurrent PATCHes, one 409).
- `map*Error` coverage for `custom_screen_conflict` (409) and
  `custom_screen_revision_required` (400) in the route suite.

## Notes

- H-540-01 is data-loss risk in admin authored content; blocks treating
  TASK-540 as fully closed.
