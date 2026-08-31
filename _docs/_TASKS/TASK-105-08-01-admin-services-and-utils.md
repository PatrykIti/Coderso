# TASK-105-08-01: Admin Services and Utils
# FileName: TASK-105-08-01-admin-services-and-utils.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in `core/admin/services/**` (40 files) and `core/admin/utils/**`
(7 files). These are thin typed browser clients over the shared `apiRequest` seam plus
cache/prefetch helpers. This leaf is test-only: no API surface, no production change.

## Scope

Uncovered-line budget: **931** (869 services + 62 utils).

`core/admin/services/**` (40 files, current covered/total + line%):

| File | Covered/Total | Line% |
|---|---|---:|
| `adminAuthIdentity.ts` | 15/16 | 93.8% |
| `adminExportClient.ts` | 27/43 | 62.8% |
| `adminThemeClient.ts` | 113/123 | 91.9% |
| `analyticsClient.ts` | 125/133 | 94.0% |
| `apiClient.ts` | 88/100 | 88.0% |
| `assistantClient.ts` | 146/154 | 94.8% |
| `authClient.ts` | 52/79 | 65.8% |
| `backupsClient.ts` | 150/166 | 90.4% |
| `bookingClient.ts` | 86/246 | 35.0% |
| `cachePolicy.ts` | 48/50 | 96.0% |
| `commerceClient.ts` | 80/133 | 60.2% |
| `contentTypesClient.ts` | 177/204 | 86.8% |
| `customScreenShortcutsClient.ts` | 14/42 | 33.3% |
| `customScreensClient.ts` | 237/239 | 99.2% |
| `dashboardClient.ts` | 30/64 | 46.9% |
| `detailPagesClient.ts` | 149/153 | 97.4% |
| `entriesClient.ts` | 372/379 | 98.2% |
| `entryData.ts` | 42/45 | 93.3% |
| `formsClient.ts` | 85/154 | 55.2% |
| `importExportClient.ts` | 54/57 | 94.7% |
| `installClient.ts` | 2/17 | 11.8% |
| `integrationsClient.ts` | 5/6 | 83.3% |
| `listingsClient.ts` | 55/177 | 31.1% |
| `mediaClient.ts` | 93/98 | 94.9% |
| `mediaFoldersClient.ts` | 99/102 | 97.1% |
| `menusClient.ts` | 83/96 | 86.5% |
| `pageTemplatesClient.ts` | 75/77 | 97.4% |
| `pagesClient.ts` | 145/153 | 94.8% |
| `popupsClient.ts` | 80/106 | 75.5% |
| `postsClient.ts` | 296/310 | 95.5% |
| `redirectsClient.ts` | 40/46 | 87.0% |
| `reviewsClient.ts` | 53/108 | 49.1% |
| `searchClient.ts` | 84/95 | 88.4% |
| `seoClient.ts` | 79/93 | 84.9% |
| `settingsCache.ts` | 126/130 | 96.9% |
| `siteSettingsClient.ts` | 105/106 | 99.1% |
| `solutionKitSelection.ts` | 57/60 | 95.0% |
| `solutionKitsClient.ts` | 85/153 | 55.6% |
| `starterContentClient.ts` | 0/2 | 0.0% |
| `userSettingsClient.ts` | 27/33 | 81.8% |

`core/admin/utils/**` (7 files):

| File | Covered/Total | Line% |
|---|---|---:|
| `adminPaths.ts` | 73/74 | 98.6% |
| `adminPrefetch.ts` | 130/159 | 81.8% |
| `adminPrefetchCustomScreens.ts` | 3/16 | 18.8% |
| `cacheBus.ts` | 118/119 | 99.2% |
| `requestMetrics.ts` | 73/80 | 91.3% |
| `sessionCache.ts` | 29/31 | 93.5% |
| `storageCache.ts` | 69/78 | 88.5% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 47 source files above (READ-only for all
  other leaves) and of its test files under `tests/vitest/admin/*` (the utils
  suites live under `tests/vitest/admin/`; `tests/vitest/utils/` holds only
  non-test helpers, so no `tests/vitest/utils/*` test claim is made). Ownership is
  by NAMED suite whose subject is one of this leaf's 47 source files; the following
  suites that happen to live in `tests/vitest/admin/` are owned by OTHER leaves:
  `dashboardWidgetRegistry.test.ts` -> TASK-105-08-05,
  `pageSettingsPanel.test.tsx` / `fieldSettingsPanel.test.tsx` /
  `formCanvas.test.tsx` -> TASK-105-08-08, `mediaUtils.test.ts` -> TASK-105-08-06,
  and the `custom-screen-*.test.ts` family (incl. `custom-screen-schemas.test.ts`
  and `custom-screen-binding-contract.test.ts`) -> TASK-105-08-10.
