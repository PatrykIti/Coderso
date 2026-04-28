# TASK-154: Webhooks Admin UI Assistant Documentation Refresh
# FileName: TASK-154_Webhooks_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Webhooks surface based on a
real authenticated walkthrough of the local admin UI. The goal is to split
`/admin/settings/webhooks` out of the old combined integrations article and
replace it with a guided document that matches the shipped list, drawer, event
trigger, secret, and test-connection workflow.

## Scope

1. Review the current combined integrations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/webhooks`
   with an authenticated session and record actual behavior.
3. Create a dedicated Webhooks doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/webhooks` points to the new
   canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - page header,
   - create action,
   - webhooks table or empty state.
2. Capture the list workflow:
   - URL,
   - events,
   - status,
   - last delivery,
   - edit/delete actions.
3. Capture the drawer workflow:
   - webhook name,
   - endpoint URL,
   - event triggers,
   - signing secret / generate action,
   - enable toggle,
   - test connection,
   - save/delete lifecycle.
4. Rewrite the doc without keeping Webhooks mixed into the same assistant page
   as Email, Storage, Integrations, and API Keys.

## Acceptance Criteria

1. Webhooks has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about events, secrets, delivery state, and
   test-connection workflow.
4. The coverage matrix points `/settings/webhooks` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Webhooks UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/webhooks.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-154_Webhooks_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Webhooks UI on
  `/admin/settings/webhooks`.
- The walkthrough confirmed:
  - page shell,
  - empty state,
  - create drawer,
  - event trigger list,
  - signing secret field and generate action.
- Edit/delete/test lifecycle was verified against:
  - `core/admin/ui/settings/WebhooksPage.tsx`
  - `core/admin/ui/settings/WebhooksTable.tsx`
  - `core/admin/ui/settings/WebhookDrawer.tsx`
  - `core/admin/services/webhooksClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
