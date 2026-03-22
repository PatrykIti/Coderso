# TASK-136: Plugin Store Admin UI Assistant Documentation Refresh
# FileName: TASK-136_Plugin_Store_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/store/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Plugin Store surface based on
a real authenticated walkthrough of the local admin UI. The goal is to split
the old generic store article into route-aligned docs for:
- store catalog,
- plugin details.

## Scope

1. Review the current Plugin Store assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/store`
   - `/admin/store/plugins/:id`
3. Rewrite the store docs into separate catalog and details documents.
4. Update the coverage matrix so both store routes point at the right canonical
   docs.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the store catalog flow:
   - store/installed tabs,
   - plugin cards,
   - selected plugin summary,
   - install/update state.
2. Capture the plugin details flow:
   - overview,
   - permissions,
   - changelog,
   - settings tabs,
   - version/update details.
3. Rewrite the docs without assuming installation is the only relevant action;
   evaluation and governance are also part of the flow.
4. Update route coverage for `/store` and `/store/plugins/:id`.

## Acceptance Criteria

1. Store docs describe the current shipped UI rather than the old high-level
   marketplace summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about catalog review, install/update state, and plugin
   detail evaluation.
4. The coverage matrix points `/store` and `/store/plugins/:id` at the right
   canonical docs.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Plugin Store UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/store/*`

## Documentation Updates Required

- `docs/screens/plugin-store.md`
- `docs/screens/plugin-details.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-136_Plugin_Store_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Plugin Store UI:
  - store catalog,
  - installed/manage flow verified against store source,
  - plugin details page.
- No automated lint or test commands were run because this is a docs-only draft
  pass pending user review.
