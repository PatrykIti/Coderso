# 889. TASK-322-01 admin API session classification

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-322-01

## Key Changes

### Shared admin API client

- The shared admin API client now distinguishes `csrf_refresh`,
  `session_expired`, and `generic_error` failure kinds instead of exposing only
  the old retryable-CSRF path.
- `ApiClientError` instances now carry machine-readable `sharedFailureKind`
  metadata so page-editor and widget consumers can adopt one session-expiry
  contract without local heuristics.

### Tests and docs

- Added focused admin-client coverage for `401 auth_required` classification and
  the shared `isSessionExpiredApiError()` helper.
- Updated the TASK board and parent `TASK-322` breakdown so the shared client
  leaf is now explicitly closed before shell and consumer adoption work.

## Validation

- `bun run test:vitest -- tests/vitest/admin/apiClient.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
