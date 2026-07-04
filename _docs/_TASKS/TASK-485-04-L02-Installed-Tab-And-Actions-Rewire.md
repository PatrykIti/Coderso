# TASK-485-04-L02: Installed tab + detail actions → lifecycle clients
# FileName: TASK-485-04-L02-Installed-Tab-And-Actions-Rewire.md

**Parent Subtask:** TASK-485-04
**Priority:** High
**Category:** Store / Plugins / Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-485-01 (`pluginsClient`), TASK-485-03-L02 (lifecycle
routes), TASK-485-04-L01 (store tab + catalog client).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Delete `installedSeed` and the five local-only handlers; wire the
  Installed tab to `pluginsClient` and the detail actions
  (install/update/uninstall/enable-toggle/policy) to a thin lifecycle client over
  the subtask-03 routes. After each successful write, invalidate the installed +
  catalog caches so both tabs refresh.
- **Owning module(s) to create-or-extend:**
  - **Create** `core/admin/services/pluginLifecycleClient.ts` —
    `installPlugin`, `updatePlugin`, `uninstallPlugin`, `setPluginEnabled`,
    `setPluginPolicy`, each an `apiRequest(..., { withCsrf:true })` wrapper that
    calls `invalidateInstalledPlugins()` (+ `invalidateStoreCatalog()` for
    install/uninstall) on success.
  - **Edit** `core/admin/ui/store/PluginStorePage.tsx` (replace `installedSeed`
    + handlers with the real client calls + `fetchInstalledPlugins`).
  - **Create** `core/admin/ui/plugins/hooks/useInstalledPlugins.ts` (list +
    cacheBus subscribe + status, mirroring `useStoreCatalog`).
  - **Reuse** `PluginList` / `PluginDetail` props (unchanged).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/ADMIN_CACHE.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** store-tab browse (L01), tests (L03), route logic (subtask 03).

---

## Security Contract

- **Endpoint visibility:** UI consumer of internal `/admin/api/plugins/*` writes
  (`plugins:manage`) and `GET /admin/api/plugins` (`plugins:read`).
- **Auth model:** session (via `apiRequest`).
- **CSRF:** every write goes through `apiRequest(..., { withCsrf:true })`
  (`X-CSRF-Token`). A read-only operator (lacking `plugins:manage`) must see the
  action controls disabled and a `permission_denied` failure surfaced via the
  shared admin failure channel (`classifyAdminApiFailure`), not a silent no-op.
- **Validation:** the client sends only `{ name, version }` / `{ version, force }`
  / `{ enabled }` / `{ policy }`; the server schema is authoritative (.strict).
  No client-supplied package/URL is ever sent (install is `(name, version)` only).
- **Secret/PII handling:** the client persists only the secret-free installed VM;
  never logs `lastError` to analytics verbatim; cacheBus carries keys only.

---

## Implementation Pseudocode

```ts
// core/admin/services/pluginLifecycleClient.ts
import { apiRequest } from "./apiClient";
import { invalidateInstalledPlugins } from "./pluginsClient";
import { invalidateStoreCatalog } from "./storeCatalogClient";

export async function installPlugin(name: string, version: string) {
  const res = await apiRequest<{ item: unknown }>("/plugins/install",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, version }) },
    { withCsrf: true });
  invalidateInstalledPlugins(); invalidateStoreCatalog();
  return res.item;
}

export async function updatePlugin(name: string, version: string, force?: boolean) {
  const res = await apiRequest<{ item: unknown }>(`/plugins/${encodeURIComponent(name)}/update`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version, force }) },
    { withCsrf: true });
  invalidateInstalledPlugins();
  return res.item;
}

export async function uninstallPlugin(name: string) {
  await apiRequest<{ ok: true }>(`/plugins/${encodeURIComponent(name)}/uninstall`,
    { method: "POST" }, { withCsrf: true });
  invalidateInstalledPlugins(); invalidateStoreCatalog();
}

export async function setPluginEnabled(name: string, enabled: boolean) {
  const res = await apiRequest<{ item: unknown }>(`/plugins/${encodeURIComponent(name)}/enabled`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) },
    { withCsrf: true });
  invalidateInstalledPlugins();
  return res.item;
}

export async function setPluginPolicy(name: string, policy: string) {
  const res = await apiRequest<{ policy: string }>(`/plugins/${encodeURIComponent(name)}/policy`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ policy }) },
    { withCsrf: true });
  invalidateInstalledPlugins();
  return res.policy;
}
```

```tsx
// PluginStorePage.tsx (installed tab + handlers)
const { items: installedPlugins, status } = useInstalledPlugins();
const handleInstall = (version: string) => selectedStore && installPlugin(selectedStore.name, version);
const handleUpdate  = (version: string) => selectedInstalled && updatePlugin(selectedInstalled, version);
const handleUninstall = () => selectedInstalled && uninstallPlugin(selectedInstalled);
const handleToggleEnabled = (enabled: boolean) => selectedInstalled && setPluginEnabled(selectedInstalled, enabled);
const handlePolicyChange = (p: UpdatePolicy) => selectedInstalled && setPluginPolicy(selectedInstalled, p);
// remove installedSeed + the local-only mutation handlers entirely.
```

**Data flow:** action → lifecycle client (`withCsrf`) → route → on success
invalidate caches → cacheBus → `useInstalledPlugins` / `useStoreCatalog` refetch
→ UI updates. Optimistic update is optional; the cacheBus refetch is the source of
truth. **Error handling:** typed `ApiClientError` codes
(`store_checksum_mismatch`, `plugin_update_skipped`, `permission_denied`, ...)
surface a toast/inline message; never swallow.

**Regression-test shape (Vitest, L03):** install calls the client + refreshes the
installed list; uninstall removes the row from the list after invalidation;
toggle/policy persist via the client; a `plugin_update_skipped` shows the
policy-blocked message.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest (ui-integration):** assertions in L03's
  `tests/vitest/ui-integration/plugin-store-rewire.test.tsx` (mock the lifecycle
  + installed clients). No Bun lane (the runtime path is covered by subtask 03).