- CARVE-OUT: `tests/vitest/admin/custom-screen-schemas.test.ts` (930 lines) tests
  `core/services/customScreens/**` normalizers and is owned by TASK-105-08-10,
  NOT this leaf.
- Existing suites this leaf may extend (owned by this leaf): `tests/vitest/admin/`
  `bookingClient.test.ts`, `listingsClient.test.ts`, `formsClient.test.ts`,
  `commerceClient.test.ts`, `apiClient.test.ts`, `dashboardClient.test.ts`,
  `backupsClient.test.ts`, `postsClient.test.ts`, `entriesClient*.test.ts`,
  `pagesClient.test.ts`, `authClient.test.ts`, `adminPrefetch.test.ts`,
  `adminPaths.test.ts`, `cacheBus*.test.ts`, `mediaClient.test.ts`, and the
  `cacheRefresh.test.ts` family.
- New suites are named per source module and live next to the existing admin
  suites. No other leaf may edit these test files.

## Pseudocode

Mock seams (verified against source): `apiRequest` re-exported from
`core/admin/services/apiClient.ts` is the single HTTP boundary for clients; cache
clients additionally use `@/utils/storageCache` (`readLocalCache`/`writeLocalCache`/
`clearLocalCache`), `@/utils/cacheBus` (`broadcastCacheEvent`), and
`@/services/cachePolicy` (`cacheKeys`/`cacheTtlMs`). Three clients import named
exports from `apiClient.ts` beyond `apiRequest`: `adminExportClient.ts` and
`entriesClient.ts` import `ApiClientError`, `adminExportClient.ts` also imports
`getCsrfToken`, and `postsClient.ts` imports `isApiClientError`. The shared mock
must therefore also export `ApiClientError`, `getCsrfToken`, and
`isApiClientError` (or the per-file mock must add them).

```ts
// shared per-file pattern (one vitest file per source module or cohesive group)
import { vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/services/apiClient", () => ({ apiRequest }));

const readLocalCache = vi.fn(() => null);
const writeLocalCache = vi.fn();
const clearLocalCache = vi.fn();
vi.mock("@/utils/storageCache", () => ({
  readLocalCache, writeLocalCache, clearLocalCache,
  createMemoryBackedLocalCache: () => ({ read: readLocalCache, write: writeLocalCache, clear: clearLocalCache }),
}));

const broadcastCacheEvent = vi.fn();
vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));
vi.mock("@/services/cachePolicy", () => ({ cacheKeys: { /* per-family */ }, cacheTtlMs: {} }));

import * as subject from "@/services/bookingClient"; // module under test

function ok(body: unknown) { return Promise.resolve(body); }
function fail(code: string, status = 400) { return Promise.reject({ code, status }); }
```

Fixture strategy per resource family (booking, listings, forms, solution-kits,
reviews, commerce, dashboard, content-types, media, search, seo, posts, pages,
entries, etc.): one typed fixture builder returning both the wire payload and the
normalized record; a per-module `ok`/`fail` table drives each `apiRequest` path.

Assertion shape per client method (this is what actually closes the lines):

1. URL + method + body + `withCsrf` flag match the contract exactly (install/auth
   paths assert `withCsrf` is ABSENT; internal write paths assert `withCsrf: true`).
2. Normalizers: malformed wire shapes (`null`, non-object, wrong field type) map to
   the documented normalized default or throw the machine-readable code
   (`install_user_invalid`, etc.).
3. Error mapping: `apiRequest` rejections surface through the client's
   `isApiClientError`/`ApiClientError` path without swallowing `code`.
