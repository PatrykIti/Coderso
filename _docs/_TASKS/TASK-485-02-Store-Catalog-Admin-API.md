# TASK-485-02: Store-Catalog Admin API (expose existing registry)
# FileName: TASK-485-02-Store-Catalog-Admin-API.md

**Parent Task:** TASK-485
**Priority:** High
**Category:** Store / Plugins / Admin API
**Estimated Effort:** Large
**Dependencies:** TASK-485-01 recommended (shared cache conventions), not hard.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

The store registry client (`core/store/client.ts`) can already talk to the
external Store backend (`GET {STORE_BASE_URL}/plugins`, `/plugins/:name`,
`/plugins/:name/versions/:version/metadata`) — but **nothing in `/admin` exposes
it**, so the store gallery has no real catalog to browse. This subtask adds the
missing admin-facing proxy:

1. a domain `storeCatalogService` that wraps the registry client, normalizes its
   `StorePluginSummary` / `StoreMetadata` into an admin **catalog view-model**
   (using only real fields — no fabricated `securityScore` / `downloads` /
   `status` from the mock), and maps store/network errors to stable codes;
2. internal `/admin/api/store/catalog*` routes gated on `store:browse`;
3. a cached `storeCatalogClient` admin service mirroring the subtask-01 cache
   conventions.

Routes are **runtime/route-integration** → **Bun lane**; the admin client is pure
TS → **Vitest lane**.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-485-02-L01 | `storeCatalogService` domain (wrap registry client, normalize, error codes) | ⏳ To Do |
| TASK-485-02-L02 | `/admin/api/store/catalog*` routes (`store:browse`) | ⏳ To Do |
| TASK-485-02-L03 | `storeCatalogClient` admin client + cache | ⏳ To Do |
| TASK-485-02-L04 | Catalog route + security tests (Bun) | ⏳ To Do |

---

## Dependencies

- `core/store/client.ts` (`fetchPluginList`, `fetchPluginDetails`,
  `fetchMetadata`, `StorePluginSummary`, `StoreMetadata`).
- `core/store/verifier.ts` (`assertMetadataCompatibility`) +
  `core/plugins/compat.ts` for compatibility flags.
- `core/server/routes/index.ts` (register the new routes), `permissionsCatalog.ts`
  (`store:browse` already exists).
- Admin cache infra (same as subtask 01).

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun:** `tests/integration/routes/storeCatalog.test.ts` (route registration,
  `store:browse` gating, error mapping when `STORE_BASE_URL` unset, no-secret
  payload) + a `tests/security/pluginStore.test.ts` slice.
- **Vitest:** `tests/vitest/admin/storeCatalogClient.test.ts` (mapping + cache).
