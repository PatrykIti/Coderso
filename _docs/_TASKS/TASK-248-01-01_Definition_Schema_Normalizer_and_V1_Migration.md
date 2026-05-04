# TASK-248-01-01: Definition Schema, Normalizer, and V1 Migration
# FileName: TASK-248-01-01_Definition_Schema_Normalizer_and_V1_Migration.md

**Priority:** High
**Category:** Coderso Custom Screens + Domain Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-248-01
**Status:** Done
**Completed:** 2026-05-01

---

## Overview

Add the versioned Custom Screen definition model for workspace-builder V2 while
keeping existing V1 screens readable.

This leaf owns the service/domain contract plus the persistence migration needed
for that contract. It must not change admin UI rendering, route registration, or
widget registry behavior. The expected output is a strict definition normalizer
that accepts current V1 rows, emits V2 defaults for the selected content type
when context is available, rejects unknown V2 keys before persistence, and ships
the full DB migration artifacts for `custom_screens.definition`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/services/customScreens/capabilities.ts`
- `core/db/schema.ts`
- DB migration SQL for `custom_screens.definition`
- matching `meta/*_snapshot.json`
- `meta/_journal.json`
- `tests/vitest/customScreens/customScreenService.test.ts`
- `tests/vitest/customScreens/capabilities.test.ts`
- DB-backed Bun migration/service validation, for example a focused
  `tests/integration/routes/customScreensRoutes.test.ts` scenario or a dedicated
  migration artifact smoke suite for `custom_screens.definition`.

## Contract

Persisted V2 definitions must use this shape:

```ts
type CustomScreenDefinitionV2 = {
  schemaVersion: 2;
  listView: CustomScreenListViewDefinition;
  editorView: CustomScreenEditorViewDefinition;
};
```

`contentTypeId` remains record-level state owned by `custom_screens.content_type_id`.
The definition normalizer may receive `{ contentType }` as context for default
generation and field validation, but persisted definition JSON must reject a
top-level `contentTypeId`.

Storage rule: add a new `custom_screens.definition` JSON column as the V2 source
of truth. The existing `schema_version`, `blocks`, and `bindings` columns remain
legacy compatibility storage for V1 rows and transitional projections only. Do
not store `listView` implicitly in `blocks` or `bindings`.

Service mapping must be deterministic:

- For V2 rows with `definition`, normalize and return `record.definition`.
- For legacy rows without `definition`, migrate `{ schemaVersion, blocks,
  bindings }` into a V2 definition at read time and persist it on the next
  update path.
- Keep `record.blocks` and `record.bindings` as legacy projections of
  `definition.editorView` only while existing callers are migrated.
- V2 UI/service code must consume `record.definition`, not reconstruct a
  definition from legacy fields.

## Implementation Pseudocode

```ts
export function normalizeCustomScreenDefinition(
  input: unknown,
  context?: { contentType?: ContentTypeSummary }
): CustomScreenDefinition {
  const record = assertRecord(input ?? {});
  const schemaVersion = normalizeCustomScreenSchemaVersion(record.schemaVersion);

  if (schemaVersion === 1) {
    return migrateV1DefinitionToV2(normalizeV1Definition(record), context);
  }

  return normalizeV2Definition(record, context);
}
```

```ts
function normalizeV2Definition(
  input: Record<string, unknown>,
  context?: { contentType?: ContentTypeSummary }
): CustomScreenDefinitionV2 {
  rejectUnknownKeys(input, ["schemaVersion", "listView", "editorView"]);
  if ("contentTypeId" in input) throw new Error("custom_screen_definition_invalid");

  return {
    schemaVersion: 2,
    listView: normalizeListViewDefinition(input.listView, context),
    editorView: normalizeEditorViewDefinition(input.editorView, context),
  };
}
```

```ts
function migrateV1DefinitionToV2(
  definition: CustomScreenDefinitionV1,
  context?: { contentType?: ContentTypeSummary }
): CustomScreenDefinitionV2 {
  return {
    schemaVersion: 2,
    listView: buildDefaultListViewDefinition(context?.contentType),
    editorView: {
      blocks: definition.blocks,
      bindings: definition.bindings,
      saveMode: "entry",
    },
  };
}
```

```ts
async function getCustomScreenRecord(id: string): Promise<CustomScreenRecord> {
  const row = await findCustomScreenRow(id);
  const contentType = await findContentTypeById(row.contentTypeId);
  return mapCustomScreenRow(row, { contentType });
}

async function listCustomScreenRecords(): Promise<CustomScreenRecord[]> {
  const rows = await listCustomScreenRows();
  const contentTypesById = await loadContentTypesById(
    rows.map((row) => row.contentTypeId)
  );
  return rows.map((row) =>
    mapCustomScreenRow(row, {
      contentType: contentTypesById.get(row.contentTypeId),
    })
  );
}

function mapCustomScreenRow(
  row: CustomScreenRow,
  context: { contentType?: ContentTypeSummary }
): CustomScreenRecord {
  const definition = row.definition
    ? normalizeV2Definition(row.definition, context)
    : migrateV1DefinitionToV2(
        normalizeV1Definition({
          schemaVersion: row.schemaVersion,
          blocks: row.blocks,
          bindings: row.bindings,
        }),
        context
      );

  return {
    ...mapBaseScreenRow(row),
    schemaVersion: definition.schemaVersion,
    definition,
    blocks: definition.editorView.blocks,
    bindings: definition.editorView.bindings,
  };
}
```

Default list generation should choose only approved system fields and fields from
the resolved content type schema:

```ts
export function buildDefaultListViewDefinition(
  contentType?: ContentTypeSummary
): CustomScreenListViewDefinition {
  const fields = contentType ? fieldsFromSchema(contentType.schema) : [];
  return {
    columns: buildDefaultColumns(fields),
    filters: buildDefaultFilters(fields),
    defaultSort: { field: "updatedAt", direction: "desc" },
    rowClick: "editor-view",
    createMode: "editor-view",
    bulkActions: { delete: true, publish: true, unpublish: true },
  };
}
```

## Security Contract

- Visibility: internal service/domain contract used by existing internal admin
  Custom Screen routes.
- Auth model: unchanged; route-level auth remains owned by
  `/admin/api/custom-screens`.
- RBAC: unchanged; create/update callers still require `content:write`.
- CSRF: unchanged; no direct browser mutation is added in this leaf.
- Rate-limit bucket: unchanged existing `admin_write` route bucket.
- Reject-unknown validation:
  - V2 definitions reject unknown top-level keys,
  - `listView` and `editorView` reject unknown nested keys,
  - persisted V2 definitions reject `contentTypeId`,
  - binding paths continue to reject `__proto__`, `prototype`, and
    `constructor`.
- Anti-abuse: no public endpoint, nonce, HMAC, signature, or reCAPTCHA flow is
  introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - V1 definitions normalize into V2 without losing `blocks` or `bindings`,
  - legacy rows without `definition` project a deterministic V2 `definition`,
  - V2 rows with `definition` use it as the source of truth,
  - V2 records expose `definition` and legacy `blocks`/`bindings` projections,
  - list/get service paths load the assigned content type before row mapping and
    pass it as normalizer context,
  - missing content-type context follows the explicit fallback/error behavior
    chosen by the service instead of relying on a non-existent `row.contentType`,
  - V2 definitions reject unknown top-level and nested keys,
  - V2 definitions reject persisted `contentTypeId`,
  - default `List View` generation uses only approved system fields and selected
    content type fields,
  - invalid column/filter fields throw `custom_screen_definition_invalid`,
  - capabilities report V2 list/editor support without breaking legacy V1 rows.
- Bun/DB-backed validation when `DATABASE_URL` is available:
  - load env before the suite with `set -a && source .env && set +a`,
  - verify the migration artifacts add `custom_screens.definition`,
  - verify existing `schema_version`, `blocks`, and `bindings` remain present for
    V1 compatibility,
  - verify a legacy V1 row can be read after migration and maps to a deterministic
    V2 `definition`,
  - verify a V2 row persists and reads `definition` as the source of truth.
  If the DB is unavailable, record the exact skipped command and rerun the
  DB-backed validation before closing the parent family.

## Documentation Updates Required

- `_docs/CMS_API.md` when the V2 payload shape is implemented.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `CustomScreenDefinitionVersion` supports `1 | 2`.
2. Existing V1 rows load through a deterministic migration path.
3. V2 definitions persist explicit `listView` and `editorView` objects in
   `custom_screens.definition`.
4. Unknown V2 keys fail with `custom_screen_definition_invalid`.
5. `contentTypeId` is never duplicated inside persisted definition JSON.
6. Full DB migration artifacts exist for `custom_screens.definition`.
