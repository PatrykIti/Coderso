# TASK-351: Backups Tools Report Remediation
# FileName: TASK-351_Backups_Tools_Report_Remediation.md

**Priority:** High
**Category:** Admin Tools + Backups + Runtime + API + UI + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-347
**Status:** Done (2026-06-01)

---

## Overview

Close every Backups finding from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_BACKUPS.md` plus Backups-specific
Claude UX feedback from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`.

The report proves manual backup rows can be created and schedule settings can be
updated/restored. The unresolved gaps are product-contract level:

- Backup content checkboxes are uncontrolled and not sent to the service.
- Created backups remain queued with no artifact path/size; current
  `_docs/ARCHITECTURE.md` and `_docs/CMS_API.md` still describe v1 backups as
  metadata-only with future worker/plugin artifact creation.
- Restore/download/delete affordances are unavailable without explanation.
- Pagination buttons are placeholders.
- The UI does not expose queue/worker health or aged queued-job warnings.

## Source Findings

| Area | Current evidence | Owner files |
|---|---|---|
| Include options | `BackupNowDialog` uses `defaultChecked`; `BackupsPage.handleCreateBackup` sends only `{ kind: "manual" }`; route schema accepts only `kind`. | `core/admin/ui/backups/BackupNowDialog.tsx`, `core/admin/ui/backups/BackupsPage.tsx`, `core/admin/services/backupsClient.ts`, `core/server/validation/backupSchemas.ts` |
| Artifact lifecycle | `createBackup` inserts `status: "queued"`; `markBackupComplete` exists but no observed worker path calls it; `restoreBackup` returns row only. | `core/services/backups/backupService.ts`, `core/server/routes/backupRoutes.ts` |
| Table UX | `BackupsTable` renders disabled restore/download/delete for queued rows and `Next` without page state. | `core/admin/ui/backups/BackupsTable.tsx` |
| Worker feedback | Claude observed queued rows with `-` size and no explanation. | `core/admin/ui/backups/BackupsPage.tsx`, `core/admin/ui/backups/BackupsTable.tsx` |

## Sub-Tasks

- [x] TASK-351-01: Backup Include Options Schema and Manual Request Contract
- [x] TASK-351-02: Backup Execution, Artifact, Restore, Download, and Delete Contract
- [x] TASK-351-03: Backups Pagination, Queue Health, and Table UX
- [x] TASK-351-04: Backups QA, Docs, and Closure

## Implementation Order

1. Land request/include schema first so the UI can truthfully describe what a
   manual backup contains.
2. Land either a documented external-worker boundary for v1 or an architecture
   update plus execution/artifact lifecycle. Do not silently implement a local
   artifact path while architecture still says metadata-only.
3. Add pagination and worker-health UI after list responses contain enough
   metadata.
4. Close with DB-backed lifecycle tests and Playwright proof.

## Security Contract

Backups are internal admin operations with destructive potential:

- Endpoint visibility: internal admin under `/admin/api/backups*`.
- Auth model: session cookie.
- RBAC: `backups:read` for list/download/schedule reads; `backups:write` for
  create/restore/delete/schedule writes.
- CSRF: required for POST/PATCH/DELETE.
- Rate-limit bucket: `admin_read` for reads, `admin_write` for writes.
- Reject-unknown validation: create/update/delete payloads must keep
  `additionalProperties: false`, bounded include enums, and clamped pagination.
- Anti-abuse: no public write; nonce/HMAC/reCAPTCHA not applicable.
- Secret handling: backup artifacts must not expose storage credentials,
  encrypted secret plaintext, session cookies, or provider keys in UI/API
  payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a` before DB-backed backup tests when `.env`
  exists
- `bun test tests/unit/backups/backupService.test.ts`
- `bun test tests/integration/routes/backups.test.ts`
- `bun run test:vitest -- tests/vitest/admin/backupsClient.test.ts tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx`
- Focused Playwright pass for create, queued/completed states, pagination, and
  restore/download/delete affordances

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_BACKUPS.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- Backup user guide if artifact/restore/delete behavior changes
- `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, and `_docs/SECURITY_SPEC.md` if
  backup artifact policy, include payloads, delete/restore behavior, or worker
  ownership changes
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if Backups becomes an
  admin cached resource; otherwise document the intentional uncached rationale
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Manual backup options are either persisted/sent or removed as unavailable.
- Backups either remain metadata-only with explicit external-worker state,
  worker health, disabled-action reasons, and docs, or architecture/API/security
  docs are updated before implementing local artifact execution.
- Download/restore/delete actions are real when enabled and explain why they are
  disabled otherwise.
- Pagination controls are stateful or hidden/disabled truthfully.

## Closure Notes

Done (2026-06-01): Backups now keep v1 metadata-only architecture explicit:
manual include options are controlled, validated, serialized, and logged as
option keys; queued/running rows show the external-worker boundary and aged
queue warning; restore/download are status-aware and disabled/rejected with
machine-readable reasons until a worker publishes a secure artifact URL; delete
removes only the selected metadata row; list/search pagination is strict and
stateful. Focused browser proof covered include request body
`["database","settings"]`, first/second-page pagination, queued worker copy,
disabled restore/download labels, real delete, zero browser errors, and cleanup
of temporary user/role/session/backup fixtures.
