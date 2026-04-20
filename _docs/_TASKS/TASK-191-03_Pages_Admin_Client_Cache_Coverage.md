# TASK-191-03: Pages Admin Client Cache Coverage
# FileName: TASK-191-03_Pages_Admin_Client_Cache_Coverage.md

**Priority:** High
**Category:** QA + Admin/UI + Pages Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-191
**Status:** Done (2026-04-20)

---

## Overview

Close branch gaps in `core/admin/services/pagesClient.ts`.

The targeted coverage audit showed `pagesClient.ts` at roughly `59.64%` lines
and `38.18%` branches for the Pages-focused suite. Existing tests cover basic
endpoint shapes, CSRF for some mutations, revision endpoints, and simple cache
reads. They do not fully cover mutation cache updates, detail/list synchronization,
in-flight dedupe, cache clearing, null/noop responses, or cache bus broadcasts.

## Sub-Tasks

- Expand `tests/vitest/admin/pagesClient.test.ts`.
- Cover list cache behavior:
  - memory cache hit,
  - localStorage cache hit,
  - in-flight `listPagesCached()` dedupe,
  - `force: true` bypass.
- Cover detail cache behavior:
  - `getPageCached()` local cache hit,
  - forced fetch writes list summary and detail cache,
  - `getCachedPageDetail()` reads valid detail and rejects invalid payloads.
- Cover mutations and cache bus events:
  - `updatePage()` upserts list/detail and broadcasts list/detail `update`.
  - `publishPage()` updates cached status to `published`.
  - `unpublishPage()` updates cached status to `draft`.
  - `duplicatePage()` inserts clone and broadcasts clone detail.
  - `restorePageRevision()` upserts restored page and broadcasts.
  - `deletePage()` removes list/detail and broadcasts `invalidate`.
  - noop/null mutation responses do not corrupt cache.
- Cover preview/template endpoints:
  - `previewPage()` with undefined TTL does not accidentally send invalid data
    if the contract is changed during implementation.
  - `getPageTemplateOptions()` hits `/pages/template-options`.
- Cover `clearPagesCache()` resets memory, in-flight promise, and local cache.

## Security Contract

- Visibility: internal admin client wrapper for `/admin/api/pages*`.
- Auth model: browser admin session via shared `apiRequest`.
- RBAC: no client-side authority; server remains authoritative. Tests should
  assert correct endpoint/method use, not duplicate RBAC.
- CSRF: every mutating client call must request `{ withCsrf: true }` and include
  `X-CSRF-Token` via the shared `apiRequest` test harness.
- Rate-limit bucket: server-side `admin_read` / `admin_write`; client tests do
  not bypass server expectations.
- Reject-unknown validation: server-owned, but client tests should not send
  extra fields in normalized payloads.
- Anti-abuse: no public write surface.
- Secret handling: cache entries must not contain secrets, CSRF tokens, or
  preview tokens beyond normal endpoint responses.

## Testing Requirements

- Update:
  - `tests/vitest/admin/pagesClient.test.ts`
- Run:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/admin/pagesClient.test.ts`
  - targeted coverage for this file if needed:
    `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts --coverage tests/vitest/admin/pagesClient.test.ts`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if cache behavior
  changes.
- `_docs/_TASKS/README.md` when status changes.
- `_docs/_CHANGELOG/*` on completion.

## Completion Notes (2026-04-20)

- Expanded `tests/vitest/admin/pagesClient.test.ts` from endpoint smoke coverage
  to cache lifecycle coverage.
- Covered in-flight list dedupe, forced list refresh, detail fetch cache
  hydration, mutation list/detail synchronization, cache bus broadcasts, noop
  mutation responses, cache clearing, and template-options fetch behavior.
- Targeted `pagesClient.ts` coverage now reports `100%` lines, `100%`
  functions, and `76.36%` branches in the focused coverage run.
- No admin cache contract changes were required.

## Validation (2026-04-20)

- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/admin/pagesClient.test.ts`
- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts --coverage tests/vitest/admin/pagesClient.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
