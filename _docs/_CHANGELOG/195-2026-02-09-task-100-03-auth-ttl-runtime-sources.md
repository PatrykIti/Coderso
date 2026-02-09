# 195-2026-02-09 - TASK-100-03 auth TTL runtime sources

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-100-03, TASK-100

## Summary
- Moved session/reset TTL resolution to runtime settings with explicit precedence and safe fallbacks.

## Key Changes
- Core/Auth: Updated `createSession` to resolve TTL using precedence:
  - `input.ttlDays`
  - `settings["auth.sessionTtlDays"]`
  - `security.settings.session.ttlDays`
  - `DEFAULT_SESSION_TTL_DAYS`
- Core/Auth: Added pure resolver `resolveSessionTtlDaysFromSources` with bounded integer handling.
- Core/Auth: Updated password reset flow to use `settings["auth.resetTtlMinutes"]` via `resolveResetTtlMinutes`.
- Core/Auth: Added pure resolver `resolveResetTtlMinutesFromSetting` with bounded minute handling.
- Tests: Added non-DB unit coverage for TTL precedence and bounds in auth services.
- Docs: Updated `_docs/SECURITY_SPEC.md` and `_docs/AUTH_SPEC.md` with runtime TTL policy.
