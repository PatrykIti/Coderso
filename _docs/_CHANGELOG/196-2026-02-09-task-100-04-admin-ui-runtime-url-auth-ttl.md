# 196-2026-02-09 - TASK-100-04 admin UI runtime URL and auth TTL wiring

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-100-04, TASK-100

## Summary
- Added admin UI wiring for runtime public URL and auth TTL settings with validation-safe save flows.

## Key Changes
- Admin/UI General Settings:
  - Added editable `Public Site URL` field with inline URL validation.
  - Wired `site.publicBaseUrl` through `AdminApp` settings payload mapping.
- Admin/UI Security Settings:
  - Added `Auth Token TTL` card with:
    - `Auth session TTL (days)` (`1..365`)
    - `Password reset TTL (minutes)` (`5..1440`)
  - Wired save flow to persist both `security.settings` and global `auth.*` settings.
  - Added inline validation messaging and autosave guard for invalid TTL ranges.
- Admin/API client:
  - Extended `settingsClient` typings for runtime/auth setting keys.
- Tests:
  - Updated general/security/settings UI render tests for new fields and cards.
- Docs:
  - Updated `_docs/CMS_API.md` and `_docs/SECURITY_SPEC.md` with UI mapping for runtime/auth keys.
