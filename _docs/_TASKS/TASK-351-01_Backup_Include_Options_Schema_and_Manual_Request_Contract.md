# TASK-351-01: Backup Include Options Schema and Manual Request Contract
# FileName: TASK-351-01_Backup_Include_Options_Schema_and_Manual_Request_Contract.md

**Priority:** High
**Category:** Backups + API + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-351
**Status:** Done (2026-06-01)

---

## Overview

Make backup content selection truthful. The dialog shows Database snapshot,
Media assets, and Settings & tokens checkboxes, but the request body remains
only `{ "kind": "manual" }`.

## Sub-Tasks

- Define `BackupIncludeOption` enum in the backup service contract.
- Convert `BackupNowDialog` checkboxes to controlled state.
- Send `include` options through `backupsClient.createBackup`.
- Extend `createBackupSchema` with a bounded `include` array.
- Persist include metadata on backup rows if needed for execution and UI, or
  explicitly document full-snapshot-only behavior and remove the checkboxes.
- Include selected options in audit metadata without leaking secret values.

## Files To Change

| File | Required change |
|---|---|
| `core/services/backups/backupTypes.ts` | Add include option type and create input type. |
| `core/services/backups/backupService.ts` | Accept create input and persist/derive include metadata. |
| `core/server/validation/backupSchemas.ts` | Add strict include enum array, min/max, and no unknown fields. |
| `core/server/routes/backupRoutes.ts` | Pass create input to service and log selected include keys safely. |
| `core/admin/services/backupsClient.ts` | Type and serialize include options. |
| `core/admin/ui/backups/BackupNowDialog.tsx` | Controlled checkbox state and disabled rules. |
| `core/admin/ui/backups/BackupsPage.tsx` | Pass selected include options to create handler. |
| `tests/unit/backups/backupService.test.ts` | Cover include normalization/persistence. |
| `tests/integration/routes/backups.test.ts` | Cover strict route validation. |
| `tests/vitest/admin/backupsClient.test.ts` | Cover client payload. |
| `tests/vitest/ui/backups-page-wave.test.tsx` | Cover checkbox toggles and outgoing payload. |

## Implementation Pseudocode

```ts
export const backupIncludeOptions = ["database", "media", "settings"] as const;
export type BackupIncludeOption = (typeof backupIncludeOptions)[number];

export function normalizeBackupInclude(input: unknown): BackupIncludeOption[] {
  const selected = Array.isArray(input) ? input : ["database", "media"];
  const deduped = [...new Set(selected)].filter(isBackupIncludeOption);
  if (deduped.length === 0) throw new Error("backup_include_required");
  return deduped;
}

async function createBackup(input: BackupCreateInput) {
  const include = normalizeBackupInclude(input.include);
  return insert backup row with metadata: { include };
}
```

Data flow:

- Dialog controlled state -> `BackupsPage.handleCreateBackup(include)` ->
  `backupsClient.createBackup({ kind: "manual", include })` -> route schema ->
  service create input -> audit metadata and execution layer.

Error handling:

- Prevent zero selected include options in the UI and reject it in the route.
- Unknown include values return validation error, not ignored execution.
- Settings/secrets include must not serialize raw secret values in audit
  metadata or browser payloads.

Regression-test shape:

- Toggle off Media and assert request payload is `["database"]`.
- Submit unknown include key and assert route validation 400.
- Create backup with include options and assert row metadata/audit metadata
  contains only option names.

## Security Contract

- Endpoint visibility: internal admin `POST /admin/api/backups`.
- Auth model: session cookie.
- RBAC: `backups:write`.
- CSRF: required.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: strict include enum array with bounded length.
- Anti-abuse: no public write.
- Secret handling: include `settings` means backup execution may read encrypted
  settings server-side, but request/audit/UI payloads must never include secret
  values.

## Testing Requirements

- `bun test tests/unit/backups/backupService.test.ts`
- `bun test tests/integration/routes/backups.test.ts`
- `bun run test:vitest -- tests/vitest/admin/backupsClient.test.ts tests/vitest/ui/backups-page-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Backups report with selected include contract.
- Update `_docs/CMS_API.md` for the create payload and strict validation
  contract.
- Update user docs if include options are product-supported.

## Acceptance Criteria

- Backup checkboxes are not visual-only.
- The selected include options reach the service layer and tests.
- Zero/unknown selections are rejected safely.

## Closure Notes

Done (2026-06-01): `BackupIncludeOption` now lives in the backup service
contract, `normalizeBackupInclude` defaults/dedupes/rejects invalid selections,
the dialog keeps controlled checkbox state, and `BackupsPage` sends selected
include options through the admin client to strict route validation and the
service. Audit metadata records only selected option keys, not secret values.
