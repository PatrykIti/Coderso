# TASK-485: Plugin Store — Wire Admin UI to Real Registry & Install Pipeline
# FileName: TASK-485_Plugin_Store_Real_Registry_And_Install_Pipeline.md

**Priority:** High
**Category:** Store / Plugins
**Estimated Effort:** Large
**Dependencies:** None hard. Lands on top of the existing store kernel
(`core/store/*`, `core/plugins/installService.ts`, `core/server/routes/pluginsRoutes.ts`,
`plugins`/`plugin_settings` tables). Visually consumes the TASK-479-24 reskin if/when
that ships, but is independent of it (479-24 is presentation-only and explicitly
preserves "the cache contract if/when a real `storeClient` is wired" — this task IS
that wiring).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD, set when work begins>`
**Completed:** `<YYYY-MM-DD, set at closure>`

---

## Business Goal

The admin **Plugin Store** screen is the only way a CMS operator installs,
updates, and manages plugins — yet today it is **100% mock**. Wire it to the real
registry + install pipeline that already exists so operators can actually browse
the store catalog, install/update/uninstall plugins through the verified
(signature + checksum + compatibility) pipeline, toggle enablement, and set
per-plugin update policies — with no fabricated data.

---

## Scope

### What already exists (do NOT rebuild — reuse)

- **Store registry HTTP client** — `core/store/client.ts`: `fetchPluginList()`
  (`GET {STORE_BASE_URL}/plugins`), `fetchPluginDetails(name)`,
  `fetchMetadata(name, version)`, `fetchMetadataSignature`, `fetchRevocations`,
  `clearStoreCache()`, with in-process metadata/revocation TTL caches and types
  `StoreMetadata` / `StorePluginSummary`.
- **Security pipeline** — `core/store/verifier.ts` (`assertMetadataSignature`
  ed25519, `assertChecksum` sha256, `assertMetadataCompatibility`),
  `core/store/downloader.ts` (`downloadBytes` size-capped, `unzipToDirectory`
  zip-slip guarded), `core/store/updater.ts` (`resolveUpdatePolicy`,
  `shouldAutoUpdate`, `UpdatePolicy = "manual" | "auto-security" | "auto-all"`).
- **Install service** — `core/plugins/installService.ts`:
  `installPluginFromStore(name, version, opts)`, `updatePluginFromStore(...)`,
  `applyRevocations()` (audit-logged: `plugins.install` / `plugins.update` /
  `plugins.disable`).
- **Registry + tables** — `core/plugins/registry.ts` (`listPlugins`,
  `getPluginByName`, `registerPlugin`, `setPluginEnabled`, `setPluginStatus`,
  `getPluginSetting` / `setPluginSetting` / `listPluginSettings`) over the
  `plugins` and `plugin_settings` tables (`core/db/schema.ts`).
- **Installed-plugins read route** — `GET /plugins` in
  `core/server/routes/pluginsRoutes.ts` (`requirePermission("plugins:read")`)
  returning `{ items: [...] }`, plus `POST /plugins/manifest/validate`.
- **Permissions** — `core/services/admin/permissionsCatalog.ts` already defines
  `plugins:read`, `plugins:manage`, `store:browse`.

### What TASK-479-24 (reskin) covers vs what THIS task adds

`TASK-479-24` is a **presentation-only** restyle of `PluginStorePage` and its
children to the prototype look; it explicitly preserves data, behavior, RBAC,
routes, and "any cache keys/TTL that a real `storeClient` would use" and does NOT
introduce a new fetch/data source. **TASK-485 is the data/behavior counterpart**:
it replaces the hardcoded `catalog` / `installedSeed` mock arrays with real
clients, adds the missing store-catalog API + lifecycle write API, and wires the
page to them. The two are independent and compose (485 supplies the data the
reskinned shell renders).

### In scope

- A real **installed-plugins admin client** + cache contract over `GET /plugins`.
- A new **store-catalog admin API** that exposes the existing external registry
  (`core/store/client.ts`) to the admin under internal `/admin/api/store/*`,
  plus its cached admin client.
- New **install / update / uninstall / enable-toggle / update-policy** lifecycle
  routes wired to `installService` + a thin lifecycle service (adds the missing
  `uninstall` and per-plugin policy persistence — reusing `plugin_settings`, **no
  new table**).
- **Rewire** `PluginStorePage` + `PluginDetail` to the real clients (remove every
  mock array), with loading/empty/error states and cacheBus invalidation.
- Tests: **Bun** for the plugin lifecycle + security + catalog routes; **Vitest**
  for the admin clients + UI rewire. Docs sync.

### Out of scope

- Changes to the **publish-side** store service (the external Store backend) or
  the metadata/signature format (`_docs/STORE_SPEC.md`) — we only consume it.
- The **page-builder widget** subsystem (`core/widgets/*`) — different subsystem.
- Untrusted-code sandboxing (explicit non-goal of STORE_SPEC; trust-by-curation).
- Automatic background auto-update scheduling/cron (the `applyRevocations` /
  `auto-*` policy *evaluation* already exists; surfacing a scheduler UI is a
  separate future task). This task wires **policy persistence + manual** flows and
  respects the existing policy gate on update.

---

## Security Contract (umbrella overview — per-leaf contracts are authoritative)

- **Endpoint visibility:** `internal` — every route lives under `/admin/api/*`
  (admin `apiClient` prefixes `/admin/api`; route files register bare paths).
  No public surface is added.
- **Auth model:** session cookie (httpOnly), same as all existing admin routes.
- **RBAC:**
  - Installed-plugins read → `plugins:read` (matches existing `GET /plugins`).
  - Store catalog browse → `store:browse`.
  - Install / update / uninstall / enable-toggle / set-policy → `plugins:manage`
    (this is the "plugins:write equivalent"; the catalog has no `plugins:write`).
- **CSRF:** required on every write (`apiRequest(..., { withCsrf: true })` →
  `X-CSRF-Token`), enforced by the central CSRF middleware.
- **Rate-limit bucket:** `admin`.
- **Validation:** schema-first, **reject-unknown** (`.strict`); all schemas/enums/
  defaults/`normalize*` owned in the domain/service modules; route validation
  files only re-export them.
- **Store-security pipeline is mandatory:** install/update MUST flow through
  `assertMetadataSignature` + `assertChecksum` + `assertMetadataCompatibility`
  (already enforced inside `installPluginFromStore`); lifecycle routes must NOT
  bypass it. Plugin install is a runtime-kernel operation → **Bun-lane tests are
  mandatory** for install/upgrade/rollback/uninstall.
- **Secret/PII handling:** `STORE_PUBLIC_KEY` / signatures / file URLs never go to
  the client cache or logs as secrets; the installed-plugins payload already omits
  `integrity`/`signature` and must keep doing so. Catalog metadata is public store
  data (safe to cache), but the admin catalog VM must not invent metrics.

---

## Sub-Tasks

| Subtask | Title | Effort | Status |
|---------|-------|--------|--------|
| TASK-485-01 | Installed-Plugins Admin Client & Cache Contract | Medium | ⏳ To Do |
| TASK-485-02 | Store-Catalog Admin API (expose existing registry) | Large | ⏳ To Do |
| TASK-485-03 | Install / Update / Uninstall Lifecycle API | Large | ⏳ To Do |
| TASK-485-04 | PluginStorePage & Details Rewire to Real Data | Large | ⏳ To Do |
| TASK-485-05 | Security, Perf, Docs & Closure | Medium | ⏳ To Do |

**Subtask intent (one line each):**

- **01 — Installed client & cache:** typed `pluginsClient` over `GET
  /admin/api/plugins`, server-item → `InstalledPlugin` view-model mapping, cache
  key/TTL + cacheBus invalidation + hydrate/revalidate (pure TS → Vitest).
- **02 — Store-catalog API:** a domain `storeCatalogService` that wraps
  `core/store/client.ts` + internal `/admin/api/store/catalog*` routes
  (`store:browse`) + cached catalog client (routes = Bun; client = Vitest).
- **03 — Lifecycle API:** `pluginLifecycleService` wrapping `installService`
  (adds `uninstall` + per-plugin policy via `plugin_settings`) + write routes
  under `plugins:manage` + CSRF (plugin lifecycle = **Bun** mandatory).
- **04 — UI rewire:** delete the mock arrays; wire store + installed tabs and
  detail actions to the real clients with loading/empty/error + cacheBus refresh
  (Vitest ui-integration).
- **05 — Gates & docs:** cross-cutting security + perf Bun gates, then
  STORE_SPEC / CMS_API / ADMIN_CACHE doc sync and the closure gate matrix.

---

## Testing Requirements

Lanes per `_docs/TESTING_STRATEGY.md` (choose by dependency shape). Load DB env
before any DB-backed/runtime test: `set -a && source .env && set +a`.

- `bun --cwd core lint` and `bun --cwd core lint:types` (every leaf).
- **Bun lane (mandatory for runtime/route/lifecycle/security/perf):**
  - `bun test tests/integration/routes/pluginsRoutes.test.ts` (extended) and a new
    `tests/integration/routes/storeCatalog.test.ts`.
  - `bun test tests/integration/plugins/pluginLifecycle.test.ts`
    (install → upgrade → rollback → uninstall against a fixture store).
  - `bun test tests/security/codersoSecurityGate.test.ts` (RBAC + route-visibility
    buckets for the new routes) and a focused `tests/security/pluginStore.test.ts`.
  - `bun test tests/perf/*` for catalog-fetch caching if a perf budget is asserted.
- **Vitest lane (pure admin clients + UI):**
  - `tests/vitest/admin/pluginsClient.test.ts`, `storeCatalogClient.test.ts`.
  - `tests/vitest/ui-integration/plugin-store-rewire.test.tsx`.
  - Pre-existing store/plugin Vitest suites must stay green.
- State explicitly in each closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/CMS_API.md` — document new `/admin/api/store/catalog*` and the
  `/admin/api/plugins/*` lifecycle routes (shapes, codes, permissions, CSRF).
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — new cache keys/TTL
  (`plugins:installed:list`, `store:catalog:list`, `store:catalog:detail:<name>`),
  cached-client wrappers, cacheBus topics, and the Plugin Store route→files entry.
- `_docs/STORE_SPEC.md` — only if a consumer-facing field/affordance changes
  (a pure wiring should not change the store contract; note the admin-VM mapping).
- `_docs/CODERSO_PLUGIN_CONTRACT.md` / `_docs/SDK_SPEC.md` — cross-reference if the
  uninstall semantics or runtime teardown limitation needs to be documented.
- `_docs/_TASKS/README.md` (board) and `_docs/_CHANGELOG/` — synced by the
  orchestrator on status change / at closure (do NOT hand-edit here).

---

## Notes

- **Distinct "store" namespaces:** `core/store/*` = the **registry HTTP client**
  (external Store backend over `STORE_BASE_URL`). The new `core/services/store/*`
  domain service + `/admin/api/store/*` routes are the **admin-facing proxy** over
  it. Keep them separate; routes/clients never re-declare store schemas.
- **No `uninstall` exists yet** — `registry.ts` has `setPluginEnabled(name,false)`
  (disable) but no delete; `pluginManager.ts` has `loadPluginByName` but **no
  unload**. Subtask 03 adds a `deletePlugin` domain helper + runtime-dir removal
  and documents that full in-memory teardown of an already-loaded module may
  require a process restart in v1 (do not over-engineer hot-unload).
- **No new table:** per-plugin update policy persists in the existing
  `plugin_settings` table (`key = "updatePolicy"`). If a future change adds a
  dedicated column it MUST ship full migration artifacts (SQL + `meta/*_snapshot`
  + `meta/_journal.json`) — but this task avoids that (YAGNI).

---

## Closure Checklist

- [ ] All TASK-485-01..05 subtasks `✅ Done` / `⏭️ Superseded` / `❌ Cancelled`.
- [ ] `PluginStorePage.tsx` contains **zero** hardcoded catalog/installed arrays.
- [ ] Install/update/uninstall verified end-to-end through the signature+checksum
      pipeline by a Bun lifecycle test.
- [ ] CMS_API / ADMIN_CACHE* synced to the shipped routes + cache keys.
- [ ] Full gate matrix (lint, types, Bun route+lifecycle+security, Vitest
      clients+UI) recorded in the closeout with results.
