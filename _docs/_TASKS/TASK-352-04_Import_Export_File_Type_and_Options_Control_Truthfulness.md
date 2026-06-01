# TASK-352-04: Import Export File-Type and Options-Control Truthfulness
# FileName: TASK-352-04_Import_Export_File_Type_and_Options_Control_Truthfulness.md

**Priority:** Medium
**Category:** Import Export + Admin UI + UX + Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-352-01, TASK-352-02
**Status:** To Do

---

## Overview

Remove or implement misleading file-type and option controls:

- The dropzone says `.json, .csv, .zip up to 50MB`, but input accepts `.json`
  and parser uses `JSON.parse`.
- Per-card option chevrons have no menu/action.

## Sub-Tasks

- Decide whether CSV/ZIP import is in scope now.
- If JSON-only, align dropzone copy, input `accept`, parser errors, and route
  schema to JSON.
- If CSV/ZIP is supported, add client parser, server validation, and tests for
  each format.
- Wire per-card chevrons to an advanced options menu or disable/remove them.
- Add accessible labels/descriptions for unavailable controls.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/import-export/ImportDropzone.tsx` | Align help copy, file accept list, parser, and validation errors. |
| `core/admin/ui/import-export/ExportCards.tsx` | Wire or disable per-card chevron controls. |
| `core/admin/ui/import-export/ImportExportPage.tsx` | Keep page section copy consistent with supported formats. |
| `core/server/validation/importExportSchemas.ts` | Touch only if route accepts non-JSON format metadata. |
| `tests/vitest/ui/import-export.test.tsx` | Cover file-type copy and chevron behavior/disabled state. |
| `tests/unit/tools/importExport.test.ts` | Cover parser/schema behavior if new formats are added. |

## Implementation Pseudocode

```tsx
const supportedImportFormats = ["json"] as const;
const helpText = "Support for .json files up to 50MB";

<input accept=".json,application/json" />

<Button
  variant="outline"
  size="icon"
  aria-label={`${card.title} export options`}
  disabled={!advancedOptionsEnabled || isExporting}
  aria-disabled={!advancedOptionsEnabled}
/>
```

Data flow:

- UI copy and file input allowlist must match the client parser and server
  bundle schema.
- Option chevron state must match actual menu/action availability.

Error handling:

- Unsupported file types should be rejected before parsing with a clear message.
- JSON parse failures should remain user-facing and not expose stack traces.
- Disabled controls must not fire no-op click handlers.

Regression-test shape:

- Assert dropzone copy only names supported formats.
- Upload unsupported extension and assert clear error if file input permits it
  through tests.
- Click chevron and assert menu opens or button is disabled with accessible
  state.

## Security Contract

No route changes are required for JSON-only truthfulness. If CSV/ZIP support is
added:

- Endpoint visibility: internal admin only.
- Auth model: session cookie.
- RBAC: `settings:read` preview, `settings:write` apply.
- CSRF: required for POST.
- Rate-limit bucket: `admin_read`/`admin_write`.
- Reject-unknown validation: strict MIME/extension/size and parsed schema
  validation.
- Anti-abuse: no public write.
- Secret handling: parser errors must not echo file contents containing secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/import-export.test.tsx`
- `bun test tests/unit/tools/importExport.test.ts` if parser/schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Import / Export report with supported format and chevron decision.
- Update user docs if supported import formats change.

## Acceptance Criteria

- The dropzone no longer advertises unsupported formats.
- Per-card chevrons are functional or visibly unavailable.
- File-type validation copy, input accept list, and parser behavior are aligned.
