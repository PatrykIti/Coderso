# TASK-468-02: Screen Document V4 Service Contract And Migration Adapters
# FileName: TASK-468-02-Screen-Document-V4-Service-Contract-And-Migration-Adapters.md

**Parent Task:** TASK-468
**Priority:** High
**Category:** Custom Screens / Services / Migration
**Estimated Effort:** Large
**Dependencies:** TASK-468-01
**Status:** 🚧 In Progress
**Started:** 2026-06-20

---

## Overview

Implement the service/domain contract for `CustomScreenDefinitionV4` and migrate
legacy V1/V2/V3 reads into `ScreenDocumentV1`. The server remains the write
authority; admin clients may use defensive DTO validation but must not own the
persistence schema.

2026-06-20 first slice:

- V4 definition, `ScreenDocumentV1`, and `ScreenFieldBinding` normalization now
  live in `customScreenSchemas.ts`.
- V1/V2/V3 reads migrate to V4; V3 writes are accepted as compatibility input
  and persisted as V4.
- `custom_screens.blocks` and `custom_screens.bindings` remain compatibility
  projections until TASK-468-07 verifies backfill and removes columns.
- Route schemas accept V4 and still reject definition-owned `contentTypeId`.

## Sub-Tasks

- [ ] TASK-468-02-L01: Screen Document Domain Owner.
- [ ] TASK-468-02-L02: Legacy V1-V3 Read Migration Adapters.
- [ ] TASK-468-02-L03: V4 Service Mapping And Route Validation.
- [ ] TASK-468-02-L04: V4 Write Transition And Compatibility Guards.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/screenDocument.ts` | New owner for screen section/block/binding contracts, defaults, normalizers, and migration helpers. |
| `core/services/customScreens/customScreenSchemas.ts` | Add V4 support and route legacy versions through the new screen document owner. |
| `core/services/customScreens/customScreenService.ts` | Persist V4 definitions as source of truth and stop projecting active state into legacy blocks/bindings for V4 rows. |
| `core/server/validation/customScreenSchemas.ts` | Re-export the new strict V4 create/update schemas and preserve route validation ownership. |
| `core/server/routes/customScreenRoutes.ts` | Keep orchestration-only route behavior and error mapping. |
| `tests/vitest/customScreens/*` or existing Custom Screen service suites | Add V4 normalizer/migration coverage. |
| Route tests for Custom Screens | Add V4 create/update/get/list and unknown-field rejection coverage. |

## Implementation Pseudocode

```ts
export function normalizeScreenDocument(
  input: unknown,
  context: CustomScreenDefinitionContext
): ScreenDocumentV1 {
  const record = assertRecord(input, "custom_screen_definition_invalid");
  rejectUnknownKeys(record, ["schemaVersion", "sections"]);
  const schemaVersion = normalizeScreenDocumentVersion(record.schemaVersion);
  if (schemaVersion !== 1) throw new Error("custom_screen_definition_invalid");
  return {
    schemaVersion: 1,
    sections: normalizeScreenSections(record.sections, context),
  };
}

export function migrateCustomScreenDefinitionToV4(
  input: LegacyCustomScreenDefinitionInput,
  context: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  const legacy = normalizeLegacyDefinitionForRead(input, context);
  return {
    schemaVersion: 4,
    listView: migrateListViewToV4(legacy.listView),
    editorView: {
      document: migrateLegacyBlocksToScreenDocument(legacy.editorView.blocks, context),
      bindings: migrateLegacyBindingsToScreenBindings(legacy.editorView.bindings),
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
}
```

Legacy mapping:

- `screen-record-header` -> `record-header`
- `screen-field-value` -> `field`
- `screen-field-group` -> `field-group`
- `screen-two-column` -> `columns`
- Unknown legacy widgets -> `legacy-placeholder` with sanitized label and no
  arbitrary widget rendering.

Data flow:

- Reads normalize any V1/V2/V3 row into V4 for admin/runtime consumers.
- Writes accept V4 only after the cutover child enables strict mode.
- During transition, legacy rows may still be read, but V4 writes do not update
  active `blocks`/`bindings` projections except for inert compatibility values
  required before TASK-468-07 drops columns.

Error handling:

- `custom_screen_definition_invalid` for unknown keys, invalid ids, invalid
  binding paths, unsupported block types, and invalid list view shape.
- `custom_screen_not_found` remains unchanged.
- `custom_screen_status_invalid` remains unchanged.
- Add a typed `custom_screen_content_type_invalid` only if existing errors cannot
  clearly represent unresolved content type context.

Regression-test shape:

```ts
test("migrates V3 field widgets into V4 screen document", () => {
  const definition = migrateCustomScreenDefinitionToV4(v3Fixture, { contentType });
  expect(definition.schemaVersion).toBe(4);
  expect(definition.editorView.document.sections[0]?.blocks[0]?.type).toBe("field");
  expect(definition.editorView.bindings[0]?.field).toBe("title");
});

test("unknown legacy widgets become placeholders", () => {
  const definition = migrateCustomScreenDefinitionToV4(v3WithUnknownWidget, { contentType });
  expect(findBlock(definition, "legacy-placeholder")).toBeTruthy();
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen routes.
- **Auth model:** authenticated admin session.
- **RBAC:** route permissions unchanged; service does not bypass route checks.
- **CSRF expectations:** unchanged for POST/PATCH/DELETE.
- **Rate-limit bucket:** existing admin API bucket.
- **Reject unknown validation:** strict schema-first normalization for V4.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** normalizers must not log raw definitions or entry data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/customScreensClient.test.ts` if
  client DTO behavior is touched.
- Targeted Vitest service/domain tests for V4 normalizers and migrations.
- Bun route tests for Custom Screen create/update/get/list if route payloads
  change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/PAGE_MODEL.md`
- Parent task/changelog on family closure.

## Acceptance Criteria

1. V4 definitions normalize deterministically and reject unknown fields.
2. V1/V2/V3 rows read as V4 without arbitrary legacy widget rendering.
3. Route modules remain orchestration-only.
4. Service/domain tests cover valid V4, invalid V4, and legacy migration paths.
