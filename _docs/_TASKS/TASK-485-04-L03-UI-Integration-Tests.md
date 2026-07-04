# TASK-485-04-L03: UI integration tests (Vitest)
# FileName: TASK-485-04-L03-UI-Integration-Tests.md

**Parent Subtask:** TASK-485-04
**Priority:** High
**Category:** Store / Plugins / Tests
**Estimated Effort:** Small
**Dependencies:** TASK-485-04-L01, TASK-485-04-L02.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Vitest ui-integration coverage proving `PluginStorePage` renders from
  the real clients (mocked) and that the action flows + states behave — and that
  the mock arrays are truly gone.
- **Owning module(s) to create-or-extend:** **Create**
  `tests/vitest/ui-integration/plugin-store-rewire.test.tsx`. Keep the existing
  `tests/vitest/ui/plugin-store.test.tsx` green (update selectors only if a node
  genuinely moved).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/ADMIN_CACHE.md`.
- **Out of scope:** runtime/lifecycle (Bun — subtask 03), catalog API (subtask 02).

---

## Security Contract

Test-only. Asserts: no fabricated catalog rows; write actions route through the
CSRF-enabled clients; a `permission_denied` failure disables/blocks the action
rather than mutating local state.

---

## Implementation Pseudocode

```tsx
// tests/vitest/ui-integration/plugin-store-rewire.test.tsx
// Mock: @/services/storeCatalogClient, @/services/pluginsClient,
//       @/services/pluginLifecycleClient.

test("Store tab renders real catalog items from the client (no hardcoded SEO Boost/Analytics mock)");
test("Store tab shows empty state when catalog is []");
test("Store tab shows not-configured state on store_not_configured");
test("Installed tab lists items from fetchInstalledPlugins (not installedSeed)");
test("Install action calls pluginLifecycleClient.installPlugin and refreshes installed list");
test("Uninstall removes the plugin from the installed list after cache invalidation");
test("Enable toggle calls setPluginEnabled; policy change calls setPluginPolicy");
test("plugin_update_skipped surfaces the policy-blocked message");
test("module source no longer exports/contains a hardcoded catalog/installedSeed array"); // guard against regression
```

**Regression intent:** the page is now data-driven; a future edit that reintroduces
a mock array or drops the CSRF-write client should fail here.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest lane:**
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/plugin-store-rewire.test.tsx`
  and confirm `tests/vitest/ui/plugin-store.test.tsx` stays green.
- State in the closeout if any command was skipped or could not run.
