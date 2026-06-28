# TASK-485-01-L01: pluginsClient + server→view-model mapping + cache key/TTL
# FileName: TASK-485-01-L01-Plugins-Client-And-View-Model.md

**Parent Subtask:** TASK-485-01
**Priority:** High
**Category:** Store / Plugins / Admin Client
**Estimated Effort:** Medium
**Dependencies:** None (consumes existing `GET /plugins`).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Create `core/admin/services/pluginsClient.ts` that fetches installed
  plugins from `GET /admin/api/plugins` and maps each server item to the existing
  `InstalledPlugin` view-model, backed by a `plugins:installed:list` cache entry.
- **Owning module(s) to create-or-extend:**
  - **Create** `core/admin/services/pluginsClient.ts` (the client + mapper).
  - **Extend** `core/admin/services/cachePolicy.ts` — add the cache key
    `installedPluginsList: "plugins:installed:list"`.
  - **Reuse (no new VM)** `core/admin/ui/plugins/types.ts` `InstalledPlugin`.
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md`, `_docs/CMS_API.md`,
  `_docs/CODERSO_PLUGIN_CONTRACT.md`.
- **Out of scope:** cacheBus/mount wiring (L02), tests (L03), any write op
  (subtask 03), the store catalog (subtask 02). No change to the route payload.

---

## Security Contract

- **Endpoint visibility:** `internal` — reads `GET /admin/api/plugins` only
  (`apiRequest` prefixes `/admin/api`).
- **Auth model:** session cookie (handled by `apiRequest` `credentials:include`).
- **RBAC:** the route already enforces `plugins:read`; the client adds none.
- **CSRF:** not required (GET / read-only).
- **Rate-limit bucket:** `admin` (server-side, unchanged).
- **Validation:** the client treats the payload defensively — unknown/missing
  fields tolerated by the mapper (server is the schema owner); it never trusts
  client cache as authoritative for security state.
- **Secret/PII handling:** the route payload already omits `integrity`/`signature`
  and raw store URLs; the client must NOT add or persist any secret. `lastError`
  is a truncated diagnostic string (already capped at 2000 chars server-side) —
  store it in cache as-is but never log it verbatim to analytics sinks.

---

## Implementation Pseudocode

```ts
// core/admin/services/pluginsClient.ts
import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";
import type { InstalledPlugin, UpdatePolicy } from "@/ui/plugins/types";

// Shape returned by GET /plugins (core/server/routes/pluginsRoutes.ts)
export type InstalledPluginApiItem = {
  name: string;
  version: string;
  apiVersion: string;
  coreVersion: string;
  enabled: boolean;
  status: "installed" | "disabled" | "error";
  permissions: string[];
  installedAt: string;
  updatedAt: string;
  lastError: string | null;
  errorCount: number;
  contributions: unknown | null;
};

// Map server status ("installed"|"disabled"|"error") -> VM status
// ("enabled"|"disabled"|"error"). "installed" + enabled === true -> "enabled".
function toRuntimeStatus(item: InstalledPluginApiItem): InstalledPlugin["status"] {
  if (item.status === "error") return "error";
  return item.enabled ? "enabled" : "disabled";
}

export function mapInstalledPlugin(
  item: InstalledPluginApiItem,
  policy: UpdatePolicy = "auto-security", // policy comes from plugin_settings via subtask 03; default mirrors resolveUpdatePolicy()
): InstalledPlugin {
  return {
    name: item.name,
    version: item.version,
    status: toRuntimeStatus(item),
    enabled: item.enabled,
    policy,
    lastUpdated: item.updatedAt,            // ISO string; UI formats — no fabricated "Today"
    updateAvailable: undefined,             // filled by catalog cross-ref (subtask 04), not invented here
    permissions: Array.isArray(item.permissions) ? item.permissions : [],
    errorCount: item.errorCount,
    lastError: item.lastError,
  };
}

const cache = createMemoryBackedLocalCache<InstalledPlugin[]>({
  key: cacheKeys.installedPluginsList,   // "plugins:installed:list"
  ttlMs: cacheTtlMs.list,
});

export async function fetchInstalledPlugins(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = cache.read();
    if (cached) return cached;
  }
  const res = await apiRequest<{ items: InstalledPluginApiItem[] }>(
    "/plugins",
    { method: "GET" },
  );
  const mapped = (res.items ?? []).map((i) => mapInstalledPlugin(i));
  cache.write(mapped);
  return mapped;
}

export function peekInstalledPlugins() {
  return cache.read();
}
```

```ts
// core/admin/services/cachePolicy.ts  (add to the cacheKeys object)
installedPluginsList: "plugins:installed:list",
```

**Data flow:** UI → `fetchInstalledPlugins()` → memory/local cache hit OR
`apiRequest("/plugins")` → `mapInstalledPlugin` per item → cache write → array of
`InstalledPlugin`. **Error handling:** `apiRequest` throws `ApiClientError`
(`code/status`); the client rethrows (caller renders the error state in subtask
04). No domain error codes are minted here (read-only proxy).

**Regression-test shape (Vitest):** `mapInstalledPlugin` maps
`status:"installed", enabled:true → "enabled"`, `enabled:false → "disabled"`,
`status:"error" → "error"`; `fetchInstalledPlugins` returns cache on hit and only
calls `apiRequest` on miss/`force`; missing `permissions` coerces to `[]`.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest** (Bun-free; pure TS): add cases in
  `tests/vitest/admin/pluginsClient.test.ts` (created in L03) — mapper truth
  table, cache hit/miss/force, `permissions` coercion. No Bun lane.
