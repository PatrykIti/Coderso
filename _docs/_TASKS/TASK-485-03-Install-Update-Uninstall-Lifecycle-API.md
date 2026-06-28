# TASK-485-03: Install / Update / Uninstall Lifecycle API
# FileName: TASK-485-03-Install-Update-Uninstall-Lifecycle-API.md

**Parent Task:** TASK-485
**Priority:** High
**Category:** Store / Plugins / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-485-02 (so the UI can install from a real catalog) is
recommended product-wise, but the lifecycle API is technically independent.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

The install pipeline exists (`installPluginFromStore`, `updatePluginFromStore`,
`applyRevocations`) but is **unreachable from the admin** — there is no
install/update/uninstall/enable/policy route, and the mock page's handlers only
mutate local React state. This subtask exposes the lifecycle through a thin
domain service + `plugins:manage` write routes:

- wraps the existing verified install/update (signature + checksum +
  compatibility) — never bypassing the pipeline;
- adds the **missing `uninstall`** (delete runtime dir + delete DB row via a new
  `deletePlugin` registry helper; `plugin_settings` rows cascade) and an
  enable/disable toggle (wraps `setPluginEnabled`);
- persists **per-plugin update policy** in the existing `plugin_settings` table
  (`key = "updatePolicy"`) — **no new table/migration**.

Plugin install/upgrade/rollback/uninstall is a **runtime-kernel** operation →
**Bun-lane tests are mandatory**.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-485-03-L01 | `pluginLifecycleService` (install/update/uninstall/toggle/policy) + `deletePlugin` | ⏳ To Do |
| TASK-485-03-L02 | Lifecycle write routes (`plugins:manage`, CSRF) | ⏳ To Do |
| TASK-485-03-L03 | Lifecycle + security Bun tests (install→upgrade→rollback→uninstall) | ⏳ To Do |

---

## Dependencies

- `core/plugins/installService.ts` (`installPluginFromStore`,
  `updatePluginFromStore`).
- `core/plugins/registry.ts` (`getPluginByName`, `listPlugins`,
  `setPluginEnabled`, `getPluginSetting`, `setPluginSetting`) — **add**
  `deletePlugin(name)`.
- `core/plugins/loader.ts` (`DEFAULT_PLUGINS_DIR`).
- `core/store/updater.ts` (`resolveUpdatePolicy`, `UpdatePolicy`).
- `core/server/routes/pluginsRoutes.ts` (extend) + `index.ts` (pass `validate`).
- `core/services/audit/auditService.ts` (`logAudit`).

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun lane (mandatory):**
  `tests/integration/plugins/pluginLifecycle.test.ts` (install → upgrade →
  rollback → uninstall against a fixture/local store),
  `tests/integration/routes/pluginsRoutes.test.ts` (extended: RBAC + CSRF +
  reject-unknown + error mapping), `tests/security/pluginStore.test.ts`.
- Load DB env first: `set -a && source .env && set +a`.
