# TASK-157: Integrations Admin UI Assistant Documentation Refresh
# FileName: TASK-157_Integrations_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Integrations surface based on
a real authenticated walkthrough of the local admin UI. The goal is to split
`/admin/settings/integrations` out of the old combined integrations article and
replace it with a guided document that matches the shipped service catalog,
integration drawer, and request-new flow.

## Scope

1. Review the current combined integrations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/integrations`
   with an authenticated session and record actual behavior.
3. Create a dedicated Integrations doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/integrations` points to the new
   canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the integrations catalog flow:
   - search,
   - category chips,
   - integration cards,
   - connect/configure actions.
2. Capture the integration drawer flow:
   - connection status,
   - config fields,
   - secret-field update behavior,
   - security scopes.
3. Capture the request-new flow:
   - service name,
   - website,
   - notes,
   - submit behavior.
4. Rewrite the doc without keeping Integrations mixed into the same assistant
   page as Email, Storage, API Keys, and Webhooks.

## Acceptance Criteria

1. Integrations has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about integration status, configuration, scope review,
   and request-new workflow.
4. The coverage matrix points `/settings/integrations` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Integrations UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/integrations.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-157_Integrations_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Integrations UI
  on `/admin/settings/integrations`.
- The walkthrough confirmed:
  - integrations catalog,
  - category chips,
  - request-new dialog,
  - provider configuration drawer.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/IntegrationsPage.tsx`
  - `core/admin/ui/settings/IntegrationCard.tsx`
  - `core/admin/ui/settings/IntegrationDrawer.tsx`
  - `core/admin/ui/settings/IntegrationRequestDialog.tsx`
  - `core/admin/services/integrationsClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.

## Follow-up Pass (2026-05-02)

- Re-audited the canonical Integrations assistant doc against the live
  `IntegrationsPage`, drawer, request dialog, and assistant-provider links.
- Corrected drift in `docs/screens/integrations.md` so the doc now covers:
  - the shipped search control,
  - single-provider encrypted secret setup,
  - request-submit success/error behavior,
  - secret-only masking in the drawer.
- Hardened the page so closing and reopening the same drawer/request dialog
  resets transient local state instead of reusing stale edits or stale errors.
- Added behavior coverage for:
  - catalog search and category filtering,
  - drawer open/reopen reset,
  - save payload trimming,
  - request dialog submit/error/reset flow,
  - route validation and error mapping for Integrations endpoints.
