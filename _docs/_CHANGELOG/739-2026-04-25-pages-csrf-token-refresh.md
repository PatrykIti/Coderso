# 739 - Pages CSRF token refresh

Date: 2026-04-25
Version: Unreleased
Tasks: SUMMARY-PAGES BUG-6, UX-1 follow-up

## Key Changes

### Admin API Client

- Deduplicated concurrent `GET /admin/api/auth/csrf` requests so parallel admin
  writes reuse one issued CSRF token instead of rotating the session token under
  another request.
- Added retry-once handling for `csrf_invalid` and `csrf_expired` responses:
  the admin client clears the cached token, fetches a fresh token, and replays
  the original request once.
- Kept non-CSRF `403 Forbidden` responses unchanged so RBAC and policy failures
  still surface normally.

## Validation

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/apiClient.test.ts tests/vitest/admin/pagesClient.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
