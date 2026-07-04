# TASK-485-02-L02: /admin/api/store/catalog* routes (store:browse)
# FileName: TASK-485-02-L02-Store-Catalog-Routes.md

**Parent Subtask:** TASK-485-02
**Priority:** High
**Category:** Store / Plugins / Admin API
**Estimated Effort:** Medium
**Dependencies:** TASK-485-02-L01 (`storeCatalogService` + error codes).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Expose the catalog service over internal admin routes so the store
  gallery can browse the real registry: `GET /store/catalog` (list),
  `GET /store/catalog/:name` (detail + versions), `GET /store/catalog/:name/
  versions/:version` (single version metadata). Routes are orchestration-only.
- **Owning module(s) to create-or-extend:**
  - **Create** `core/server/routes/storeRoutes.ts` (`registerStoreRoutes`).
  - **Extend** `core/server/routes/index.ts` — import + call
    `registerStoreRoutes(router, { requirePermission: deps.requirePermission })`.
  - **Reuse** `core/server/errorHandler.ts` (`ApiError`) and the L01 service.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/STORE_SPEC.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** install/write (subtask 03), client/cache (L03), the catalog
  normalization itself (L01). **No DB change** (read-only proxy → no migration
  artifacts).

---

## Security Contract

- **Endpoint visibility:** `internal` — `/admin/api/store/catalog`,
  `/admin/api/store/catalog/:name`, `/admin/api/store/catalog/:name/versions/
  :version` (route file registers bare `/store/catalog*`; admin `apiClient`
  prefixes `/admin/api`). No public surface.
- **Auth model:** session cookie (admin middleware).
- **RBAC:** all three routes → `requirePermission("store:browse")` (the catalog
  is browse-only; install requires the separate `plugins:manage` in subtask 03).
- **CSRF:** not required (GET reads only).
- **Rate-limit bucket:** `admin`. The handlers fan out to an **external** store
  service, so they additionally rely on the registry client's own timeout/retry
  (`PLUGIN_DOWNLOAD_TIMEOUT_MS`) and metadata TTL cache to avoid amplification;
  do not add an unbounded loop over versions.
- **Validation:** path params only (`name`, `version`). Reject empty/oversized
  segments before calling the service (e.g. length cap + `^[a-z0-9._-]+$` for
  `name`, semver-ish for `version`) → `store_param_invalid`/400. No request body.
- **Anti-abuse:** these are internal authenticated reads (not public writes), so
  no nonce/HMAC/captcha is required; the `store:browse` gate + `admin` rate-limit
  bucket are the controls. (Per `_docs/SECURITY_SPEC.md`, nonce+HMAC/captcha apply
  to **public** writes — not relevant here.)
- **Secret/PII handling:** response is the secret-free catalog VM from L01 —
  never the download URL, signature keyId, or `STORE_PUBLIC_KEY`. Errors carry a
  stable code only; never echo the raw upstream URL/body.

---

## Implementation Pseudocode

```ts
// core/server/routes/storeRoutes.ts
import { ApiError } from "../errorHandler";
import {
  listCatalog, getCatalogDetail, getCatalogVersion,
  StoreCatalogError, STORE_NOT_CONFIGURED, STORE_UNAVAILABLE, STORE_PLUGIN_NOT_FOUND,
} from "../../services/store/storeCatalogService";

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;
type Router = { get: (p: string, ...h: RouteHandler[]) => void };
export type StoreRouteDeps = { requirePermission: (p: string) => RouteHandler };

const NAME_RE = /^[a-z0-9._-]{1,128}$/i;
const VERSION_RE = /^[a-z0-9][a-z0-9.+-]{0,64}$/i;

function mapStoreError(error: unknown): ApiError | null {
  if (error instanceof StoreCatalogError) {
    const httpByCode: Record<string, number> = {
      [STORE_NOT_CONFIGURED]: 503,
      [STORE_UNAVAILABLE]: 502,
      [STORE_PLUGIN_NOT_FOUND]: 404,
    };
    return new ApiError(error.code, "Store catalog error", httpByCode[error.code] ?? error.status);
  }
  return null;
}

async function withStoreErrors<T>(fn: () => Promise<T>) {
  try { return await fn(); }
  catch (e) { const m = mapStoreError(e); if (m) throw m; throw e; }
}

export function registerStoreRoutes(router: Router, deps: StoreRouteDeps) {
  const { requirePermission } = deps;

  router.get("/store/catalog", requirePermission("store:browse"), async () =>
    withStoreErrors(async () => ({ items: await listCatalog() })));

  router.get("/store/catalog/:name", requirePermission("store:browse"), async (ctx) =>
    withStoreErrors(async () => {
      const name = ctx.params.name;
      if (!NAME_RE.test(name)) throw new ApiError("store_param_invalid", "Invalid plugin name", 400);
      return { item: await getCatalogDetail(name) };
    }));

  router.get("/store/catalog/:name/versions/:version", requirePermission("store:browse"), async (ctx) =>
    withStoreErrors(async () => {
      const { name, version } = ctx.params;
      if (!NAME_RE.test(name) || !VERSION_RE.test(version)) {
        throw new ApiError("store_param_invalid", "Invalid name/version", 400);
      }
      return { version: await getCatalogVersion(name, version) };
    }));
}
```

```ts
// core/server/routes/index.ts  (additions)
import { registerStoreRoutes } from "./storeRoutes";
// inside registerAllRoutes:
registerStoreRoutes(router, { requirePermission: deps.requirePermission });
```

**Data flow:** request → `store:browse` + rate-limit middleware → param guard →
service → secret-free VM. **Error handling:** `withStoreErrors` maps
`StoreCatalogError` to `ApiError` (503/502/404); param errors are direct
`ApiError(...,400)`; unmapped errors rethrow to the global handler.

**Regression-test shape (Bun route lane, L04):** `registerStoreRoutes` wires all
three GETs with `store:browse` captured per route; `store_not_configured` → 503
when `STORE_BASE_URL` unset; bad `:name` → `store_param_invalid`/400; success
payload contains no `download`/`signature`/`checksum` keys.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun lane** (route integration — runtime fan-out to an external client):
  `tests/integration/routes/storeCatalog.test.ts` (registration, RBAC arg,
  param validation, error mapping, no-secret payload). Mock the registry client
  (`core/store/client.ts`) so no real network is hit.
- State in the closeout if any command was skipped or could not run.
