# TASK-485-01-L03: Client & cache tests (Vitest)
# FileName: TASK-485-01-L03-Client-And-Cache-Tests.md

**Parent Subtask:** TASK-485-01
**Priority:** High
**Category:** Store / Plugins / Tests
**Estimated Effort:** Small
**Dependencies:** TASK-485-01-L01, TASK-485-01-L02.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Lock the installed-plugins client + cache contract with a Vitest suite:
  view-model mapping truth table, cache hydrate/TTL/force, and cacheBus
  invalidation/subscription.
- **Owning module(s) to create-or-extend:** **Create**
  `tests/vitest/admin/pluginsClient.test.ts`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`, `_docs/ADMIN_CACHE.md`.
- **Out of scope:** runtime/route/lifecycle tests (Bun — subtasks 02/03/05), UI
  render tests (subtask 04).

---

## Implementation Pseudocode

```ts
// tests/vitest/admin/pluginsClient.test.ts
// - Mock apiRequest (vi.mock("@/services/apiClient")) to return a fixed
//   { items: InstalledPluginApiItem[] }.
// - Reset module-level cache between tests (clear localStorage + re-import or
//   call invalidateInstalledPlugins()).

describe("mapInstalledPlugin", () => {
  it("maps installed+enabled -> enabled, installed+!enabled -> disabled, error -> error");
  it("coerces missing permissions to []");
  it("does not fabricate lastUpdated/updateAvailable (passes ISO through, undefined update)");
});

describe("fetchInstalledPlugins", () => {
  it("calls apiRequest('/plugins') on cold cache and caches the mapped result");
  it("returns cached value without a second network call");
  it("refetches when { force:true }");
  it("rethrows ApiClientError from the route (no swallow)");
});

describe("cacheBus", () => {
  it("invalidateInstalledPlugins clears cache (next fetch hits network) and broadcasts one invalidate event for plugins:installed:list");
  it("subscribeInstalledPlugins fires only for the matching key");
});
```

**Regression intent:** these tests are the guard that the mock arrays are gone and
the page is fed by the real route mapping — keep assertions on the mapper truth
table strict (no fabricated metrics).

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest lane** (Bun-free, no DB):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/pluginsClient.test.ts`.
- State in the closeout if any command was skipped or could not run.
