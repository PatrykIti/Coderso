# TASK-462: Admin Browser Runtime Boundary Hardening
# FileName: TASK-462_Admin_Browser_Runtime_Boundary_Hardening.md

**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Large
**Dependencies:** TASK-399, TASK-409, TASK-458-03, TASK-459-04, TASK-460, TASK-461
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Fix the admin production build failure by restoring the intended boundary
between the browser/admin bundle and server/runtime-only CMS code.

Current reproduction:

```bash
bun --cwd core build:admin
```

Current first hard failure:

```text
[MISSING_EXPORT] "StorageSharedKeyCredential" is not exported by
../node_modules/@azure/storage-blob/dist/browser/index.js
at core/services/media/storage/azure.ts
```

This Azure error is only the first visible symptom. The admin bundle also logs
browser externalization warnings for server-only modules such as DB/postgres,
filesystem storage adapters, `node:crypto`, and auth/runtime services. A quick
debug pass showed that hiding provider imports from Vite can make the build
advance to the next failure (`@node-rs/argon2` browser resolution), which proves
the real issue is architectural drift rather than one Azure SDK export.

The desired product architecture is WordPress-like:

- Admin UI is a browser SPA and must import only browser-safe components,
  clients, DTOs, validation schemas, and pure helpers.
- Server/runtime code owns DB access, Bun/runtime adapters, provider SDKs,
  filesystem storage, password hashing, public rendering fetchers, and plugin
  lifecycle behavior.
- Settings/content/menu/page changes should apply at runtime without rebuilding
  the CMS, unless the runtime code itself changes.
- Build fixes must not rely on Vite/Rolldown externalization, aliases,
  `@vite-ignore`, or browser stubs as the final architecture. Those can be used
  only as temporary diagnostic tools, not as closure criteria.

Known leak candidates to verify and fix:

- `core/services/pages/pageRuntimeDataBinding.ts` mixes browser-safe page
  binding types/helpers with server/runtime resolver loading. Admin Page Editor
  reaches it through page editor preview helpers, and Vite/Rolldown still bundles
  its dynamic `contentListResolver`, `formRuntimeResolver`, and
  `listingRuntimeService` imports into the browser graph.
- `core/services/media/storage/index.ts` statically imports local/S3/Azure
  adapters, which pulls provider SDKs and Node filesystem/crypto modules into
  any import graph that reaches media storage.
- `core/services/content/listingSources.ts` combines browser-safe listing
  metadata with DB/runtime `fetchRows` functions. `queryBuilderService` and
  `filterEngine` sit on admin/runtime-adjacent import paths, so pure
  listing/query helpers can drag server-only source loaders.
- Shared DTO/type owners such as `ContentRouteSetting` currently live in
  runtime settings modules. Browser-adjacent code must import those shapes from
  pure contract modules instead of depending on type-only imports from files
  that statically load DB/cache/runtime services.
- `core/services/settings/securitySettings.ts` imports
  `isPasswordPepperConfigured` from `core/services/auth/password.ts`, which also
  imports `@node-rs/argon2`.
- Content/listing/posts/commerce runtime helpers use server services such as
  `mediaService` as default dependencies. That is correct on the server but
  must not be import-time coupled to admin preview/editor code.

Acceptance criteria:

- `bun --cwd core build:admin` passes without provider-SDK/browser export
  failures.
- The admin build does not need `@vite-ignore`, Vite/Rolldown externals,
  aliases, or browser stubs for `@azure/storage-blob`, `@aws-sdk/client-s3`,
  `@node-rs/argon2`, `postgres`, storage adapters, or DB clients.
- Browser-safe modules used by admin remain import-safe under Vitest and Vite.
- Admin Page Editor, page editor preview helpers, and page renderer imports do
  not reach runtime resolver loaders, DB services, storage adapters, form nonce
  generation, or password hashing through value imports.
- Server/runtime behavior keeps the existing DB-backed, Bun-backed, and
  provider-backed functionality through explicit runtime loaders or injected
  dependencies.
- The implementation preserves existing runtime settings behavior: switching
  storage/listing/menu/site-shell configuration remains runtime data, not a CMS
  rebuild requirement.

---

## Sub-Tasks

