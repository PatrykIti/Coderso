# 1169 - TASK-462 admin browser/runtime boundary hardening

**Date:** 2026-06-13
**Version:** Unreleased
**Tasks:** TASK-462, TASK-462-01, TASK-462-01-L01, TASK-462-02, TASK-462-02-L01, TASK-462-02-L02, TASK-462-03

## Key Changes

### Admin Build Boundary

- Restored the intended boundary between the browser admin SPA and
  server/runtime-only CMS code.
- Added pure contracts for page runtime binding, form runtime resolution,
  content route settings, listing runtime DTOs, listing query parsing, and
  listing source metadata.
- Moved page runtime data preparation and resolver loading into a server-only
  preparer used by public runtime rendering.
- Removed the obsolete mixed page runtime data binding module after callers
  moved to the pure contract/server preparer split.

### Runtime Safety

- Kept DB access, media storage adapters, Azure/S3 provider SDKs, form nonce
  generation, listing source fetchers, and password hashing out of the admin
  browser import graph.
- Split password pepper presence checks from argon2-backed password hashing.
- Added `bun run check:admin-boundary` to reject admin-reachable value imports
  of server/runtime-only modules and provider SDKs.
- Extended the boundary guard to cover assistant provider loader paths after
  final drift review.

### Documentation

- Documented the admin browser/runtime boundary in `_docs/ARCHITECTURE.md`.
- Documented `check:admin-boundary` in `tests/README.md`.
- Closed the TASK-462 task family and synchronized the task board.
- Updated active TASK-459 task contracts to reference the new page runtime
  contract/preparer split instead of the removed mixed binding module.

## Validation

- `bun run check:admin-boundary`
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/content/queryBuilderService.test.ts tests/unit/content/listingSources.test.ts tests/unit/content/listingPushdown.test.ts tests/unit/settings/contentRoutesValidation.test.ts tests/unit/auth/password.test.ts tests/unit/media/storageResolver.test.ts tests/unit/media/azureAdapter.test.ts tests/unit/media/s3Adapter.test.ts tests/unit/media/mediaService.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminBoundaryReport.test.ts tests/vitest/admin/adminBundleReport.test.ts tests/vitest/search/filterEngine.test.ts tests/vitest/pages/page-runtime-data-binding.test.ts tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:bun` - 1128 pass, 1 skip, 0 fail.
- `bun run test:vitest` - 671 files passed, 4085 tests passed.
- Post-drift targeted validation: `bun run check:admin-boundary` and
  `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminBoundaryReport.test.ts`.

## Board

- Done: TASK-462, TASK-462-01, TASK-462-01-L01, TASK-462-02,
  TASK-462-02-L01, TASK-462-02-L02, TASK-462-03.
