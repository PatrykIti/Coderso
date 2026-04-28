# TASK-142: Audit Logs Admin UI Assistant Documentation Refresh
# FileName: TASK-142_Audit_Logs_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/audit/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Audit Logs surface based on a
real authenticated walkthrough of the local admin UI. The goal is to split
Audit Logs out of the old combined operations article and replace it with a
guided document that matches the shipped filters, table, details drawer, and
export workflow on `/admin/audit`.

## Scope

1. Review the current combined operations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/audit` with an
   authenticated session and record actual behavior.
3. Create a dedicated Audit Logs doc using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Update the coverage matrix so `/audit` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the Audit Logs page shell:
   - export action,
   - search field,
   - date range,
   - event type,
   - severity filters,
   - loading and empty-filter state.
2. Capture the audit table flow:
   - event/category,
   - actor,
   - resource,
   - IP,
   - timestamp,
   - status,
   - row actions and pagination summary.
3. Capture the event details flow:
   - details drawer,
   - metadata section,
   - JSON payload,
   - share/report actions.
4. Capture the export flow:
   - export dialog fields,
   - filename and scope expectations.
5. Rewrite the doc without keeping Audit Logs mixed into the same assistant page
   as Analytics, Backups, and Import/Export.

## Acceptance Criteria

1. Audit Logs has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about filters, table reading, drawer details, and
   export workflow.
4. The coverage matrix points `/audit` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Audit Logs UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/audit/*`

## Documentation Updates Required

- `docs/screens/audit-logs.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-142_Audit_Logs_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Audit Logs UI:
  - page shell,
  - filters,
  - audit table,
  - `Event Details` drawer,
  - `Export Audit Logs` dialog.
- The rewritten doc was verified against:
  - `core/admin/ui/audit/AuditList.tsx`
  - `core/admin/ui/audit/AuditFilters.tsx`
  - `core/admin/ui/audit/AuditTable.tsx`
  - `core/admin/ui/audit/AuditDetailsDrawer.tsx`
  - `core/admin/ui/shared/ExportDialog.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
