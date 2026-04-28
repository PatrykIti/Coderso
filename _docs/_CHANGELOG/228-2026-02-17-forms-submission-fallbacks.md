# 228-2026-02-17 - Forms submission fallback settings

Date: 2026-02-17
Version: Unreleased
Tasks: TASK-038-06

## Key Changes
- CMS/Forms: Added success message + redirect URL fallback fields on forms.
- Admin/UI: Form settings panel now edits submission success fallback values.
- CMS/Widgets: Form embed uses form-level success message as fallback when widget override is empty.
- Docs: Updated forms API + architecture notes for submission fallback fields.
- Tests: Extended forms service/client and form embed coverage for fallback data.
