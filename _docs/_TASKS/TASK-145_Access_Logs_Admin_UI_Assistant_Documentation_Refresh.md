# TASK-145: Access Logs Admin UI Assistant Documentation Refresh
# FileName: TASK-145_Access_Logs_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/security/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Access Logs surface based on
a real authenticated walkthrough of the local admin UI. The goal is to split
Access Logs out of the old combined operations article and replace it with a
guided document that matches the shipped filters, table, details drawer, and
export workflow on `/admin/access-logs`.

## Scope

1. Review the current combined operations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/access-logs` with an
   authenticated session and record actual behavior.
3. Create a dedicated Access Logs doc using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Update the coverage matrix so `/access-logs` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the Access Logs page shell:
   - export action,
   - search field,
   - user filter,
   - date range,
   - status filter.
2. Capture the access logs table flow:
   - user,
   - IP address,
   - device/browser,
   - timestamp,
   - status,
   - actions,
   - pagination footer.
3. Capture the details drawer flow:
   - status, IP, device, timestamp, request, duration,
   - risk signal section,
   - `View full session` and `Revoke access`.
4. Capture the export flow:
   - export dialog,
   - include fields,
   - file format.
5. Rewrite the doc without keeping Access Logs mixed into the same assistant
   page as Analytics, Audit Logs, Backups, and Import/Export.

## Acceptance Criteria

1. Access Logs has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about filters, table reading, session details, and
   export workflow.
4. The coverage matrix points `/access-logs` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Access Logs UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/security/*`

## Documentation Updates Required

- `docs/screens/access-logs.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-145_Access_Logs_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Access Logs UI:
  - page shell,
  - filters,
  - access logs table,
  - `Access Log Details` drawer,
  - `Export Access Logs` dialog.
- The rewritten doc was verified against:
  - `core/admin/ui/security/AccessLogsPage.tsx`
  - `core/admin/ui/security/AccessLogsTable.tsx`
  - `core/admin/ui/security/AccessLogDetailsDrawer.tsx`
  - `core/admin/ui/shared/ExportDialog.tsx`
  - `core/admin/services/accessLogsClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
