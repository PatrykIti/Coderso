# TASK-485-04: PluginStorePage & Details Rewire to Real Data
# FileName: TASK-485-04-PluginStorePage-Rewire-To-Real-Data.md

**Parent Task:** TASK-485
**Priority:** High
**Category:** Store / Plugins / Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-485-01 (installed client), TASK-485-02 (catalog client),
TASK-485-03 (lifecycle routes).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

`core/admin/ui/store/PluginStorePage.tsx` holds two hardcoded arrays
(`catalog: StoreCatalogItem[]`, `installedSeed: InstalledPlugin[]`) and five
handlers that only mutate local React state. This subtask deletes the mocks and
wires the page to the real clients: the **Store** tab browses the real catalog
(`storeCatalogClient`), the **Installed** tab lists real installed plugins
(`pluginsClient`), and the detail actions (install/update/uninstall/toggle/policy)
call the lifecycle routes and then invalidate the caches so both tabs refresh.

If the TASK-479-24 reskin has landed, this preserves that look and only swaps the
data source + wires the handlers; if not, it wires data against the current
primitives. Either way: **no fabricated metrics** (drop the mock-only
`securityScore`/`downloads`/`status` badges or feed them from real store fields
only when present).

This is admin-UI render/flow work → **Vitest (ui-integration) lane**.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-485-04-L01 | Store tab → real catalog (browse + loading/empty/error) | ⏳ To Do |
| TASK-485-04-L02 | Installed tab + detail actions → lifecycle clients | ⏳ To Do |
| TASK-485-04-L03 | UI integration tests (Vitest) | ⏳ To Do |

---

## Dependencies

- `core/admin/services/storeCatalogClient.ts` (subtask 02-L03).
- `core/admin/services/pluginsClient.ts` (subtask 01).
- Lifecycle routes (subtask 03-L02) — called via a small `pluginLifecycleClient`
  added in L02 (thin `apiRequest` wrappers with `{ withCsrf:true }`).
- Existing UI children: `StoreList`, `StoreDetail` (`core/admin/ui/store/*`),
  `PluginList`, `PluginDetail` (`core/admin/ui/plugins/*`), and the
  `InstalledPlugin` / `StoreCatalogItem` types.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest:** `tests/vitest/ui-integration/plugin-store-rewire.test.tsx`
  (catalog browse render, install→refresh, uninstall, toggle, policy, error/empty
  states). Pre-existing store/plugin Vitest suites stay green (update selectors
  only where a node genuinely moved; never weaken intent).
