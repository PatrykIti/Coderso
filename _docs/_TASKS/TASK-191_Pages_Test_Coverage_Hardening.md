# TASK-191: Pages Test Coverage Hardening
# FileName: TASK-191_Pages_Test_Coverage_Hardening.md

**Priority:** High
**Category:** QA + CMS/Pages + Runtime + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-002, TASK-010, TASK-053, TASK-105-05, TASK-184-02
**Status:** Done (2026-04-20)

---

## Overview

Close the remaining meaningful test gaps for the Pages surface after the audit of
the shipped `Pages` menu area.

Current targeted validation is green:

- `set -a && source .env && set +a && bun test tests/unit/pages tests/integration/routes/pages.test.ts`
  - `26 pass`, `0 fail`
- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts ...Pages/PageBuilder focused suites...`
  - `34 files passed`, `132 tests passed`

However, the coverage and contract audit found that the Pages surface is not yet
fully guarded:

- `core/server/routes/pageRoutes.ts` is mostly covered only by endpoint
  registration, not handler behavior, permissions, validation, and error paths.
- `core/server/publicSite.tsx` lacks dedicated published/draft/preview page
  runtime coverage.
- `core/admin/services/pagesClient.ts` has low branch coverage around cache,
  invalidation, detail updates, and mutation broadcasts.
- Page Builder UI coverage is strong overall, but branch gaps remain in
  `AdvancedPanel`, `BlockList`, `blockUtils`, and some page shell edges.

The goal is not artificial coverage inflation. The goal is a defensible Pages
test matrix that covers user-visible publishing behavior, draft/preview safety,
admin cache consistency, and editor branch regressions across the correct Bun
and Vitest lanes.

## Sub-Tasks

- `TASK-191-01_Pages_Admin_Route_Contract_and_Security_Coverage.md`
- `TASK-191-02_Public_Page_Runtime_and_Preview_Coverage.md`
- `TASK-191-03_Pages_Admin_Client_Cache_Coverage.md`
- `TASK-191-04_Page_Builder_Branch_Coverage_Closure.md`
- `TASK-191-05_QA_Docs_Changelog_and_Closure.md`

## Architecture

Runner ownership must follow `_docs/TESTING_STRATEGY.md`:

- Bun owns DB-backed service behavior, route handler behavior, runtime public
  rendering, preview token enforcement, rate-limit/CSRF/security gates, and
  any test importing runtime/server modules.
- Vitest owns Bun-free admin UI, admin client wrappers, cache helpers, Page
  Builder component/model behavior, and pure helper branches.

Target contract map:

```text
Pages Admin API
  -> pageRoutes handler tests in Bun
  -> pageService/revision/preview DB tests in Bun
  -> pagesClient cache/CSRF/broadcast tests in Vitest

Public pages runtime
  -> publicSite published/draft/preview behavior in Bun
  -> pure renderPublicPage branch behavior in Vitest

Page Editor and Builder
  -> PageEditor/PageSettings/PageRevision UI in Vitest
  -> builder pure/model/component branch coverage in Vitest
```

## Security Contract

- Visibility: mixed internal/admin and public read-only runtime.
- Internal admin endpoints:
  - `/admin/api/pages*`
  - Auth model: authenticated admin session / admin API key where supported.
  - RBAC: `content:read` for list/detail/template/revisions/preview,
    `content:write` for create/update/autosave/duplicate/delete/restore/discard,
    `content:publish` for publish/unpublish.
  - CSRF: required by the shared admin HTTP middleware for mutating routes.
  - Rate-limit bucket: `admin_read` for reads, `admin_write` for writes.
  - Reject-unknown validation: all create/update/autosave/publish/preview
    payloads must reject unknown fields and invalid page data.
- Public runtime:
  - Published page rendering is public read-only.
  - `/preview` is public read-only but requires a valid hashed preview token,
    matching `targetType`, and preview feature enablement.
  - Rate-limit bucket: `public_read`.
  - Public write hardening: not applicable; this task introduces no public write
    endpoint. Nonce/signature/HMAC and reCAPTCHA remain not applicable.
- Anti-abuse:
  - Destructive admin tests must use disposable test pages and cleanup.
  - No tests may mutate production data; DB-backed suites must load `.env` and
    use deterministic disposable records.
- Secret handling:
  - No secrets, cookies, CSRF tokens, preview tokens, or privileged settings may
    be logged in snapshots or docs beyond synthetic test values.

## Implementation Order

1. Add route/security Bun tests first to lock the server contract.
2. Add public runtime/preview Bun tests for published/draft/current-data
   behavior.
3. Add Vitest coverage for `pagesClient` cache and event branches.
4. Add focused Page Builder branch tests for remaining UI/model gaps.
5. Run target lane checks, update docs/changelog, and close the task board.

## Testing Requirements

- Bun:
  - `set -a && source .env && set +a && bun test tests/unit/pages tests/integration/routes/pages.test.ts`
  - New targeted route/security tests from `TASK-191-01`.
  - New targeted public runtime tests from `TASK-191-02`.
- Vitest:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/pageBuilder`
  - New targeted Vitest suites from `TASK-191-03` and `TASK-191-04`.
- Baseline checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Coverage:
  - `set -a && source .env && set +a && bun run test:coverage`
  - Record final Pages-related file percentages in `TASK-191-05`.

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md` only if runner ownership guidance changes.
- `_docs/CMS_API.md` only if endpoint/error contracts are corrected.
- `_docs/PREVIEW_SPEC.md` only if runtime preview behavior changes.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if cache contract
  behavior changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/*` entries when leaves complete.

## Completion Notes (2026-04-20)

- Completed all `TASK-191` leaves:
  - `TASK-191-01` Pages admin route/security coverage.
  - `TASK-191-02` public page runtime and preview coverage.
  - `TASK-191-03` Pages admin client cache coverage.
  - `TASK-191-04` Page Builder branch coverage closure.
  - `TASK-191-05` final QA/docs/changelog closure.
- No product/API/cache/runtime contract changes were required; the work added
  tests and task/changelog documentation only.
- Final full Vitest coverage snapshot:
  - total: `74.85%` lines / `61.98%` branches,
  - `core/admin/services/pagesClient.ts`: `100%` lines / `76.36%` branches,
  - `core/admin/ui/pages/*`: `95.81%` lines / `83.10%` branches,
  - `core/admin/ui/pages/builder/*`: `96.99%` lines / `83.29%` branches.

## Validation (2026-04-20)

- `set -a && source .env && set +a && bun test tests/unit/pages tests/integration/routes/pages.test.ts tests/integration/runtime/pages-runtime.test.ts tests/unit/security/csrf.test.ts tests/unit/security/rateLimit.test.ts tests/security/codersoSecurityGate.test.ts`
- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-preview.test.tsx`
- `set -a && source .env && set +a && bun run test:coverage`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
