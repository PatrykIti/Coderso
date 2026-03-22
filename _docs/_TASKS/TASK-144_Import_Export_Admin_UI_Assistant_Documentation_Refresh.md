# TASK-144: Import Export Admin UI Assistant Documentation Refresh
# FileName: TASK-144_Import_Export_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/import-export/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Import / Export surface based
on a real authenticated walkthrough of the local admin UI. The goal is to split
Import / Export out of the old combined operations article and replace it with a
guided document that matches the shipped export cards, import preview flow, and
recent imports workspace on `/admin/tools/import-export`.

## Scope

1. Review the current combined operations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/tools/import-export`
   with an authenticated session and record actual behavior.
3. Create a dedicated Import / Export doc using the `Basic / Medium /
   Instruction / Advanced` structure with more guided user instructions.
4. Update the coverage matrix so `/tools/import-export` points to the new
   canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - `Activity Log`,
   - export section,
   - import section.
2. Capture the export flow:
   - export cards,
   - module-specific options,
   - download actions.
3. Capture the import flow:
   - dropzone,
   - supported formats,
   - preview/apply workflow,
   - recent imports table.
4. Rewrite the doc without keeping Import / Export mixed into the same assistant
   page as Analytics, Audit Logs, and Backups.

## Acceptance Criteria

1. Import / Export has its own assistant doc that describes the current shipped
   UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about export scopes, import preview/apply flow, and
   recent import monitoring.
4. The coverage matrix points `/tools/import-export` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Import / Export UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/import-export/*`

## Documentation Updates Required

- `docs/screens/import-export.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-144_Import_Export_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Import / Export
  UI:
  - page shell,
  - export cards,
  - import dropzone,
  - recent imports table.
- The rewritten doc was verified against:
  - `core/admin/ui/import-export/ImportExportPage.tsx`
  - `core/admin/ui/import-export/ExportCards.tsx`
  - `core/admin/ui/import-export/ImportDropzone.tsx`
  - `core/admin/services/importExportClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
