# TASK-152: Login Alerts Admin UI Assistant Documentation Refresh
# FileName: TASK-152_Login_Alerts_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Login Alerts surface based on
a real authenticated walkthrough of the local admin UI. The goal is to split
`/admin/settings/security/login-alerts` out of the broader security article and
replace it with a guided document that matches the shipped alert toggles,
recipient configuration, channel controls, and save workflow.

## Scope

1. Review the current security assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on
   `http://localhost:5173/admin/settings/security/login-alerts` with an
   authenticated session and record actual behavior.
3. Create a dedicated Login Alerts doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/security/login-alerts` points to the
   new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - save/discard actions,
   - local tabs,
   - page header and status badge.
2. Capture the alert policy flow:
   - suspicious login alerts,
   - new device and new location toggles,
   - brute force threshold.
3. Capture the recipients and channels flow:
   - admin-only alerts,
   - custom email list,
   - email/webhook channels.
4. Rewrite the doc without leaving Login Alerts only as a sub-section inside the
   broader Security Settings article.

## Acceptance Criteria

1. Login Alerts has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about alert enablement, threshold behavior, recipients,
   channels, and save/discard flow.
4. The coverage matrix points `/settings/security/login-alerts` at the new
   canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Login Alerts UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/login-alerts.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-152_Login_Alerts_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Login Alerts UI
  on `/admin/settings/security/login-alerts`.
- The walkthrough confirmed:
  - save/discard actions,
  - local tabs,
  - alert toggles,
  - brute-force threshold card,
  - recipients card,
  - notification channels card.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/LoginAlertsPage.tsx`
  - `core/admin/ui/settings/LoginAlertsCard.tsx`
  - `core/admin/services/settingsClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