- [x] TASK-462-01: Admin build boundary audit and contract freeze.
- [x] TASK-462-01-L01: Map admin browser import graph and server-only leaks.
- [x] TASK-462-02: Browser-safe contracts and server-runtime split.
- [x] TASK-462-02-L01: Extract browser-safe contracts from runtime loaders.
- [x] TASK-462-02-L02: Rewire server runtime loaders and default dependencies.
- [x] TASK-462-03: Admin build validation, docs, and closure.

---

## Architecture

Target dependency direction:

```text
core/admin/**  -> admin clients, UI components, pure schemas/contracts
pure services  -> pure schemas/contracts, injected interfaces
server routes  -> runtime services, DB, provider SDKs, Bun/runtime adapters
runtime render -> runtime services through explicit deps/loaders
```

Forbidden dependency direction:

```text
core/admin/** or admin-imported pure helpers
  -> db/client
  -> media storage adapters
  -> provider SDKs
  -> auth/password hashing
  -> Bun/runtime/server-only modules
```

---

## Security Contract

- **Endpoint visibility:** unchanged; this family should not add public or
  internal endpoints.
- **Auth model:** unchanged admin session, public auth, and API-key behavior.
- **RBAC:** unchanged for media, settings, listings, users, menus, pages, and
  runtime routes.
- **CSRF expectations:** unchanged; no new admin write path.
- **Rate-limit bucket:** unchanged.
- **Validation:** schemas, normalizers, and reject-unknown behavior remain the
  source of truth. Browser-safe extraction must not duplicate or weaken route
  validation.
- **Anti-abuse controls:** public form/booking nonce/captcha and API-key paths
  remain server-only and unchanged.
- **Secret handling:** provider/storage credentials, password pepper, bot
  secrets, API key hashes, DB settings, and signed/runtime-only data must stay
  backend-only and must not enter browser bundles, browser cache, localStorage,
  debug output, or bundle reports.

---

## Testing Requirements

- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- Mandatory static import-boundary guard, expected as
  `bun run check:admin-boundary` unless TASK-462-02 documents an equivalent
  named command. The guard should reject admin-reachable value imports of
  DB/server modules, storage adapters, provider SDKs, auth password hashing,
  `secretStore`, assistant provider loaders, and confirmed runtime resolver
  seams such as `contentListResolver`, `formRuntimeResolver`,
  `listingRuntimeService`, `filterEngine`, and runtime-owned
  `queryBuilderService` entrypoints.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Root typecheck: `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- Targeted Vitest for browser-safe contracts:
  - page runtime binding, page renderer, and page editor preview suites,
  - listing/filter/query pure suites,
  - settings/security client/cache suites,
  - admin UI suites that import affected helpers.
- Targeted Bun for runtime services:
  - media storage resolver/adapters/media service,
  - listing query runtime/content-list runtime,
  - posts feed/product table runtime suites,
  - auth/password and security settings suites.
- Before DB/settings-backed Bun tests, load repo env with:
  `set -a && { [ ! -f .env ] || . ./.env; } && set +a`.
- Re-run `bun run test:bun` and `bun run test:vitest` before closure if the
  split touches shared contracts imported across routes, runtime, and admin UI.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-462*.md`
- `_docs/ARCHITECTURE.md` or `_docs/TESTING_STRATEGY.md` if the final seam adds
  a reusable rule or named boundary.
- `tests/README.md` if a new admin-build/import-boundary validation command or
  test lane is introduced.
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md` when completed.

---

## Closeout Notes

- Restored the admin/browser boundary by moving browser-safe page runtime,
  settings route, form runtime, listing runtime, and listing source contracts
  into pure modules.
- Moved server runtime page data preparation into
  `core/services/pages/pageRuntimeDataPreparation.ts`; admin Page Editor and
  preview helpers now import `pageRuntimeBindingContract` instead of the
  runtime preparer.
- Split password pepper helpers away from `auth/password.ts`, so security
  settings no longer import argon2-backed password hashing for the configured
  status check.
- Added `bun run check:admin-boundary`, a source import graph guard that scans
  admin-reachable static and dynamic imports and rejects DB/server/storage,
  provider SDK, password hashing, secret-store, and runtime resolver seams.
- `bun --cwd core build:admin` now passes without `@vite-ignore`, provider
  externals, browser aliases, or browser stubs for Azure/S3/argon2/postgres.

## Validation Evidence

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
