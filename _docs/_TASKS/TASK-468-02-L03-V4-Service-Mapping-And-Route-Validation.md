# TASK-468-02-L03: V4 Service Mapping And Route Validation
# FileName: TASK-468-02-L03-V4-Service-Mapping-And-Route-Validation.md

**Parent Subtask:** TASK-468-02
**Priority:** High
**Category:** Custom Screens / Service / API Routes
**Estimated Effort:** Large
**Dependencies:** TASK-468-02-L02
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Wire V4 definitions through the Custom Screen service and admin routes. Routes
stay orchestration-only: validate payloads, enforce permissions, call the
service, and map domain errors.

## Sub-Tasks

- [x] Update `CustomScreenRecord` and create/update inputs for V4.
- [x] Re-export strict route validation schemas.
- [x] Update route error mapping for any new machine-readable errors.
- [x] Keep list/get/create/update/delete route behavior compatible.
- [x] Add route registration and error-map tests.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/customScreenService.ts` | Return V4 records and stop requiring active `blocks`/`bindings` for V4 rows. |
| `core/services/customScreens/customScreenSchemas.ts` | Export strict create/update V4 schemas. |
| `core/server/validation/customScreenSchemas.ts` | Re-export updated route schemas. |
| `core/server/routes/customScreenRoutes.ts` | Map new domain errors and keep route orchestration-only. |
| Route tests | Cover create/update/get/list V4, unknown-field rejection, and error mapping. |

## Implementation Pseudocode

```ts
type CustomScreenRecordV4 = {
  id: string;
  contentTypeId: string;
  schemaVersion: 4;
  definition: CustomScreenDefinitionV4;
  legacy: {
    migratedFromVersion: 1 | 2 | 3 | null;
    hasPlaceholders: boolean;
  };
};

export async function updateCustomScreen(id: string, input: CustomScreenUpdateInput) {
  const existing = await loadCustomScreenRow(id);
  if (!existing) return null;
  const definition = normalizeCustomScreenDefinition(input.definition, {
    contentType: await loadContentType(input.contentTypeId ?? existing.contentTypeId),
  });
  return saveCustomScreenDefinition(existing, definition);
}
```

Data flow:

- Routes continue using `/custom-screens` under the admin API prefix.
- Service loads content type context before V4 normalization.
- Service returns V4 normalized records to admin clients.
- Route validation rejects unknown payload fields before service execution.

Error handling:

- `custom_screen_definition_invalid` maps to 400.
- Add `custom_screen_content_type_invalid` only if needed and map it centrally.
- Missing rows still map to `custom_screen_not_found`.

Regression-test shape:

```ts
test("PATCH /custom-screens/:id rejects unknown V4 fields", async () => {
  const response = await request.patch("/custom-screens/screen-1", {
    definition: { schemaVersion: 4, unknown: true },
  });
  expect(response.status).toBe(400);
  expect(response.body.code).toBe("custom_screen_definition_invalid");
});
```

## Security Contract

- **Endpoint visibility:** internal admin `/admin/api/custom-screens*`.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for GET, `content:write` for POST/PATCH/DELETE.
- **CSRF expectations:** required for POST/PATCH/DELETE.
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** route schemas and service normalizers reject
  unknown fields.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** routes must not log raw definitions or entry values.

## Testing Requirements

- Bun route tests for Custom Screen V4 routes.
- Error-map tests for all new domain errors.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`

## Acceptance Criteria

1. Routes accept strict V4 create/update payloads.
2. Route modules remain orchestration-only.
3. Unknown fields reject.
4. Route tests cover V4 success and mapped failure paths.
