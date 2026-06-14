# TASK-462-01-L01: Map Admin Browser Import Graph And Server-Only Leaks
# FileName: TASK-462-01-L01-Map-Admin-Browser-Import-Graph-And-Server-Only-Leaks.md

**Parent Subtask:** TASK-462-01
**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Medium
**Dependencies:** TASK-462-01
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Create the executable audit map for the admin build failure. The output must
identify which files are browser-safe contracts, which files are server/runtime
loaders, and which current imports cross that boundary.

Initial confirmed evidence:

- `bun --cwd core build:admin` fails on
  `core/services/media/storage/azure.ts` because the admin build resolves the
  browser package entry for `@azure/storage-blob`, where
  `StorageSharedKeyCredential` is unavailable.
- The same build logs externalization warnings for Node-only modules pulled by
  `core/services/media/storage/local.ts`, `core/services/media/storage/s3.ts`,
  `core/services/media/storage/azure.ts`, `core/services/admin/usersService.ts`,
  `core/services/security/secretStore.ts`, DB/postgres, and several runtime
  helpers.
- A diagnostic-only attempt to hide storage imports from Vite made the build
  advance to `@node-rs/argon2`, proving there is more than one server-only leak.
- Confirmed shortest media/provider path:
  `core/admin/main.tsx` -> `AdminApp` -> `adminRouteComponents` -> lazy
  `PageEditor` -> `core/services/pages/pageEditorCollectionPreview.ts` ->
  `core/services/pages/pageRuntimeDataBinding.ts` ->
  dynamic `contentListResolver` import ->
  `core/services/content/contentListResolver.ts` -> `mediaService` ->
  `core/services/media/storage/index.ts` ->
  `core/services/media/storage/azure.ts`.
- Confirmed shortest password-hashing path:
  `PageEditor` -> `pageEditorCollectionPreview` ->
  `pageRuntimeDataBinding.ts` -> dynamic `formRuntimeResolver` import ->
  `core/services/forms/formRuntimeResolver.ts` ->
  `core/services/settings/securitySettings.ts` ->
  `core/services/auth/password.ts` -> `@node-rs/argon2`.
- Confirmed listing-filters path:
  `PageEditor` -> `pageEditorCollectionPreview` ->
  `pageRuntimeDataBinding.ts` -> dynamic `listingRuntimeService` import ->
  `core/services/search/listingRuntimeService.ts` -> `filterEngine` ->
  `core/services/content/queryBuilderService.ts` and runtime listing sources.
- Confirmed shared DTO/type-owner risk:
  `ContentRouteSetting` is exported from `core/services/settings/settingsService.ts`,
  while that module statically owns DB/cache/settings behavior. Browser-adjacent
  imports must use a pure contract owner instead of relying on fragile type-only
  imports from runtime modules.
- Vite/Rolldown bundles dynamic imports into browser chunks, so
  `await import(...)` inside an admin-reachable module is not a server-only
  boundary.

---

## Implementation Pseudocode

```text
1. Reproduce:
   - run `bun --cwd core build:admin`
   - capture first hard failure and relevant preceding server-only warnings
   - re-verify the failure from local command output before TASK-462-02 starts;
     do not rely only on historical logs in this task file

2. Build import ownership map:
   - search admin imports that reach `core/services/**`
   - mark browser-safe modules:
     - DTOs/types
     - validation schemas
     - normalizers/selectors
     - admin clients
     - React/admin components
   - mark server-only modules:
     - `db/client`, `db/schema` when used for live DB work
     - storage adapters and provider SDKs
     - auth password hashing
     - media service writes/reads
     - server route/runtime loaders

3. Trace confirmed leak families:
   - page runtime binding helpers mixed with runtime resolver loading
   - listing filters runtime loading via `listingRuntimeService`, `filterEngine`,
     and runtime-shaped `queryBuilderService`
   - media storage resolver/adapters
   - listing source definitions, pure query planning/errors, and fetchers
   - shared DTO/type owners currently exported from runtime modules, including
     content route settings
   - security settings password-pepper status helper
   - media lookup defaults in content/posts/commerce runtime helpers

4. Contract freeze:
   - for each leak, write the intended seam and final owning module
   - explicitly reject final fixes based on `@vite-ignore`, Vite/Rolldown
     externals, aliases, browser stubs, or SDK-specific tree-shaking assumptions

5. Regression-test shape:
   - define a static import-boundary regression check, e.g.
     `bun run check:admin-boundary`
   - the guard should reject admin-reachable value imports of `core/db/**`,
     `core/server/**`, storage adapters, provider SDKs, auth password hashing,
     `secretStore`, assistant provider loaders, content/form/listing runtime
     resolvers, and runtime-owned query/listing entrypoints unless a narrow
     allowlist is documented with a rationale and a pure-contract migration task
     exists
   - make `bun --cwd core build:admin` plus targeted tests a hard gate, but do
     not use the build alone as the boundary regression check
```

Error handling:

- Do not include secrets, `.env` values, credentials, or raw private logs in the
  audit note.
- Treat build warnings as candidates, not proof. Confirm each actionable leak
  against the source import path.
- Do not edit production code in this leaf beyond task/audit documentation.

---

## Testing Requirements

- `bun --cwd core build:admin` for reproduction.
- `git diff --check`.

---

## Documentation Updates Required

- Closeout notes in `_docs/_TASKS/TASK-462*.md`.
- Temporary root report is allowed only if the import graph cannot fit cleanly
  in the task file; otherwise keep evidence in task closeout.

---

## Closeout Notes

- Confirmed the browser-reachable chain from Page Editor to
  `contentListResolver`, `formRuntimeResolver`, `listingRuntimeService`,
  `mediaService`, storage adapters, and auth password hashing.
- Verified that Vite/Rolldown treats dynamic imports inside admin-reachable
  modules as browser chunks, so `await import(...)` is not a server-only seam.
- Converted this audit into an executable guard in
  `scripts/adminBoundaryReport.ts` / `scripts/check-admin-boundary.ts`.
- Final guard result: `Admin boundary check passed: 690 browser-reachable files
  scanned.`
