# TASK-468-02-L04: V4 Write Transition And Compatibility Guards
# FileName: TASK-468-02-L04-V4-Write-Transition-And-Compatibility-Guards.md

**Parent Subtask:** TASK-468-02
**Priority:** High
**Category:** Custom Screens / Migration / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-468-02-L03, TASK-467-02
**Status:** ⏳ To Do

---

## Overview

Switch writes to V4 while legacy rows remain readable. This leaf prevents new
legacy `WidgetBlock[]` screen definitions from being created after the V4 editor
cutover starts.

## Sub-Tasks

- [ ] Add a feature/contract switch for V4-only writes.
- [ ] Preserve read migration for old rows.
- [ ] Make V4 writes store inert compatibility `blocks`/`bindings` values until
  columns are dropped.
- [ ] Add tests proving new writes cannot regress to V3.
- [ ] Document rollback expectations.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/customScreenService.ts` | Force create/update writes to V4 after cutover. |
| `core/services/customScreens/customScreenSchemas.ts` | Reject V1/V2/V3 writes through write-specific V4 create/update schemas while preserving read migration helpers for legacy rows. |
| `core/server/routes/customScreenRoutes.ts` | Map `custom_screen_legacy_write_unsupported` to a 400 `ApiError`. |
| `core/admin/services/customScreensEditorClient.ts` | Send V4 editor payloads only. |
| `tests/integration/routes/customScreensRoutes.test.ts` | Cover `custom_screen_legacy_write_unsupported` error mapping and legacy POST/PATCH rejection if route payload behavior changes. |
| Tests for service/admin client | Cover V4-only write behavior. |

## Implementation Pseudocode

```ts
export function normalizeCustomScreenDefinitionForWrite(
  input: CustomScreenWriteInput,
  context: CustomScreenDefinitionContext
): CustomScreenDefinitionV4 {
  const version = normalizeCustomScreenWriteSchemaVersion(input.schemaVersion);
  if (version !== 4) {
    throw new Error("custom_screen_legacy_write_unsupported");
  }
  return normalizeCustomScreenDefinition({ schemaVersion: 4, definition: input.definition }, context);
}

function toCompatibilityProjection(definition: CustomScreenDefinitionV4) {
  return { blocks: [], bindings: [] };
}
```

Data flow:

- Reads: V1/V2/V3 rows migrate to V4 in memory.
- Writes: create/update accepts V4 only after strict mode.
- DB: `definition` stores V4; legacy columns store inert empty projections until
  TASK-468-07-L03 drops them.
- Writes must persist both the row `schema_version` column and
  `definition.schemaVersion` as `4`.

Error handling:

- Legacy write attempts return `custom_screen_legacy_write_unsupported`.
- If rollback is required, the rollback path restores old code and old columns,
  not mixed V3/V4 writes in the same service path.

Regression-test shape:

```ts
test("strict write mode rejects V3 definitions", () => {
  expect(() => normalizeCustomScreenDefinitionForWrite(v3WriteInput, ctx)).toThrow(
    "custom_screen_legacy_write_unsupported"
  );
});
```

## Security Contract

- **Endpoint visibility:** internal admin Custom Screen writes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:write`.
- **CSRF expectations:** required.
- **Rate-limit bucket:** existing admin write bucket.
- **Reject unknown validation:** V4-only writes remain strict.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** no logging of raw definitions.

## Testing Requirements

- Service/domain tests for V4-only writes.
- Admin client tests for V4 write payloads.
- `bun test tests/integration/routes/customScreensRoutes.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`

## Acceptance Criteria

1. New writes cannot create V3 Custom Screen definitions.
2. Old rows remain readable through migration adapters.
3. Compatibility projections are inert and temporary.
4. The cleanup task has a clear path to drop legacy columns.
