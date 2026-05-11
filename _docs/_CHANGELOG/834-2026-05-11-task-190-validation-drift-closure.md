# 834 - TASK-190 validation drift closure

Date: 2026-05-11
Version: Unreleased
Tasks: TASK-190, TASK-190-05, TASK-190-07, TASK-190-08

## Key Changes

### Assistant/Core
- Rejected invalid `setting.content-route.upsert.detailPageId` values at the
  assistant action schema and route boundary before settings service work.
- Aligned `page.upsert` action-family metadata with the real strict page schema,
  including optional collection-link and listing locator handling.
- Tightened detail-page route validation so unknown top-level document fields
  are rejected before service normalization.
- Added dedicated detail-page preview coverage for document title and SEO field
  mappings.

### QA/Tooling
- Forced `NODE_ENV=test` in `bun run test:vitest` after `.env` loading so
  production shell environments cannot disable React `act` or test-only
  blueprint-shadow diagnostics.
- Added an explicit `15000ms` timeout to the serialized `test:bun` DB/runtime
  lane after the full gate exposed multiple real DB-backed tests as
  default-timeout flakes.

### Validation
- Passed targeted Bun route/runtime coverage (`42` tests, `178` assertions) and
  targeted Vitest assistant schema/contract coverage (`2` files, `54` tests).
- Passed `bun run lint`.
- Passed `bun run test:bun` outside the sandbox with `.env` loaded (`763` tests
  across `204` files, `2956` assertions).
- Passed full `bun run test:vitest` (`582` files, `2611` tests).
- Passed `bun run scan:security:strict` clean across Semgrep, `bun audit`,
  Trivy vulnerability/config/secret scans, and Gitleaks history/worktree scans.
  Container image scanning remained intentionally skipped because
  `SECURITY_SCAN_IMAGE` was not set.
