# TASK-462-02-L02: Rewire Server Runtime Loaders And Default Dependencies
# FileName: TASK-462-02-L02-Rewire-Server-Runtime-Loaders-And-Default-Dependencies.md

**Parent Subtask:** TASK-462-02
**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Large
**Dependencies:** TASK-462-02-L01
**Status:** ⏳ To Do

---

## Overview

After the pure contracts exist, rewire server/runtime callers to use explicit
server-only loaders and dependency injection. The key goal is that admin UI can
render previews, builders, and forms without pulling DB/storage/auth provider
modules into the browser bundle, while public runtime and admin API behavior
remain fully functional.

---

## Implementation Pseudocode

```text
1. Page runtime preparation:
   - create or keep a server-only page runtime preparation module, for example:
     `core/services/pages/pageRuntimeDataPreparation.ts`
   - move `preparePageRuntimeDocument` and dynamic resolver loading there after
     the pure page binding contract exists
   - this server module may import `contentListResolver`, `formRuntimeResolver`,
     `listingRuntimeService`, nonce/security settings helpers, and DB-backed
     runtime services
   - update `core/server/publicSite.tsx`, runtime preview/site rendering
     callers, and server route code to import the server-only preparer
   - ensure `PageEditor`, page editor preview helpers, and page renderer imports
     cannot reach content/form/listing runtime resolvers, `filterEngine`, or
     runtime-owned `queryBuilderService` entrypoints through value imports

2. Listing runtime execution:
   - create/update server-only executor module, for example:
     `core/services/content/listingQueryRuntimeService.ts`
   - it imports:
     - pure query execution helpers
     - server-only listing source runtime fetchers
   - it exports:
     - `executeListingQuery`
     - `executeListingCorpus`
     - optionally `previewListingQuery`
   - update DB/admin route services to import this runtime executor
   - keep pure query builder usable with injected row resolvers in tests

3. Media storage runtime:
   - keep `core/services/media/storage/index.ts` server-only
   - ensure no admin/browser-imported module imports it at module load
   - if admin needs storage metadata, expose it through admin API/client DTOs
     only, not through adapter imports

4. Content/media defaults:
   - update content-list/posts-feed/commerce runtime helpers so browser-imported
     preview code can pass `getMediaById` from admin cache/client data
   - move DB-backed `getMediaById` defaults to server-only wrappers or lazy
     runtime dependency factories that are not imported by admin bundles

5. Route/runtime caller migration:
   - update routes/public runtime services to import server wrappers
   - update tests to import the layer they actually validate:
     - pure tests -> contract/core helper
     - runtime tests -> server runtime wrapper

6. Admin build gate:
   - run `bun --cwd core build:admin`
   - confirm the build no longer transforms provider/auth/storage modules
     because of admin import graph leakage
   - do not accept `@vite-ignore`, Vite/Rolldown externals, aliases, or browser
     stubs as the final passing condition

7. Static import-boundary guard:
   - add a root script such as `check:admin-boundary` unless an equivalent
     source import-boundary command already exists and is documented
   - implement it as a source/import graph check, not a Vite config workaround
   - fail on admin-reachable value imports of server/runtime-only modules:
     `core/db/**`, `core/server/**`, media storage adapters, provider SDKs,
     `core/services/auth/password.ts`, `core/services/security/secretStore.ts`,
     assistant provider loaders, content/form/listing runtime resolvers,
     runtime-owned query/listing entrypoints, and other confirmed server-only
     seams
   - allow type-only imports only from pure contract owners. If the only current
     owner is a runtime module with side effects or DB/cache imports, move the
     shared type/DTO first instead of adding a fragile guard exception
```

Error handling:

- Preserve machine-readable service errors such as listing validation errors.
- Preserve runtime fail-closed behavior for missing media, missing listing
  queries, unpublished content, and invalid public filters.
- If a dependency is unavailable in admin preview, degrade to the existing
  preview empty/fallback states rather than importing server code.

---

## Security Contract

- **Endpoint visibility:** unchanged; server wrappers are internal modules, not
  public APIs.
- **Auth model:** unchanged.
- **RBAC:** unchanged for admin routes.
- **CSRF:** unchanged for admin writes.
- **Rate-limit bucket:** unchanged.
- **Validation:** listing, media, settings, and runtime payload validation stay
  schema-first.
- **Anti-abuse controls:** public runtime submit/filter behavior keeps existing
  nonce/captcha/API-key/rate-limit handling.
- **Secret handling:** browser bundles must not include storage credentials,
  `AUTH_PASSWORD_PEPPER`, API key hashes, DB clients, or provider SDK clients.

---

## Testing Requirements

- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run check:admin-boundary` or the documented equivalent source
  import-boundary command
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- Targeted Bun:
  - `tests/unit/media/storageResolver.test.ts`
  - `tests/unit/media/azureAdapter.test.ts`
  - `tests/unit/media/s3Adapter.test.ts`
  - `tests/unit/media/mediaService.test.ts`
  - `tests/unit/content/queryBuilderService.test.ts`
  - `tests/unit/content/listingPushdown.test.ts`
  - `tests/unit/auth/password.test.ts`
  - relevant listing runtime/content-list/product-table/posts-feed suites
- Before DB/settings-backed Bun tests, load repo env with:
  `set -a && { [ ! -f .env ] || . ./.env; } && set +a`.
- Targeted Vitest:
  - admin settings/security tests,
  - listing/filter pure UI tests,
  - Page Editor/admin preview suites affected by media/listing helpers.

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-462*.md`
- `tests/README.md` if `check:admin-bundle` becomes an explicit closure gate
  for this boundary class.
