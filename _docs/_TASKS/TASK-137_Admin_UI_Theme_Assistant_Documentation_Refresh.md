# TASK-137: Admin UI Theme Assistant Documentation Refresh
# FileName: TASK-137_Admin_UI_Theme_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/themes/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Admin UI Theme surface based
on a real authenticated walkthrough of the local admin UI. The goal is to
replace the old generic article with a more guided document that matches the
shipped template and profile workflow for the admin panel theme.

## Scope

1. Review the current Themes assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/themes` with an
   authenticated session and record actual behavior.
3. Rewrite `docs/screens/themes.md` using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Close the task after the doc, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the current templates flow:
   - template list,
   - search,
   - export,
   - new template.
2. Capture the current profiles flow:
   - active/current labels,
   - new profile,
   - activate action.
3. Rewrite the doc without treating admin theme management as if it were only a
   generic tokens concept.

## Acceptance Criteria

1. The Themes assistant doc describes the current shipped UI rather than the old
   generic workflow summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about template and profile activation flow.
4. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Admin UI Theme screen
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/themes/*`

## Documentation Updates Required

- `docs/screens/themes.md`
- `_docs/_TASKS/TASK-137_Admin_UI_Theme_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Admin UI Theme UI:
  - template list,
  - profiles list,
  - active/current state,
  - export and new actions.
- No automated lint or test commands were run because this is a docs-only draft
  pass pending user review.
