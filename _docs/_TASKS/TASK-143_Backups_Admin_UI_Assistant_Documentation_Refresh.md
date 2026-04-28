# TASK-143: Backups Admin UI Assistant Documentation Refresh
# FileName: TASK-143_Backups_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/backups/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Backups surface based on a
real authenticated walkthrough of the local admin UI. The goal is to split
Backups out of the old combined operations article and replace it with a guided
document that matches the shipped schedule card, recent backups table, and
on-demand backup dialog workflow on `/admin/backups`.

## Scope

1. Review the current combined operations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/backups` with an
   authenticated session and record actual behavior.
3. Create a dedicated Backups doc using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Update the coverage matrix so `/backups` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the Backups page shell:
   - `Create Backup Now`,
   - backup schedule card,
   - storage target selection,
   - storage information notice.
2. Capture the recent backups table flow:
   - search field,
   - backup id,
   - size,
   - created date,
   - status,
   - restore/download actions,
   - pagination footer.
3. Capture the on-demand backup flow:
   - create-backup dialog,
   - included sections,
   - start/cancel actions.
4. Rewrite the doc without keeping Backups mixed into the same assistant page as
   Analytics, Audit Logs, and Import/Export.

## Acceptance Criteria

1. Backups has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about schedule management, backup inventory review, and
   on-demand backup execution.
4. The coverage matrix points `/backups` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Backups UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/backups/*`

## Documentation Updates Required

- `docs/screens/backups.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-143_Backups_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Backups UI:
  - page shell,
  - backup schedule card,
  - recent backups table,
  - `Create Backup Now` dialog.
- The rewritten doc was verified against:
  - `core/admin/ui/backups/BackupsPage.tsx`
  - `core/admin/ui/backups/BackupsTable.tsx`
  - `core/admin/ui/backups/BackupScheduleCard.tsx`
  - `core/admin/ui/backups/BackupNowDialog.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
