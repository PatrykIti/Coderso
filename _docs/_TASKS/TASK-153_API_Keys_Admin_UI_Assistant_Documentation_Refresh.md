# TASK-153: API Keys Admin UI Assistant Documentation Refresh
# FileName: TASK-153_API_Keys_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the API Keys surface based on a
real authenticated walkthrough of the local admin UI. The goal is to split
`/admin/settings/api-keys` out of the old combined integrations article and
replace it with a guided document that matches the shipped key list, create
dialog, and post-create secret handling workflow.

## Scope

1. Review the current combined integrations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/api-keys`
   with an authenticated session and record actual behavior.
3. Create a dedicated API Keys doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/api-keys` points to the new
   canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the API Keys page shell:
   - page header,
   - create action,
   - key table or empty state.
2. Capture the list workflow:
   - key name and prefix,
   - scopes,
   - created date,
   - last used,
   - status,
   - copy/rotate/revoke actions.
3. Capture the create flow:
   - key name,
   - scope selection,
   - validation behavior.
4. Capture the post-create secret contract from the UI/source:
   - one-time visibility,
   - copy action,
   - rotate-if-lost guidance.
5. Rewrite the doc without keeping API Keys mixed into the same assistant page
   as Email, Storage, Integrations, and Webhooks.

## Acceptance Criteria

1. API Keys has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about scope selection, one-time secret visibility, and
   rotate/revoke lifecycle.
4. The coverage matrix points `/settings/api-keys` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local API Keys UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/api-keys.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-153_API_Keys_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local API Keys UI on
  `/admin/settings/api-keys`.
- The walkthrough confirmed:
  - page shell,
  - empty state,
  - create dialog,
  - live scope list and selected-count behavior.
- The one-time secret and lifecycle contract was verified against:
  - `core/admin/ui/settings/ApiKeySecretDialog.tsx`
  - `core/admin/ui/settings/ApiKeysTable.tsx`
  - `core/admin/services/apiKeysClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
