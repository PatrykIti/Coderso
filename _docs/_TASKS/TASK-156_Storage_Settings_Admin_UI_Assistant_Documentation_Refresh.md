# TASK-156: Storage Settings Admin UI Assistant Documentation Refresh
# FileName: TASK-156_Storage_Settings_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Storage Settings surface
based on a real authenticated walkthrough of the local admin UI. The goal is to
split `/admin/settings/storage` out of the old combined integrations article and
replace it with a guided document that matches the shipped provider-selection,
credentials, upload-policy, and connection-test workflow.

## Scope

1. Review the current combined integrations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/storage`
   with an authenticated session and record actual behavior.
3. Create a dedicated Storage Settings doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/storage` points to the new canonical
   doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the storage page shell:
   - provider cards,
   - provider configuration panel,
   - upload policies panel,
   - save/autosave flow.
2. Capture the provider flow:
   - local,
   - S3,
   - Azure,
   - test connection,
   - note panels.
3. Capture the global upload-policy flow:
   - storage file URL override,
   - max upload size,
   - allowed MIME types.
4. Rewrite the doc without keeping Storage mixed into the same assistant page as
   Email and Integrations.

## Acceptance Criteria

1. Storage Settings has its own assistant doc that describes the current shipped
   UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about provider choice, secret handling, upload policy,
   and migration caveats.
4. The coverage matrix points `/settings/storage` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Storage Settings UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/storage-settings.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-156_Storage_Settings_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Storage
  Settings UI on `/admin/settings/storage`.
- The walkthrough confirmed:
  - provider cards,
  - local storage panel,
  - Amazon S3 panel,
  - Azure Blob panel,
  - upload policies,
  - security summary,
  - test connection action.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/StorageSettingsPage.tsx`
  - `core/admin/ui/settings/StorageProviderCard.tsx`
  - `core/admin/services/settingsClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
