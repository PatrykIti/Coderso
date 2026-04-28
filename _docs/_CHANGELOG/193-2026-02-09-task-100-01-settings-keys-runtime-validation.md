# 193-2026-02-09 - TASK-100-01 settings keys and runtime validation

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-100-01, TASK-100

## Summary
- Added runtime/auth settings keys with strict validation and legacy alias compatibility for base URL.

## Key Changes
- Core/Settings: Extended global settings with `auth.sessionTtlDays`, `auth.resetTtlMinutes`, and `setup.completed`.
- Core/Settings: Added bounded integer validation (`1..365` days, `5..1440` minutes) and strict boolean validation for setup state.
- Core/Settings: Added key alias mapping `site.baseUrl -> site.publicBaseUrl` in read/write flows (`get`, `set`, `bulk`, `delete`).
- Core/API routes: Canonicalized keys in settings routes and audit metadata; exposed route-level key resolver for tests.
- Tests: Expanded `settingsService` coverage for alias behavior, TTL bounds, and duplicate alias/canonical bulk payload rejection.
- Docs: Updated `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, and `_docs/SETTINGS.md` with new settings contract.
