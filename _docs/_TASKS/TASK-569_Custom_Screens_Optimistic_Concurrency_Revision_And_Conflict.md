# TASK-569: Custom Screens Optimistic Concurrency Revision And Conflict

**Status:** ⏳ To Do
**Started:**
**Completed:**
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

- Add a monotonic `revision` column (migration + snapshot + journal).
- Require `expectedRevision` in PATCH (schema + reject-unknown allowlist entry);
  conditional `UPDATE ... WHERE id = ? AND revision = ?`; zero returned rows map
  to `custom_screen_conflict` / HTTP 409 via `mapCustomScreenError`.
- Client sends the loaded revision; on a real 409 keep the local draft and show
  a conflict message (the existing UI guard path becomes live).
- Fix N2: drop the pre-lock observed read; validate against the locked row.
- Add a two-concurrent-PATCH DB race test + a UI test that a real 409 preserves
  the local draft.

## Fix Strategy

```ts
// migration: ALTER TABLE custom_screens ADD COLUMN revision bigint NOT NULL DEFAULT 1;
// service update:
const updated = await tx.update(customScreens)
  .set({ definition, updatedAt, revision: sql`revision + 1` })
  .where(and(eq(customScreens.id, id), eq(customScreens.revision, expectedRevision)))
  .returning({ id: customScreens.id });
if (updated.length === 0) throw new CustomScreenConflictError();
```

## Security Contract

- Endpoint unchanged: `internal` admin, existing RBAC (`custom_screens:write`).
- `expectedRevision` joins the reject-unknown allowlist with a round-trip
  persistence test.
- 409 payload is sanitized (code only, no internals).

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest UI suite (409 preserves draft) + service unit tests.
- DB race test when `DATABASE_URL` available (two concurrent PATCHes, one 409).

## Notes

- H-540-01 is data-loss risk in admin authored content; blocks treating
  TASK-540 as fully closed.
