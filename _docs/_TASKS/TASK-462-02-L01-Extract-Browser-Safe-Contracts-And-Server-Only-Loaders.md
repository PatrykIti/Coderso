# TASK-462-02-L01: Extract Browser-Safe Contracts And Server-Only Loaders
# FileName: TASK-462-02-L01-Extract-Browser-Safe-Contracts-And-Server-Only-Loaders.md

**Parent Subtask:** TASK-462-02
**Priority:** High
**Category:** Architecture / Admin Build / Runtime Boundary
**Estimated Effort:** Large
**Dependencies:** TASK-462-01-L01
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Move shared contracts out of modules that also import DB, provider SDKs,
filesystem adapters, or password hashing.

Primary target seams:

- Page runtime binding:
  - keep `PageRuntime*` types, page collection/filter block mapping, layout
    readers, and embed sanitization helpers browser-safe,
  - keep `preparePageRuntimeDocument`, content-list resolver loading, form
    runtime resolver loading, listing filters runtime loading, nonce generation,
    and DB-backed runtime data preparation server-only.
- Listing query/source metadata:
  - keep field allowlists, default fields, default sorts, source IDs, parsers,
    filter matching, query planning contracts, machine-readable query errors,
    and projection logic browser-safe,
  - keep DB-backed `fetchRows`, route validation orchestration, and runtime row
    resolver loading server-only.
- Shared settings/content-route DTOs:
  - keep `ContentRouteSetting` and normalization shapes in pure contract modules
    when they are needed by browser-adjacent matching/cache/render helpers,
  - keep settings persistence, DB/cache reads, and mutation behavior server-only.
- Security password pepper status:
  - expose the ENV presence check from a tiny no-argon2 helper,
  - keep `hashPassword`/`verifyPassword` in the server-only auth/password
    module.
- Media/content runtime types:
  - keep media lookup DTOs/interfaces browser-safe,
  - keep `mediaService` and storage adapter resolution server-only.

---

## Implementation Pseudocode

```text
1. Page runtime binding contract split:
   - create a pure page runtime binding contract module, for example:
     `core/services/pages/pageRuntimeBindingContract.ts`
   - move browser-safe contracts/helpers there:
     - `PageRuntime*` types
     - `mapPageCollectionBlockToContentListData`
     - `mapPageFiltersBlockToListingFiltersData`
     - `readPageFiltersBlockLayout`
     - embed provider/sanitization helpers that do not load runtime data
   - ensure this pure module imports no DB, route, provider, Bun, form nonce,
     media service, storage adapter, security settings, or runtime resolver code
   - update `PageEditor`, `pageEditorCollectionPreview`,
     `pageEditorFormPreview`, `pageRendererV2`, and `core/site/*` type/helper
     imports to use this pure module
   - keep `preparePageRuntimeDocument` and resolver loading out of browser-safe
     imports
   - include listing filters runtime loading in the server-only side of the seam

2. Listing definitions split:
   - create a pure listing source contract module, for example:
     `core/services/content/listingSourceDefinitions.ts`
   - move `fieldAllowlist`, `fieldPrefixAllowlist`, `defaultFields`,
     `defaultSort`, pure query planning/error shapes,
     `getListingSourceDefinition`, and
     `isListingFieldAllowed` into that pure module
   - ensure this module imports no DB, route, provider, Bun, or server services
   - split `queryBuilderService` if needed so `filterEngine` and admin-adjacent
     pure helpers import only pure query contracts/planning/errors, while route
     validation and runtime source execution stay server-owned
   - update pure tests to import the pure definition/query contract module
     instead of runtime `listingSources` or runtime-shaped `queryBuilderService`

3. Listing runtime loader ownership:
   - leave or create a server-only module that attaches `fetchRows` to the pure
     definitions, for example:
     `core/services/content/listingSourceRuntime.ts`
   - this server module may import `entryService`, `postsService`,
     `usersService`, and DB/schema
   - route/runtime services that execute real listings must import the server
     runtime executor, not the browser-safe query contract

4. Shared DTO/type ownership split:
   - move browser-adjacent DTOs/types such as `ContentRouteSetting` into a pure
     contract module, for example `core/services/settings/settingsContracts.ts`
   - update content route matcher/cache/search/content helpers to import type
     and normalization owners from the pure module where possible
   - keep `settingsService.ts` as the server/runtime persistence owner

5. Password pepper split:
   - create a no-argon2 helper such as:
     `core/services/auth/passwordPepper.ts`
   - move only:
     `resolvePasswordPepper`, `applyPasswordPepper`,
     `isPasswordPepperConfigured`
   - make `auth/password.ts` import `applyPasswordPepper`
   - make `settings/securitySettings.ts` import only
     `isPasswordPepperConfigured` from the no-argon2 helper

6. Media lookup contract split:
   - define a browser-safe `ContentMediaLookup` / media DTO owner if needed
   - keep content/media resolver helpers able to accept injected `getMediaById`
   - remove static imports of `mediaService` from admin-imported preview helpers
     where the caller can provide media from admin cache/client data

7. Regression-test shape:
   - add or update pure Vitest/Bun-free tests that import the contract modules
     under browser-like conditions
   - keep existing server/runtime tests for real DB/provider behavior
```

Error handling:

- If a default dependency is required for server runtime, put it in a
  server-only wrapper module instead of a browser-importable pure helper.
- If an old import path is widely used, migrate callers intentionally rather
  than re-exporting server-only behavior from a pure contract module.
- Do not replace real provider/runtime behavior with test-only fallbacks.

---

## Security Contract

- **Endpoint visibility:** unchanged.
- **Auth model/RBAC/CSRF/rate-limit:** unchanged.
- **Validation:** listing query parsing, field allowlists, and unknown-field
  rejection remain strict and deterministic.
- **Secret handling:** password pepper remains ENV-only and never serialized;
  storage credentials and API key hashes remain server-only.
- **Public write hardening:** unchanged nonce/captcha/API-key paths.

---

## Testing Requirements

- Targeted pure suites:
  - page runtime binding/page renderer/page editor preview contract suites
  - `tests/unit/content/queryBuilderService.test.ts`
  - `tests/unit/content/listingSources.test.ts` or its renamed replacement
  - `tests/vitest/search/filterEngine.test.ts`
  - security/settings client/cache tests affected by pepper status
- Targeted runtime suites:
  - listing query service/routes/runtime suites that use real DB-backed rows
  - auth/password tests
  - security settings tests
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/_TASKS/TASK-462*.md`
- `_docs/TESTING_STRATEGY.md` if the pure/server split introduces a reusable
  pattern worth documenting.

---

## Closeout Notes

- Created:
  `core/services/pages/pageRuntimeBindingContract.ts`,
  `core/services/forms/formRuntimeContract.ts`,
  `core/services/settings/settingsContracts.ts`,
  `core/services/search/listingRuntimeContract.ts`,
  `core/services/content/listingQueryContract.ts`, and
  `core/services/content/listingSourceDefinitions.ts`.
- Updated Page Editor, page preview helpers, renderer, site runtime helpers,
  search/filter pure code, and content route helpers to import pure contract
  owners instead of runtime services.
- Added Bun/Vitest regression coverage for pure listing source definitions and
  the new admin boundary import graph guard.
