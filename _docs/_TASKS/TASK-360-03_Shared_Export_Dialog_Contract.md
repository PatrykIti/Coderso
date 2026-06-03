# TASK-360-03: Shared Export Dialog Contract
# FileName: TASK-360-03_Shared_Export_Dialog_Contract.md

**Priority:** High
**Category:** Admin UI + Export + Shared Components
**Estimated Effort:** Large
**Dependencies:** TASK-360
**Status:** Done (2026-06-01)

---

## Overview

Replace the shared export dialog's close-only behavior with a real contract
that enabled surfaces must wire to an export handler, while unsupported export
surfaces render explicit unavailable copy.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `core/admin/ui/shared/ExportDialog.tsx`
- Audit adoption: TASK-357-03
- Access Logs adoption: TASK-358-03

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/shared/ExportDialog.tsx` | Add required enabled-submit contract, validation, loading/success/error states, and disabled unavailable mode. |
| Shared export helpers | Add payload type and `downloadAdminExport` JSON export/job helper using canonical admin API path resolution. |
| Existing export callsites | Migrate or preserve backward compatibility with explicit unavailable state. |
| Tests | Cover validation, disabled mode, submit payload, loading/error, and callsite migration. |

## Implementation Pseudocode

```tsx
type ExportDialogPayload = {
  format: "csv" | "json";
  fields: string[];
};

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ExportField[];
  onExport?: (payload: ExportDialogPayload) => Promise<void>;
  unavailableReason?: string;
};

function canSubmitExport(props: ExportDialogProps, selectedFields: string[]) {
  return Boolean(props.onExport) &&
    selectedFields.length > 0 &&
    !props.unavailableReason;
}

async function downloadAdminExport(
  apiPath: `/${string}`,
  payload: unknown,
  options: { filenamePrefix: string; withCsrf: true }
) {
  const response = await adminApiFetch(apiPath, {
    method: "POST",
    body: JSON.stringify(payload),
    withCsrf: options.withCsrf,
    accept: "json-export-or-job",
  });
  return resolveExportDownload(response, options.filenamePrefix);
}
```

Data flow:

- Dialog receives fields, current format, and optional `onExport`.
- Enabled export requires `onExport` and at least one selected field.
- Format options must match implemented contracts. The current UI's `xlsx`
  option is removed or rendered unavailable unless a real Excel content type,
  backend route, and tests are implemented by an adopting task.
- `downloadAdminExport` accepts admin API-relative paths such as
  `/audit/export` and `/access-logs/export`, resolves them through the same
  admin base/API path convention as `apiRequest`, includes CSRF for writes, and
  handles JSON export content/metadata or async-job metadata without using fake
  `apiRequest` `responseType` options. Direct blob downloads require a separate
  router `Response` passthrough contract plus content-disposition tests before
  adoption.
- Submit validates locally, calls `onExport(payload)`, shows loading and
  success/error.
- Unsupported surfaces pass `unavailableReason` and render disabled submit with
  clear copy.
- Area clients include active filters/source surface in their own export
  payload wrappers.

Error handling:

- Empty field selection blocks submit.
- `onExport` rejection keeps dialog open with retry.
- Close during loading is disabled or handled explicitly.
- Backward-compatible callsites cannot silently close without a handler.

## Security Contract

- Endpoint visibility: none; UI-only shared component.
- Auth model: none in the UI component itself; adopting export endpoints must
  use authenticated admin sessions.
- RBAC: enforced by adopting export endpoints, usually the read permission for
  the exported surface.
- CSRF/rate-limit: enforced by adopting export endpoints.
- Reject unknown validation: adopting endpoints must validate selected columns
  server-side; the UI allowlist is not trusted.
- Anti-abuse: unchanged.
- Secret handling: fields and labels must not expose hidden secret fields.
- Audit: adopting export endpoints should emit redacted summary audit events.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests for field validation, disabled unavailable mode, submit
  payload, loading state, error retry, and close behavior.
- Migration/callsite tests for Audit Logs and Access Logs.
- Helper tests prove `/audit/export` resolves to `/admin/api/audit/export` and
  `/access-logs/export` resolves to `/admin/api/access-logs/export` under the
  current admin base path.
- Tests prove `xlsx` is not an enabled no-op when only CSV/JSON are supported.
- No-op audit gate must fail if enabled export submit lacks `onExport`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- Admin UI contributor docs for export dialogs
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Enabled export dialogs cannot submit without a real handler.
- Unsupported export surfaces show explicit unavailable state.
- Audit and Access Logs can adopt the same shared dialog contract.
- The shared export helper gives adopting clients a real JSON export/job path
  and does not rely on unsupported `apiRequest` options.

## Completion Notes

- `ExportDialog` now owns selected fields/format state, supports only CSV/JSON,
  disables submit without `onExport`, and shows explicit unavailable/error/success
  states.
- Audit Logs and Access Logs pass unavailable reasons until TASK-357-03 and
  TASK-358-03 add real export routes.
- Added `downloadAdminExport()` for JSON file/job export responses under
  canonical `/admin/api/*` paths with CSRF.
- Regression coverage lives in
  `tests/vitest/ui/shared-dialog-contracts.test.tsx`,
  `tests/vitest/ui/dialogs.test.tsx`, and
  `tests/vitest/admin/adminExportClient.test.ts`.
