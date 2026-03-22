# TASK-155: Email Settings Admin UI Assistant Documentation Refresh
# FileName: TASK-155_Email_Settings_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Email Settings surface based
on a real authenticated walkthrough of the local admin UI. The goal is to split
`/admin/settings/email` out of the old combined integrations article and
replace it with a guided document that matches the shipped SMTP, sender,
delivery-log, and test-email workflow.

## Scope

1. Review the current combined integrations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/email`
   with an authenticated session and record actual behavior.
3. Create a dedicated Email Settings doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/email` points to the new canonical
   doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - connected/setup badge,
   - SMTP configuration card,
   - sender info,
   - test-email area.
2. Capture the SMTP flow:
   - host,
   - port,
   - encryption,
   - username,
   - password update toggle.
3. Capture the operational flow:
   - test recipient,
   - send test,
   - logs drawer,
   - export logs action.
4. Rewrite the doc without keeping Email Settings mixed into the same assistant
   page as Storage, Integrations, and Webhooks.

## Acceptance Criteria

1. Email Settings has its own assistant doc that describes the current shipped
   UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about SMTP setup, sender defaults, test email flow, and
   delivery logs.
4. The coverage matrix points `/settings/email` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Email Settings UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/email-settings.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-155_Email_Settings_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Email Settings
  UI on `/admin/settings/email`.
- The walkthrough confirmed:
  - SMTP configuration card,
  - sender info section,
  - test email card,
  - connection status panel,
  - security note,
  - delivery logs drawer.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/EmailSettingsPage.tsx`
  - `core/admin/ui/settings/SmtpCard.tsx`
  - `core/admin/ui/settings/EmailLogsDrawer.tsx`
  - `core/admin/services/emailClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
