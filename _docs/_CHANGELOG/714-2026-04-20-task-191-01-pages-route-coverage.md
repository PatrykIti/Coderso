# 714. TASK-191-01 pages route coverage

Date: 2026-04-20
Version: unreleased
Tasks: TASK-191-01

## Key Changes

### QA / CMS Pages

- Expanded Pages route coverage from endpoint registration to permission,
  validation, authenticated actor, lifecycle, audit, and error-path assertions.
- Added DB-backed route handler coverage for create, update, autosave, publish,
  preview, revision restore/discard, duplicate, unpublish, and delete flows.
- Revalidated Pages security coverage through existing CSRF, rate-limit, and
  security gate suites.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/pages tests/integration/routes/pages.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/security/csrf.test.ts tests/unit/security/rateLimit.test.ts tests/security/codersoSecurityGate.test.ts tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