4. Cache write-through: on cache-enabled clients, a successful write invokes
   `writeLocalCache`/`clearLocalCache` + `broadcastCacheEvent` with the family key,
   and a cache HIT short-circuits `apiRequest` (assert `apiRequest` not called).
5. Pure helpers (`entryData`, `cachePolicy`, `solutionKitSelection`,
   `adminAuthIdentity`, `requestMetrics`, `sessionCache`, `storageCache`,
   `adminPaths`, `cacheBus`) get direct table-driven unit tests with no HTTP mock.

Work order inside the leaf (worst first): `bookingClient` (160 uncovered),
`listingsClient` (122), `formsClient` (69), `solutionKitsClient` (68),
`reviewsClient` (55), `commerceClient` (53), `dashboardClient` (34),
`customScreenShortcutsClient` (28), `installClient` (15), `starterContentClient` (2),
then the near-100% files by remaining gap.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/bookingClient.test.ts`
  (repeat for each owned suite)
- `git diff --check`
- line-count gate: every added/modified file ≤ 1000 lines; split-first, never extend
  an oversized file.

## 1000-Line Rule

If any owned suite would cross 1000 lines while closing its module, split the test
file by cohesive method groups (e.g. `bookingClient.resources.test.ts`,
`bookingClient.services.test.ts`, `bookingClient.schedules.test.ts`) with a shared
fixture module, keeping every part independently runnable.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 47 files reach `100%` lines, except the documented genuinely-unreachable
   residuals listed below.
2. Cache-hit paths assert `apiRequest` was NOT called (no zero-query regression).
3. Error/normalizer paths are behavior-asserted, not skipped.

## Documented Genuinely-Unreachable Residuals

Verified by the orchestrator with empirical probes (Bun 1.x and the Vitest worker
node runtime) after the implementer's re-verification. No `/* istanbul ignore */`
is used anywhere (owner rule); these lines are reported honestly and stay
uncovered. Each line is unreachable through every real seam: the exported public
API, the existing `apiClient` mock seam, and the real storage-cache path (which
always `JSON.parse`es).

| File:Line | Code | Evidence |
|---|---|---|
| `core/admin/services/entryData.ts:12` | `return null` after `!lengthDescriptor \|\| !("value" in lengthDescriptor) \|\| lengthDescriptor.enumerable` | `readArrayChildren` is only reached from `isEntryDataValue`/`isEntryData` through the `Array.isArray(value)` gate. A proxy over an array target makes `"length"` a non-configurable own property, so any descriptor that would satisfy the condition (`undefined`, accessor-only, or `enumerable: true`) throws `TypeError` at `getOwnPropertyDescriptor` and is caught by the caller, never taking this line. A proxy over a non-array target fails `Array.isArray` and never enters `readArrayChildren`. |
| `core/admin/services/entriesClient.ts:500` | `getCachedEntryDetailVersionsMap(typeSlug).set(id, 0)` backfill | Guard requires the detail map to hold `id` while the version map lacks it. Every detail-map writer (`publishEntryDetailValue` 310, storage hydration 510) writes the version map in the same statement pair (311, 511); every deleter removes both maps in pairs (362/363, 449/450); whole-map clears are paired (539/540). No public sequence breaks the invariant. |
| `core/admin/services/mediaFoldersClient.ts:118` | `return false` after `Reflect.ownKeys(value)` catch | `hasExactMediaFolderKeys` is only called from `isCanonicalMediaFolder` inside the cache validator, whose input always comes from `readStorageCacheEnvelope` → `JSON.parse` (plain object, `Reflect.ownKeys` cannot throw). The network normalizer path never calls `hasExactMediaFolderKeys`. |
| `core/admin/services/mediaFoldersClient.ts:135` | `return null` after `Array.isArray(value)` catch | `readDenseArray` receives either the top-level `apiRequest` body or a `JSON.parse`d cache value. A revoked proxy as the API body is adopted as a thenable by promise resolution and rejects before `normalizeMediaFolderList` runs; `JSON.parse` can never produce a proxy. |

These four lines are the complete residual set after L01 implementation; every
other line in the 47 files is covered by behavior-asserted tests.
