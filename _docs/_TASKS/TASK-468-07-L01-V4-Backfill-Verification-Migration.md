# TASK-468-07-L01: V4 Backfill Verification Migration
# FileName: TASK-468-07-L01-V4-Backfill-Verification-Migration.md

**Parent Subtask:** TASK-468-07
**Priority:** High
**Category:** Database / Custom Screens / Migration
**Estimated Effort:** Large
**Dependencies:** TASK-468-06-L04
**Status:** ⏳ To Do

---

## Overview

Add the final V4 backfill verification migration before removing legacy columns
or widget bridges. This leaf must prove all existing Custom Screen rows can be
read as V4 and must record unsupported legacy widgets as explicit placeholders
or blocking migration errors.

## Sub-Tasks

- [ ] Add a non-destructive migration/backfill step that verifies
  `custom_screens.definition` rows normalize to schemaVersion 4.
- [ ] Backfill and verify `custom_screens.schema_version = 4` in lockstep with
  `definition->>'schemaVersion' = '4'`.
- [ ] Set the `custom_screens.schema_version` DB default to `4` before
  destructive cleanup.
- [ ] Record counts for migrated rows, already-V4 rows, unsupported placeholder
  rows, and hard failures.
- [ ] Add DB-backed tests for V1/V2/V3/V4 rows when `DATABASE_URL` is available.
- [ ] Do not drop `blocks` or `bindings` columns in this leaf.
- [ ] Document rollback/read compatibility assumptions before cleanup continues.

## Files To Change

| File | Required change |
|---|---|
| `core/db/migrations/*_custom_screens_v4_backfill_verification.sql` | New non-destructive verification/backfill migration. |
| `core/db/migrations/*_custom_screens_v4_schema_version_default.sql` | Backfill `schema_version` to `4` for V4 definitions and set `DEFAULT 4`. |
| `core/db/migrations/meta/*_snapshot.json` | Migration snapshot update. |
| `core/db/migrations/meta/_journal.json` | Journal update. |
| `core/db/schema.ts` | Update `customScreens.schemaVersion` default/contract to V4 after the backfill/default migration. |
| `core/services/customScreens/customScreenService.ts` | Backfill helper or migration adapter reuse if needed. |
| `package.json` | Add `tests/integration/customScreens` to Bun integration commands if this new directory is used. |
| `scripts/run-bun-lane.ts` | Register the backfill migration suite in the curated Bun lane. |
| `tests/README.md` | Document `tests/integration/customScreens` ownership. |
| `tests/integration/customScreens/customScreensV4BackfillMigration.test.ts` | DB-backed Bun migration coverage for V1/V2/V3/V4 rows; skip cleanly when `DATABASE_URL` is unavailable. |

## Implementation Pseudocode

```ts
async function verifyCustomScreensV4Backfill(db: Db) {
  const rows = await db.select().from(customScreens);
  const report = createMigrationReport();
  for (const row of rows) {
    const migrated = migrateCustomScreenDefinitionToV4(row.definition, {
      legacyBlocks: row.blocks,
      legacyBindings: row.bindings,
    });
    await persistMigratedDefinitionAndSchemaVersion(db, row.id, {
      schemaVersion: 4,
      definition: migrated,
    });
    report.record(migrated);
  }
  return report;
}
```

Data flow:

- Migration reads existing `definition`, `blocks`, and `bindings` while legacy
  columns still exist.
- Migration adapters convert rows to V4 or explicit placeholders.
- Backfill writes both the integer `schema_version` column and JSON
  `definition.schemaVersion` as `4` atomically.
- Report is logged safely and tests assert deterministic row outcomes.

Error handling:

- Hard migration failures stop the migration and preserve legacy columns.
- Unsupported legacy widgets become placeholders only when the TASK-468-02
  decision record allows that behavior.
- Migration logs include row ids and error codes, not raw record values.

Regression-test shape:

```ts
test("backfill converts v3 widget screen into v4 placeholder document", async () => {
  const row = await seedLegacyCustomScreen(v3UnsupportedWidgetFixture);
  await runCustomScreensV4Backfill();
  const migrated = await readCustomScreen(row.id);
  expect(migrated.schemaVersion).toBe(4);
  expect(migrated.definition.schemaVersion).toBe(4);
  expect(migrated.definition.editorView.document.sections[0].blocks[0].type).toBe("legacy-placeholder");
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** migration/admin DB execution only.
- **RBAC:** not user-facing.
- **CSRF expectations:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Reject unknown validation:** migration output must pass strict V4
  normalizers.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** migration reports must not log raw definitions if they may
  contain protected labels or values; prefer row ids and error codes.

## Testing Requirements

- Load env before DB tests: `set -a && source .env && set +a`.
- `bun test tests/integration/customScreens/customScreensV4BackfillMigration.test.ts`
- `bun run test:bun:lane`
- DB migration tests when `DATABASE_URL` is reachable.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/DATA_MODEL.md`
- `_docs/_TASKS/TASK-468-07-Legacy-Removal-DB-Cleanup-Docs-And-Closure-Validation.md`

## Acceptance Criteria

1. All existing Custom Screen rows are verified or converted to V4 before
   destructive cleanup.
2. Legacy columns remain available until the drop-column leaf.
3. Migration artifacts include SQL, snapshot, and journal updates.
4. DB `schema_version` and JSON `definition.schemaVersion` are both `4` for
   migrated rows and new writes.
