# TASK-468-07: Legacy Removal DB Cleanup Docs And Closure Validation
# FileName: TASK-468-07-Legacy-Removal-DB-Cleanup-Docs-And-Closure-Validation.md

**Parent Task:** TASK-468
**Priority:** High
**Category:** Migration / DB / Docs / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-468-06
**Status:** ⏳ To Do

---

## Overview

Remove the legacy Custom Screens foundation after V4 editor/runtime/assistant
paths are live and validated. This is the closure task that deletes active
`WidgetBlock[]` dependencies, legacy screen widgets, duplicated DB projections,
and stale docs.

## Sub-Tasks

- [ ] TASK-468-07-L01: V4 Backfill Verification Migration.
- [ ] TASK-468-07-L02: Legacy Widget Surface And Bridge Removal.
- [ ] TASK-468-07-L03: Drop Legacy Blocks Bindings Columns.
- [ ] TASK-468-07-L04: Docs Changelog Board And Final Validation.

## Files To Change

| File | Required change |
|---|---|
| `core/db/schema.ts` | Remove `customScreens.blocks` and `customScreens.bindings` after migration is safe. |
| `core/db/migrations/*` | Add SQL migration for backfill/assert/drop. |
| `core/db/migrations/meta/*_snapshot.json` | Add updated Drizzle snapshot. |
| `core/db/migrations/meta/_journal.json` | Add migration journal entry. |
| `core/widgets/core/*screen*` and registry files | Remove legacy screen widgets from active widget surfaces. |
| `core/services/customScreens/customScreenSchemas.ts` | Remove active V1/V2/V3 write support after migration; keep read guards only if required by restore/import contract. |
| `core/admin/ui/custom-screens/*` | Delete unused legacy widget builder/render bridge files. |
| `_docs/*` | Update Custom Screens, Page model, Widgets, API, Architecture, and cache docs. |
| `_docs/_CHANGELOG/` | Add family closeout. |

## Implementation Pseudocode

```sql
-- Migration shape, exact SQL depends on current migration system.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM custom_screens
    WHERE schema_version <> 4
       OR COALESCE((definition->>'schemaVersion')::int, 0) <> 4
  ) THEN
    RAISE EXCEPTION 'custom_screen_legacy_rows_remaining';
  END IF;
END $$;

ALTER TABLE custom_screens DROP COLUMN blocks;
ALTER TABLE custom_screens DROP COLUMN bindings;
```

```ts
export function assertNoLegacyCustomScreenRows(rows: CustomScreenRow[]) {
  const legacy = rows.filter((row) => row.schemaVersion !== 4);
  if (legacy.length > 0) {
    throw new Error("custom_screen_legacy_rows_remaining");
  }
}
```

Data flow:

1. Run V4 backfill/verification in a DB-backed test environment.
2. Remove legacy builder imports and render bridges.
3. Remove legacy screen widgets from active widget registration.
4. Drop duplicated columns with SQL, snapshot, and journal artifacts.
5. Run full targeted validation and update docs/changelog/task board.

Error handling:

- DB migration must fail closed if legacy rows remain.
- Restore/import paths must either migrate legacy definitions before insert or
  reject with a machine-readable error.
- If column drop cannot ship safely in the same release, TASK-468 cannot close;
  split a blocking follow-up and leave parent open.

Regression-test shape:

```ts
test("legacy custom screen widget blocks no longer render in V4 runtime", () => {
  expect(() => renderLegacyWidgetBlockInScreenRuntime(legacyWidgetBlock)).toThrow(
    "custom_screen_legacy_widget_unsupported"
  );
});

test("migration refuses to drop columns while legacy rows remain", async () => {
  await seedLegacyCustomScreen();
  await expect(runCustomScreenV4CleanupMigration()).rejects.toThrow(
    "custom_screen_legacy_rows_remaining"
  );
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin routes only.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** V4 remains strict; legacy writes reject or
  migrate through the service owner only.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** migration logs must not print raw definitions, entry
  values, tokens, cookies, provider keys, or storage credentials.

## Testing Requirements

- DB-backed migration tests when `DATABASE_URL` is available after loading env
  with `set -a && source .env && set +a`.
- Custom Screen V4 service/runtime/admin UI targeted tests.
- Assistant V4 action tests.
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run precommit` before a manual commit.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/PAGE_MODEL.md`
- `_docs/WIDGETS.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache ownership
  changed.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. Legacy screen widget builder/render bridge paths are deleted or unreachable.
2. `custom_screens.blocks` and `custom_screens.bindings` are removed with SQL,
   snapshot, and journal artifacts, or the parent remains open with a blocking
   follow-up.
3. V4 docs and tests are the only active Custom Screens contract.
4. TASK-468 parent closes only after validation, docs, changelog, and board are
   synchronized.
