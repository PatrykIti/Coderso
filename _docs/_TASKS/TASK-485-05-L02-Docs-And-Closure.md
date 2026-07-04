# TASK-485-05-L02: Docs sync + closure gate matrix
# FileName: TASK-485-05-L02-Docs-And-Closure.md

**Parent Subtask:** TASK-485-05
**Priority:** High
**Category:** Store / Plugins / Docs & Closure
**Estimated Effort:** Small
**Dependencies:** TASK-485-01..04, TASK-485-05-L01.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Sync the docs to the shipped contract and record the final gate
  matrix so TASK-485 can close.
- **Owning module(s) to create-or-extend:** documentation only (plus the closure
  note in the umbrella).
- **Source-of-truth docs (to update):** `_docs/CMS_API.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, `_docs/STORE_SPEC.md`,
  `_docs/CODERSO_PLUGIN_CONTRACT.md`.
- **Out of scope:** code changes (done in 01–04), `_docs/_TASKS/README.md` and
  `_docs/_CHANGELOG/` (board + changelog are synced by the orchestrator — do NOT
  hand-edit them in this leaf).

---

## Security Contract

Docs-only leaf — no endpoint/auth/data change. Ensure the documented RBAC matrix
(`plugins:read` / `store:browse` / `plugins:manage`), CSRF-on-writes, and the
no-secret payload guarantee match the shipped code exactly.

---

## Implementation Pseudocode

```text
CMS_API.md:
  - GET  /admin/api/plugins                      (plugins:read)   -> { items: [...] }
  - GET  /admin/api/store/catalog                (store:browse)   -> { items: [...] }
  - GET  /admin/api/store/catalog/:name          (store:browse)   -> { item }
  - GET  /admin/api/store/catalog/:name/versions/:version (store:browse) -> { version }
  - POST /admin/api/plugins/install              (plugins:manage, CSRF) { name, version }
  - POST /admin/api/plugins/:name/update         (plugins:manage, CSRF) { version, force? }
  - POST /admin/api/plugins/:name/uninstall      (plugins:manage, CSRF)
  - POST /admin/api/plugins/:name/enabled        (plugins:manage, CSRF) { enabled }
  - PUT  /admin/api/plugins/:name/policy         (plugins:manage, CSRF) { policy }
  - document error codes: store_not_configured/503, store_unavailable/502,
    store_plugin_not_found/404, store_param_invalid/400, store_signature_invalid/400,
    store_checksum_mismatch/400, plugin_incompatible/409, plugin_update_skipped/409,
    plugin_not_found/404, plugin_install_failed/502.

ADMIN_CACHE.md / ADMIN_CACHE_MAP.md:
  - new keys: plugins:installed:list, store:catalog:list, store:catalog:detail:<name>
  - TTL = cacheTtlMs.list; cacheBus topics; Plugin Store route->files->cached-API row.

STORE_SPEC.md / CODERSO_PLUGIN_CONTRACT.md:
  - note the admin-facing catalog VM mapping (real fields only; no securityScore/
    downloads/status invention).
  - document the v1 uninstall limitation: runtime files + DB row removed; an
    already-loaded module's in-memory contributions clear on next process start
    (no hot-unload).
```

**Closure gate matrix (record results in the umbrella closeout):**

```text
[ ] bun --cwd core lint
[ ] bun --cwd core lint:types
[ ] bun test tests/integration/routes/pluginsRoutes.test.ts
[ ] bun test tests/integration/routes/storeCatalog.test.ts
[ ] bun test tests/integration/plugins/pluginLifecycle.test.ts
[ ] bun test tests/security/pluginStore.test.ts
[ ] bun test tests/security/codersoSecurityGate.test.ts
[ ] vitest tests/vitest/admin/pluginsClient.test.ts
[ ] vitest tests/vitest/admin/storeCatalogClient.test.ts
[ ] vitest tests/vitest/services/storeCatalogService.test.ts
[ ] vitest tests/vitest/ui-integration/plugin-store-rewire.test.tsx
[ ] PluginStorePage.tsx contains zero hardcoded catalog/installed arrays
```

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types` (docs leaf still runs the
  cheap gates to confirm nothing drifted).
- Re-run the full matrix above; record pass/skip per line in the closeout.
- State explicitly if any command was skipped or could not run.
