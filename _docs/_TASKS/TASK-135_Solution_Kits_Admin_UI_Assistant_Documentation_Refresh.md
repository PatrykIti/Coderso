# TASK-135: Solution Kits Admin UI Assistant Documentation Refresh
# FileName: TASK-135_Solution_Kits_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/kits/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Solution Kits surface based
on a real authenticated walkthrough of the local admin UI. The goal is to
replace the old generic article with a more guided document that matches the
shipped kit selector, AI Site Wizard, and selected-kit details workflow.

## Scope

1. Review the current Solution Kits assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/coderso/solution-kits`
   with an authenticated session and record actual behavior.
3. Rewrite `docs/coderso/solution-kits.md` using the `Basic / Medium /
   Instruction / Advanced` structure with more guided user instructions.
4. Close the task after the doc, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the kit-selection flow:
   - kit cards,
   - recommended modules,
   - highlights,
   - selected state.
2. Capture the AI Site Wizard flow:
   - step sequence,
   - business profile selection,
   - locale,
   - optional site name.
3. Capture the selected-kit details panel:
   - business fit,
   - manifest vertical,
   - includes,
   - required/recommended/optional modules,
   - post-install checklist.
4. Rewrite the doc without describing kits as if they fully remove later
   modeling and configuration work.

## Acceptance Criteria

1. The Solution Kits assistant doc describes the current shipped UI rather than
   the old generic workflow summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about kit selection, AI wizard flow, and post-install
   expectations.
4. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Solution Kits UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/kits/*`

## Documentation Updates Required

- `docs/coderso/solution-kits.md`
- `_docs/_TASKS/TASK-135_Solution_Kits_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Solution Kits UI:
  - kit cards,
  - selected kit state,
  - AI Site Wizard,
  - selected kit details panel.
- No automated lint or test commands were run because this is a docs-only draft
  pass pending user review.
