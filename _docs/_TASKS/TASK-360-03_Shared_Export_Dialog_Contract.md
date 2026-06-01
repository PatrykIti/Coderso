# TASK-360-03: Shared Export Dialog Contract
# FileName: TASK-360-03_Shared_Export_Dialog_Contract.md

**Priority:** High
**Category:** Admin UI + Export + Shared Components
**Estimated Effort:** Large
**Dependencies:** TASK-360
**Status:** To Do

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
| Shared export helpers | Add payload type and optional download helper if consistent with repo patterns. |
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
```

Data flow:

- Dialog receives fields, current format, and optional `onExport`.
- Enabled export requires `onExport` and at least one selected field.
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
- Auth/RBAC/CSRF/rate-limit: enforced by adopting export endpoints.
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

