# TASK-569: Custom Screens Optimistic Concurrency Revision And Conflict

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1291
**Priority:** High
**Size:** Large

# FileName: TASK-569_Custom_Screens_Optimistic_Concurrency_Revision_And_Conflict.md

**Parent Task:** none
**Source Findings:** H-540-01 + N2 (docs-only finding from the 2026-08-17 TASK-560 audit sweep; audit reports removed by owner 2026-08-18, evidence re-anchored at HEAD `6ca20b38`)

## Purpose

Two concurrent admin PATCHes to the same Custom Screen definition silently
last-writer-wins: the `FOR UPDATE` lock serializes each write but the second
request unconditionally writes its full stale document, so the first writer's
changes disappear with no conflict. The whole authored Screen definition (large
JSON document) can be lost. The UI already simulates a 409
(`custom_screen_conflict`) that the backend never produces, so the UI guard is
dead code against the real API.

**Scope boundary for `expectedRevision`:** the conditional revision check
applies when the payload carries a `definition` (or when `expectedRevision` is
present). Definition-free PATCH callers that change only
`status`/`name`/`showInSidebar`/`collectionRole`/`compositionKey`/`sidebarLabel`
without a definition proceed WITHOUT `expectedRevision` (no revision
precondition on the UPDATE). The list page status toggle and bulk actions
(`CustomScreenListPage.tsx:223,272`) and the assistant custom-screen.update
patch action (`actionExecutorService.ts:4280-4290`, sends no definition) are
revision-free and keep working.

The assistant custom-screen DEFINITION actions are definition-bearing and MUST
send `expectedRevision: existing.revision` (both call sites hold `existing`
from `deps.getCustomScreen`, which carries `revision` after the server record
change):

- `actionExecutorService.ts:1437-1442` — `resolveNext(currentDefinition)`
  produces `{ definition: nextDefinition }` (non-null after the `:1438` guard);
  pass `expectedRevision: existing.revision` alongside.
- `actionExecutorService.ts:4196-4206` — upsert update sends
  `definition: action.input.definition`, which is REQUIRED on the upsert action
  (`core/services/assistant/actionPlanTypes.ts:387-401`); pass
  `expectedRevision: existing.revision` alongside.

A regression test must cover the assistant definition-action shape (section/block
add/patch/move/remove, binding set, list-view patch, upsert update) sending the
revision, plus a plain `{ status }` PATCH succeeding without one.

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
  then resolve the content type id from BOTH branches — when
  `input.contentTypeId` is provided, normalize it and target the new content
  type's context lock + definition normalization; otherwise fall back to the
  locked row's `contentTypeId` — before `lockContentTypeContext` (`:272`), so
  concurrent `contentTypeId` changes can never cause a spurious
  `custom_screen_invalid` 400 and a contentTypeId-changing PATCH validates
  against the new content type.
- Client sends the loaded revision; on a real 409 keep the local draft and show
  a conflict message (the existing UI guard path becomes live).
- Add a two-concurrent-PATCH DB race test + a UI test that a real 409 preserves
  the local draft.

## Fix Strategy

```ts
// migration 0073 (pinned after 0072_backup_schedule_include; re-read the live
// journal immediately before allocation): ALTER TABLE custom_screens ADD COLUMN revision bigint NOT NULL DEFAULT 1;
// service update (definition-bearing path only):
const [locked] = await tx.select({ id, contentTypeId, revision })
  .from(customScreens).where(eq(customScreens.id, id)).for("update");
if (!locked) throw new Error("custom_screen_not_found");
const nextContentTypeId = input.contentTypeId !== undefined
  ? normalizeContentTypeId(input.contentTypeId)   // PATCH changes the content type
  : locked.contentTypeId;                          // fallback to the locked row
if (input.definition !== undefined || input.expectedRevision !== undefined) {
  if (input.expectedRevision == null) throw new Error("custom_screen_revision_required");
  await lockContentTypeContext(tx, nextContentTypeId); // AFTER row lock
  const updated = await tx.update(customScreens)
    .set({ ...definitionFields, contentTypeId: nextContentTypeId, updatedAt, revision: sql`revision + 1` })
    .where(and(eq(customScreens.id, id), eq(customScreens.revision, input.expectedRevision)))
    .returning({ id: customScreens.id, revision: customScreens.revision });
  if (updated.length === 0) throw new Error("custom_screen_conflict");
}
// non-definition metadata PATCH (status/name/showInSidebar/... without
// expectedRevision): plain UPDATE without the revision precondition
```

`mapCustomScreenError` gains `custom_screen_conflict` → `ApiError(409)` and
`custom_screen_revision_required` → `ApiError(400)` (message-string convention;
no new error class needed). The route maps them via the existing
`mapCustomScreenError` boundary (`core/server/routes/customScreenRoutes.ts`).

## Security Contract

- Endpoint unchanged: `internal` admin; the route uses `content:write`
  (`customScreenRoutes.ts:114,121,145,164` — the overrides PATCH is at `:145`) —
  there is no `custom_screens:write`
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
