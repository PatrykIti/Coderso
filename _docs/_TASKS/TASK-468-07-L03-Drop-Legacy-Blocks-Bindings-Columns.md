# TASK-468-07-L03: Drop Legacy Blocks Bindings Columns
# FileName: TASK-468-07-L03-Drop-Legacy-Blocks-Bindings-Columns.md

**Parent Subtask:** TASK-468-07
**Priority:** High
**Category:** Database / Custom Screens / Cleanup
**Estimated Effort:** Large
**Dependencies:** TASK-468-07-L01, TASK-468-07-L02
**Status:** ⏳ To Do

---

## Overview

Drop legacy `custom_screens.blocks` and `custom_screens.bindings` storage only
after V4 backfill verification and legacy widget bridge removal are complete.
This is the destructive cleanup leaf and must include full migration artifacts.

## Sub-Tasks

- [ ] Verify no service, route, admin, assistant, or test code reads/writes
  `custom_screens.blocks` or `custom_screens.bindings`.
- [ ] Add SQL migration to drop the legacy columns.
- [ ] Update migration snapshot and journal artifacts.
- [ ] Update data model docs and tests.
- [ ] Run DB-backed migration tests when `DATABASE_URL` is available.

## Files To Change

| File | Required change |
|---|---|
| `core/db/schema*` | Remove legacy column definitions. |
| `core/db/migrations/*_drop_custom_screen_legacy_blocks_bindings.sql` | New destructive cleanup migration. |
| `core/db/migrations/meta/*_snapshot.json` | Snapshot update. |
| `core/db/migrations/meta/_journal.json` | Journal update. |
| `core/services/customScreens/**` | Remove row mapping for dropped columns. |
| `tests/integration/customScreens/*migration*.test.ts` | Drop-column migration coverage. |
| `_docs/DATA_MODEL.md` | Remove legacy column documentation. |

## Implementation Pseudocode

```sql
ALTER TABLE custom_screens DROP COLUMN blocks;
ALTER TABLE custom_screens DROP COLUMN bindings;
```

```ts
function mapCustomScreenRow(row: CustomScreenRowAfterV4Cleanup) {
  return {
    id: row.id,
    definition: normalizeCustomScreenDefinitionV4(row.definition),
  };
}
```

Data flow:

- Service row mapping reads only `definition` as the screen source of truth.
- V4 definition owns editor view, list view, bindings, and migration metadata.
- Migration removes legacy duplicate storage.

Error handling:

- Abort this leaf if any code search finds active `row.blocks`, `row.bindings`,
  or SQL references outside migration history.
- DB migration failures leave previous schema intact through normal migration
  rollback/deployment handling.

Regression-test shape:

```ts
test("custom screen row mapping does not read dropped legacy columns", () => {
  const mapped = mapCustomScreenRow({ id: "screen-a", definition: v4Definition });
  expect(mapped.definition.schemaVersion).toBe(4);
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** migration/admin DB execution only.
- **RBAC:** not user-facing.
- **CSRF expectations:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Reject unknown validation:** V4 `definition` remains strict source of truth.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** migration and tests must not dump raw definitions or entry
  values into logs.

## Testing Requirements

- `rg -n "custom_screens\\.blocks|custom_screens\\.bindings|\\.blocks\\b|\\.bindings\\b" core tests _docs`
  with migration-history exceptions reviewed.
- Load env before DB tests: `set -a && source .env && set +a`.
- DB migration tests when `DATABASE_URL` is reachable.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/DATA_MODEL.md`
- `_docs/CMS_SPEC.md`

## Acceptance Criteria

1. Legacy duplicate columns are dropped only after V4 migration and bridge
   removal pass.
2. Schema, SQL migration, snapshot, and journal are all updated.
3. No active code path reads or writes the dropped columns.
