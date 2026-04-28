# TASK-146: General Settings Admin UI Assistant Documentation Refresh
# FileName: TASK-146_General_Settings_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the General Settings surface
based on a real authenticated walkthrough of the local admin UI. The goal is to
split General Settings out of the old combined General/Site/Assistant settings
article and replace it with a guided document that matches the shipped site
identity, branding, and auto-save workflow on `/admin/settings` and
`/admin/settings/general`.

## Scope

1. Review the current combined settings assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on:
   - `http://localhost:5173/admin/settings`
   - `http://localhost:5173/admin/settings/general`
   with an authenticated session and record actual behavior.
3. Create a dedicated General Settings doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings` and `/settings/general` point to
   the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the General Settings page shell:
   - settings sidebar,
   - header/breadcrumb copy,
   - topbar status text.
2. Capture the site identity flow:
   - site name,
   - primary locale,
   - timezone.
3. Capture the branding flow:
   - site logo upload,
   - favicon upload/remove.
4. Capture the save flow:
   - auto-save toggle,
   - `Save changes`,
   - saved/error states.
5. Rewrite the doc without keeping General Settings mixed into the same
   assistant page as Site Settings and Assistant Settings.

## Acceptance Criteria

1. General Settings has its own assistant doc that describes the current shipped
   UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about site identity, locale, branding, and auto-save
   behavior.
4. The coverage matrix points `/settings` and `/settings/general` at the new
   canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local General Settings UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/general-settings.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-146_General_Settings_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local General Settings
  UI on `/admin/settings`.
- The walkthrough confirmed:
  - settings sidebar,
  - site identity fields,
  - branding controls,
  - auto-save toggle,
  - save action.
- Route parity for `/settings` and `/settings/general` was verified against
  `core/admin/app/AdminApp.tsx`.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/GeneralSettingsPage.tsx`
  - `core/admin/ui/settings/BrandingCard.tsx`
  - `core/admin/ui/settings/LogoUploadCard.tsx`
  - `core/admin/ui/settings/useSettingsAutoSave.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
