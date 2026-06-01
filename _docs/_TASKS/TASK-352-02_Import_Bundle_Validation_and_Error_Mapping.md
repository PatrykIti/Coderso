# TASK-352-02: Import Bundle Validation and Error Mapping
# FileName: TASK-352-02_Import_Bundle_Validation_and_Error_Mapping.md

**Priority:** High
**Category:** Import Export + Validation + API + Security
**Estimated Effort:** Large
**Dependencies:** TASK-352
**Status:** To Do

---

## Overview

Prevent malformed bundles from passing preview and failing apply with a raw DB
500. The report found a non-UUID menu ID passed preview, then apply failed at
database insert time.

## Sub-Tasks

- Add UUID format validation for optional imported IDs that are persisted.
- Decide where imported IDs are allowed and where server-generated UUIDs should
  always be used.
- Normalize or discard unsafe IDs before persistence.
- Map known import domain errors to `ApiError` responses at the route boundary.
- Ensure preview and apply use the same validation/normalization path.

## Files To Change

| File | Required change |
|---|---|
| `core/server/validation/importExportSchemas.ts` | Add UUID pattern/format checks for optional IDs or remove ID acceptance from schema. |
| `core/services/tools/importExportService.ts` | Normalize imported IDs once and reuse in preview/apply; throw machine-readable errors. |
| `core/server/routes/importExportRoutes.ts` | Map known import errors to user-facing API errors. |
| `core/admin/ui/import-export/ImportDropzone.tsx` | Render validation messages without raw DB text. |
| `tests/unit/tools/importExport.test.ts` | Cover invalid IDs, duplicate route paths, and preview/apply parity. |
| `tests/integration/routes/importExport.test.ts` | Cover malformed bundle returns 400 from preview/apply. |

## Implementation Pseudocode

```ts
function normalizeOptionalUuid(value: unknown, code: string) {
  if (value == null) return undefined;
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new Error(code);
  }
  return value;
}

function normalizeImportBundle(bundle: ExportBundle): NormalizedImportBundle {
  return {
    ...bundle,
    menus: bundle.menus.map((menu) => ({
      ...menu,
      id: normalizeOptionalUuid(menu.id, "import_menu_id_invalid") ?? randomUUID(),
      items: menu.items.map(normalizeMenuItemForImport),
    })),
  };
}

function mapImportExportError(error) {
  if (error.message === "import_menu_id_invalid") {
    return new ApiError("import_menu_id_invalid", "Menu id is invalid.", 400);
  }
}
```

Data flow:

- Client parses JSON -> preview route schema -> service normalization ->
  summary.
- Apply route repeats the same validation/normalization and persists only
  normalized data.

Error handling:

- Preview and apply must reject the same malformed bundle.
- DB constraint errors should be prevented by validation where possible and
  mapped where unavoidable.
- Error messages must be actionable and not include SQL, filesystem paths, or
  stack traces.

Regression-test shape:

- Preview malformed non-UUID ID returns 400.
- Apply the same malformed bundle returns the same machine-readable code.
- Valid bundle roundtrip still succeeds.

## Security Contract

- Endpoint visibility: internal admin preview/apply routes.
- Auth model: session cookie.
- RBAC: `settings:read` for preview, `settings:write` for apply.
- CSRF: required for both POST routes.
- Rate-limit bucket: `admin_read` or `admin_write` by method/route policy.
- Reject-unknown validation: strict schemas, UUID checks, bounded arrays.
- Anti-abuse: no public write.
- Secret handling: validation errors must not echo secret values from imported
  settings.

## Testing Requirements

- `bun test tests/unit/tools/importExport.test.ts`
- `bun test tests/integration/routes/importExport.test.ts`
- `bun run test:vitest -- tests/vitest/ui/import-export.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Import / Export report with malformed-bundle resolution.
- Update admin API docs if import error codes are documented.

## Acceptance Criteria

- Malformed IDs cannot pass preview.
- Apply does not return raw DB 500 for validation-owned problems.
- Preview/apply validation behavior is consistent.
