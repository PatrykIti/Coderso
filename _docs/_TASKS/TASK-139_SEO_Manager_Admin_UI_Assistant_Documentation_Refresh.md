# TASK-139: SEO Manager Admin UI Assistant Documentation Refresh
# FileName: TASK-139_SEO_Manager_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/seo/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the SEO Manager surface based on
a real authenticated walkthrough of the local admin UI. The goal is to split
SEO Manager out of the old combined SEO/Redirects article and replace it with a
guided document that matches the shipped audit, filtering, table, and quick-edit
workflow on `/admin/seo`.

## Scope

1. Review the current SEO/Redirects assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/seo` with an
   authenticated session and record actual behavior.
3. Create a dedicated SEO Manager doc using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Update the coverage matrix so `/seo` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the SEO Manager page shell:
   - global scan score,
   - page search input,
   - `Run Full Audit`,
   - status filters,
   - page count / last-scan summary.
2. Capture the SEO table flow:
   - page title/path,
   - SEO score,
   - meta description status,
   - social preview status,
   - edit action.
3. Capture the quick-edit flow:
   - search engine preview,
   - meta title/description counters,
   - focus keywords area,
   - analysis status,
   - save/discard actions.
4. Capture the audit dialog flow:
   - selectable checks,
   - `Start Audit`,
   - expectations around full-site scans.
5. Rewrite the doc without keeping Redirects mixed into the same assistant page.

## Acceptance Criteria

1. SEO Manager has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about auditing, filtering, quick SEO edits, and score
   interpretation.
4. The coverage matrix points `/seo` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local SEO Manager UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/seo/*`

## Documentation Updates Required

- `docs/screens/seo-manager.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-139_SEO_Manager_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local SEO Manager UI:
  - page shell,
  - global scan summary,
  - search and health filters,
  - SEO table,
  - `Run Full Audit` dialog,
  - `Quick SEO Edit` drawer.
- The rewritten doc was verified against:
  - `core/admin/ui/seo/SeoManagerPage.tsx`
  - `core/admin/ui/seo/SeoTable.tsx`
  - `core/admin/ui/seo/SeoDrawer.tsx`
  - `core/admin/ui/seo/SeoAuditDialog.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
